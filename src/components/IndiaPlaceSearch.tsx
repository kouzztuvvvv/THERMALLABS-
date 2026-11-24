import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, MapPin, Compass } from 'lucide-react';
import {
  MapLayer,
  ResolvedIndiaSector,
  getLayerMetricValue,
} from '../utils/uhiModel';
import { GeocodePlace, useIndiaAutocomplete } from '../hooks/useIndiaPlaces';

interface IndiaPlaceSearchProps {
  sectors: ResolvedIndiaSector[];
  activeLayer: MapLayer;
  isDark: boolean;
  variant?: 'topbar' | 'sidebar';
  placeholder?: string;
  inputId?: string;
  onSelectSector: (sector: ResolvedIndiaSector) => void;
  onSelectGeocodePlace: (place: GeocodePlace) => void;
  onQueryChange?: (q: string) => void;
}

type SearchOption =
  | { kind: 'sector'; sector: ResolvedIndiaSector }
  | {
      kind: 'place';
      text: string;
      place: GeocodePlace;
    };

export function IndiaPlaceSearch({
  sectors,
  activeLayer,
  isDark,
  variant = 'sidebar',
  placeholder = 'Search Indian city, sector, or place...',
  inputId = 'india-place-search',
  onSelectSector,
  onSelectGeocodePlace,
  onQueryChange,
}: IndiaPlaceSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { suggestions, isLoading: isPlacesLoading, resetSession } =
    useIndiaAutocomplete(query);

  const matchingSectors = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return sectors.slice(0, 6);
    }
    return sectors
      .filter(
        (s) =>
          s.label.toLowerCase().includes(trimmed) ||
          s.city.toLowerCase().includes(trimmed) ||
          s.state.toLowerCase().includes(trimmed) ||
          s.tier.toLowerCase().includes(trimmed) ||
          s.subRegion.toLowerCase().includes(trimmed) ||
          s.code.toLowerCase().includes(trimmed) ||
          s.category.toLowerCase().includes(trimmed) ||
          s.displayName.toLowerCase().includes(trimmed)
      )
      .slice(0, 6);
  }, [sectors, query]);

  const combinedOptions: SearchOption[] = useMemo(() => {
    const items: SearchOption[] = matchingSectors.map((sector) => ({
      kind: 'sector',
      sector,
    }));

    const seenLabels = new Set(
      matchingSectors.map((s) => `${s.label.toLowerCase()} ${s.city.toLowerCase()}`)
    );

    if (query.trim().length >= 2) {
      for (const s of suggestions) {
        const text = [s.name, s.admin2, s.admin1].filter(Boolean).join(', ');
        if (!text) continue;
        const lower = text.toLowerCase();
        const duplicate = Array.from(seenLabels).some((existing) =>
          lower.includes(existing.split(' ')[0])
        );
        if (!duplicate || items.length < 3) {
          items.push({ kind: 'place', text, place: s });
        }
      }
    }

    return items;
  }, [matchingSectors, suggestions, query]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [query]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleInputChange = (val: string) => {
    setQuery(val);
    setIsOpen(true);
    onQueryChange?.(val);
  };

  const handlePickSector = (sector: ResolvedIndiaSector) => {
    onSelectSector(sector);
    setQuery('');
    onQueryChange?.('');
    setIsOpen(false);
    resetSession();
  };

  const handlePickPlace = (place: GeocodePlace) => {
    setQuery('');
    onQueryChange?.('');
    setIsOpen(false);
    resetSession();
    onSelectGeocodePlace(place);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) =>
        combinedOptions.length === 0 ? -1 : (prev + 1) % combinedOptions.length
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) =>
        combinedOptions.length === 0
          ? -1
          : (prev - 1 + combinedOptions.length) % combinedOptions.length
      );
    } else if (e.key === 'Enter' && activeIndex >= 0 && combinedOptions[activeIndex]) {
      e.preventDefault();
      const chosen = combinedOptions[activeIndex];
      if (chosen.kind === 'sector') {
        handlePickSector(chosen.sector);
      } else {
        handlePickPlace(chosen.place);
      }
    }
  };

  const isTopbar = variant === 'topbar';

  const inputClass = isTopbar
    ? isDark
      ? 'w-full pl-8 pr-7 py-1 text-xs bg-[#141414] border border-[#facc15]/30 rounded-[8px] text-[#fef9c3] placeholder:text-[#d4c46a]/70 focus:outline-none focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15]/25 transition-colors'
      : 'w-full pl-8 pr-7 py-1 text-xs bg-white/12 border border-white/18 rounded-[8px] text-white placeholder:text-white/60 focus:outline-none focus:bg-white/18 focus:border-[#2997ff] focus:ring-2 focus:ring-[#0071e3]/35 transition-colors'
    : isDark
      ? 'w-full pl-8 pr-8 py-1.5 text-xs bg-[#141414] border border-[#facc15]/30 rounded-[8px] text-[#fef9c3] placeholder:text-[#d4c46a]/70 focus:outline-none focus:border-[#facc15] focus:ring-2 focus:ring-[#facc15]/25 transition-colors'
      : 'w-full pl-8 pr-8 py-1.5 text-xs bg-white border border-[#d2d2d7] rounded-[8px] text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 transition-colors';

  const dropdownClass = isDark
    ? 'bg-[#0a0a0a] border border-[#facc15]/35 text-[#fef9c3] shadow-[0_12px_32px_rgba(0,0,0,0.85)]'
    : 'bg-white border border-[#d2d2d7] text-[#1d1d1f] shadow-[0_12px_32px_rgba(0,0,0,0.14)]';

  const showDropdown =
    isOpen &&
    (combinedOptions.length > 0 || isPlacesLoading || query.trim().length > 0);

  return (
    <div ref={containerRef} className="relative w-full">
      <label htmlFor={inputId} className="sr-only">
        {placeholder}
      </label>
      <Search
        className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none ${
          isTopbar
            ? isDark
              ? 'text-[#facc15]'
              : 'text-white/65'
            : isDark
              ? 'text-[#facc15]'
              : 'text-[#86868b]'
        }`}
        aria-hidden="true"
      />
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-autocomplete="list"
        aria-controls={`${inputId}-listbox`}
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={inputClass}
      />
      {query && (
        <button
          type="button"
          onClick={() => {
            setQuery('');
            onQueryChange?.('');
            resetSession();
          }}
          aria-label="Clear search query"
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-0.5 cursor-pointer ${
            isTopbar
              ? isDark
                ? 'text-[#d4c46a] hover:text-[#facc15]'
                : 'text-white/65 hover:text-white'
              : isDark
                ? 'text-[#d4c46a] hover:text-[#facc15]'
                : 'text-[#86868b] hover:text-[#1d1d1f]'
          }`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {showDropdown && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 rounded-[11px] z-50 max-h-72 overflow-y-auto ${dropdownClass}`}
        >
          {isPlacesLoading && (
            <div
              className={`px-3 py-1.5 text-[11px] border-b ${
                isDark
                  ? 'border-[#facc15]/20 text-[#d4c46a]'
                  : 'border-[#d2d2d7]/60 text-[#86868b]'
              }`}
            >
              Searching places across India...
            </div>
          )}

          {combinedOptions.length === 0 && !isPlacesLoading ? (
            <div
              className={`px-3 py-3 text-xs ${
                isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
              }`}
            >
              No matching places found for &ldquo;{query}&rdquo;. Try an Indian city or neighborhood.
            </div>
          ) : (
            <ul
              id={`${inputId}-listbox`}
              role="listbox"
              aria-label="Suggested locations across India"
              className={`divide-y ${
                isDark ? 'divide-[#facc15]/15' : 'divide-[#d2d2d7]/50'
              }`}
            >
              {combinedOptions.map((option, idx) => {
                const isActive = idx === activeIndex;
                if (option.kind === 'sector') {
                  const metricLayer =
                    activeLayer === 'aqi' ? 'temperature' : activeLayer;
                  const metric = getLayerMetricValue(option.sector, metricLayer);
                  return (
                    <li key={`sector-${option.sector.id}`}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handlePickSector(option.sector)}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                          isActive
                            ? isDark
                              ? 'bg-[#facc15]/15'
                              : 'bg-[#0071e3]/10'
                            : isDark
                              ? 'hover:bg-[#141414]'
                              : 'hover:bg-[#f5f5f7]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isDark ? 'text-[#facc15]' : 'text-[#0071e3]'
                            }`}
                            aria-hidden="true"
                          />
                          <div className="min-w-0">
                            <div
                              className={`font-medium truncate ${
                                isDark ? 'text-[#fef9c3]' : 'text-[#1d1d1f]'
                              }`}
                            >
                              {option.sector.label}
                            </div>
                            <div
                              className={`text-[11px] truncate ${
                                isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                              }`}
                            >
                              {option.sector.city}, {option.sector.state} ·{' '}
                              {option.sector.tier}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-[11px] font-semibold tabular-nums shrink-0 ${
                            isDark ? 'text-[#facc15]' : 'text-[#1d1d1f]'
                          }`}
                        >
                          {metric.shortFormatted}
                        </span>
                      </button>
                    </li>
                  );
                }

                return (
                  <li key={`place-${option.place.id}-${idx}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handlePickPlace(option.place)}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2 text-xs transition-colors cursor-pointer ${
                        isActive
                          ? isDark
                            ? 'bg-[#facc15]/15'
                            : 'bg-[#0071e3]/10'
                          : isDark
                            ? 'hover:bg-[#141414]'
                            : 'hover:bg-[#f5f5f7]'
                      }`}
                    >
                      <Compass
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                        }`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div
                          className={`truncate ${
                            isDark ? 'text-[#fef9c3]' : 'text-[#1d1d1f]'
                          }`}
                        >
                          {option.text}
                        </div>
                        <div
                          className={`text-[10px] ${
                            isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                          }`}
                        >
                          Open-Meteo Geocoding · Pin on Leaflet map
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
