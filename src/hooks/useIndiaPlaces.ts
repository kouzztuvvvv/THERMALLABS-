import { useCallback, useEffect, useMemo, useState } from 'react';
import { INDIA_UHI_ZONES } from '../data/indiaUhiZones';
import { ResolvedIndiaSector, buildHexFootprint } from '../utils/uhiModel';

export interface GeocodePlace {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  admin2?: string;
  country?: string;
}

export function useIndiaPlaces() {
  const sectors: ResolvedIndiaSector[] = useMemo(() => {
    return INDIA_UHI_ZONES.map((zone) => {
      const location = { lat: zone.lat, lng: zone.lng };
      return {
        ...zone,
        placeId: zone.id,
        displayName: zone.label,
        formattedAddress:
          zone.formattedAddress || `${zone.city}, ${zone.state}, India`,
        location,
        viewport: null,
        footprintPolygon: buildHexFootprint(location, null),
      };
    });
  }, []);

  return {
    sectors,
    resolvedCount: sectors.length,
    totalCount: sectors.length,
    isResolving: false,
    resolveError: null as string | null,
  };
}

export function useIndiaAutocomplete(inputString: string) {
  const [suggestions, setSuggestions] = useState<GeocodePlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const trimmed = inputString.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);

    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/geocode?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        const json = await res.json().catch(() => null);
        if (!controller.signal.aborted) {
          setSuggestions(Array.isArray(json?.results) ? json.results : []);
        }
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [inputString]);

  const resetSession = useCallback(() => {
    setSuggestions([]);
  }, []);

  return { suggestions, isLoading, resetSession };
}
