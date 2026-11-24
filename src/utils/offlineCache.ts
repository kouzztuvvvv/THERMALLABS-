import {
  LiveEnvironmentData,
  MapLayer,
  ResolvedIndiaSector,
} from './uhiModel';

export const OFFLINE_STORAGE_KEYS = {
  ENV_CACHE: 'uhi_india_openmeteo_ls_v1',
  LAST_VIEWED: 'uhi_india_last_viewed_v1',
} as const;

export const ENV_CACHE_TTL_MS = 15 * 60 * 1000;

export interface PersistedLastViewedState {
  selectedSectorId: string;
  activeLayer: MapLayer;
  customPins: ResolvedIndiaSector[];
  lastSectorSnapshot?: ResolvedIndiaSector;
  savedAt: string;
}

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

function getDefaultStorage(): StorageLike | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore storage access restrictions
  }
  return null;
}

export function loadEnvironmentCache(
  options?: { ignoreExpiry?: boolean; nowMs?: number },
  storage: StorageLike | null = getDefaultStorage()
): Record<string, LiveEnvironmentData> {
  if (!storage) return {};
  try {
    const raw = storage.getItem(OFFLINE_STORAGE_KEYS.ENV_CACHE);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LiveEnvironmentData>;
    if (!parsed || typeof parsed !== 'object') return {};

    const ignoreExpiry = Boolean(options?.ignoreExpiry);
    const now = options?.nowMs ?? Date.now();
    const result: Record<string, LiveEnvironmentData> = {};

    for (const [id, entry] of Object.entries(parsed)) {
      if (!entry || typeof entry !== 'object') continue;
      if (ignoreExpiry) {
        result[id] = entry;
        continue;
      }
      const ts = Date.parse(entry.fetchedAt ?? '');
      if (Number.isFinite(ts) && now - ts < ENV_CACHE_TTL_MS) {
        result[id] = entry;
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function saveEnvironmentCache(
  map: Record<string, LiveEnvironmentData>,
  storage: StorageLike | null = getDefaultStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(OFFLINE_STORAGE_KEYS.ENV_CACHE, JSON.stringify(map));
  } catch {
    // Ignore localStorage quota exceeded errors
  }
}

export function loadLastViewedState(
  storage: StorageLike | null = getDefaultStorage()
): PersistedLastViewedState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(OFFLINE_STORAGE_KEYS.LAST_VIEWED);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedLastViewedState;
    if (!parsed || typeof parsed.selectedSectorId !== 'string') return null;
    return {
      selectedSectorId: parsed.selectedSectorId,
      activeLayer: parsed.activeLayer ?? 'temperature',
      customPins: Array.isArray(parsed.customPins) ? parsed.customPins : [],
      lastSectorSnapshot: parsed.lastSectorSnapshot,
      savedAt: parsed.savedAt || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveLastViewedState(
  state: PersistedLastViewedState,
  storage: StorageLike | null = getDefaultStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(OFFLINE_STORAGE_KEYS.LAST_VIEWED, JSON.stringify(state));
  } catch {
    // Ignore localStorage quota errors
  }
}
