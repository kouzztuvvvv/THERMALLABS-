import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LatLngLiteral,
  LiveEnvironmentData,
  ResolvedIndiaSector,
} from '../utils/uhiModel';
import { buildFallbackEnvironment } from '../utils/openMeteo';
import {
  loadEnvironmentCache,
  saveEnvironmentCache,
} from '../utils/offlineCache';

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export function useBatchEnvironment(sectors: ResolvedIndiaSector[]) {
  const isOnline = useOnlineStatus();
  const [envBySectorId, setEnvBySectorId] = useState<
    Record<string, LiveEnvironmentData>
  >(() =>
    loadEnvironmentCache({
      ignoreExpiry: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    })
  );
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const envMapRef = useRef(envBySectorId);
  envMapRef.current = envBySectorId;
  const inFlightIdsRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isOnline) {
      // Offline: hydrate any stale-but-present LocalStorage telemetry only if missing from state
      const cachedOffline = loadEnvironmentCache({ ignoreExpiry: true });
      const missingKeys = Object.keys(cachedOffline).filter(
        (k) => !envMapRef.current[k]
      );
      if (missingKeys.length > 0) {
        setEnvBySectorId((prev) => ({ ...cachedOffline, ...prev }));
      }
      return;
    }

    const missing = sectors.filter(
      (s) => !envMapRef.current[s.id] && !inFlightIdsRef.current.has(s.id)
    );

    if (missing.length === 0) return;

    for (const s of missing) {
      inFlightIdsRef.current.add(s.id);
    }

    setIsSyncingAll(true);

    const payloadPoints = missing.map((s) => ({
      id: s.id,
      lat: s.location.lat,
      lng: s.location.lng,
    }));

    fetch('/api/environment/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: payloadPoints }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (json?.results && typeof json.results === 'object' && isMountedRef.current) {
          setEnvBySectorId((prev) => {
            const next = {
              ...prev,
              ...(json.results as Record<string, LiveEnvironmentData>),
            };
            saveEnvironmentCache(next);
            return next;
          });
        } else if (isMountedRef.current) {
          throw new Error('Empty batch response');
        }
      })
      .catch(() => {
        if (!isMountedRef.current) return;
        const staleOffline = loadEnvironmentCache({ ignoreExpiry: true });
        const fallbackBatch: Record<string, LiveEnvironmentData> = {};
        for (const s of missing) {
          fallbackBatch[s.id] =
            staleOffline[s.id] ??
            buildFallbackEnvironment({
              id: s.id,
              lat: s.location.lat,
              lng: s.location.lng,
              subRegion: s.subRegion,
              tier: s.tier,
              avgSurfaceTempC: s.avgSurfaceTempC,
              greenCanopyPct: s.greenCanopyPct,
            });
        }
        setEnvBySectorId((prev) => {
          const next = { ...prev, ...fallbackBatch };
          saveEnvironmentCache(next);
          return next;
        });
      })
      .finally(() => {
        for (const s of missing) {
          inFlightIdsRef.current.delete(s.id);
        }
        if (isMountedRef.current) {
          setIsSyncingAll(false);
        }
      });
  }, [sectors, isOnline]);

  const upsertEnvironment = useCallback((id: string, env: LiveEnvironmentData) => {
    setEnvBySectorId((prev) => {
      const next = { ...prev, [id]: env };
      saveEnvironmentCache(next);
      return next;
    });
  }, []);

  return { envBySectorId, isSyncingAll, isOnline, upsertEnvironment };
}

export function useLiveEnvironment(
  sectorId: string,
  location: LatLngLiteral | null,
  batchedEnv?: LiveEnvironmentData | null,
  onResolved?: (id: string, env: LiveEnvironmentData) => void
) {
  const cacheRef = useRef<Record<string, LiveEnvironmentData>>({});
  const [data, setData] = useState<LiveEnvironmentData | null>(() => {
    if (batchedEnv) return batchedEnv;
    const offlineCache = loadEnvironmentCache({ ignoreExpiry: true });
    return offlineCache[sectorId] ?? null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (batchedEnv) {
      setData(batchedEnv);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (!location) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const cacheKey = `${sectorId}:${location.lat.toFixed(3)},${location.lng.toFixed(3)}`;
    const existing = cacheRef.current[cacheKey];
    if (existing) {
      setData(existing);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      const offlineCache = loadEnvironmentCache({ ignoreExpiry: true });
      const offlinePayload =
        offlineCache[sectorId] ??
        buildFallbackEnvironment({
          id: sectorId,
          lat: location.lat,
          lng: location.lng,
        });
      cacheRef.current[cacheKey] = offlinePayload;
      setData(offlinePayload);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(
      `/api/environment?id=${encodeURIComponent(sectorId)}&lat=${location.lat}&lng=${location.lng}`,
      { signal: controller.signal }
    )
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || !json) {
          throw new Error(
            json?.error || `Open-Meteo telemetry unavailable (${res.status}).`
          );
        }
        const envPayload = json as LiveEnvironmentData;
        cacheRef.current[cacheKey] = envPayload;
        setData(envPayload);
        onResolved?.(sectorId, envPayload);
      })
      .catch((err) => {
        if ((err as Error).name === 'AbortError') return;
        const offlineCache = loadEnvironmentCache({ ignoreExpiry: true });
        const fallbackPayload =
          offlineCache[sectorId] ??
          buildFallbackEnvironment({
            id: sectorId,
            lat: location.lat,
            lng: location.lng,
          });
        cacheRef.current[cacheKey] = fallbackPayload;
        setData(fallbackPayload);
        onResolved?.(sectorId, fallbackPayload);
        setError(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [sectorId, location?.lat, location?.lng, batchedEnv, onResolved]);

  return { data: batchedEnv ?? data, isLoading, error };
}
