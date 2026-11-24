import { PanelLeftClose, MapPin, CloudSun, Wind, ArrowUpDown } from 'lucide-react';
import {
  IndiaRegion,
  LiveEnvironmentData,
  MapLayer,
  ResolvedIndiaSector,
  SettlementTier,
  SortOption,
  ZoneCategory,
  computeVulnerabilityIndex,
  getLayerMetricValue,
  resolveIndianAqi,
  resolveUsAqi,
} from '../utils/uhiModel';
import { GeocodePlace } from '../hooks/useIndiaPlaces';
import { IndiaPlaceSearch } from './IndiaPlaceSearch';

interface NeighborhoodSidebarProps {
  isOpen: boolean;
  isDark: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  categoryFilter: ZoneCategory | 'All';
  onCategoryChange: (cat: ZoneCategory | 'All') => void;
  tierFilter: SettlementTier | 'All';
  onTierChange: (tier: SettlementTier | 'All') => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  regionFilter: IndiaRegion;
  onRegionChange: (region: IndiaRegion) => void;
  allSectors: ResolvedIndiaSector[];
  filteredSectors: ResolvedIndiaSector[];
  selectedSector: ResolvedIndiaSector;
  hoveredSector: ResolvedIndiaSector | null;
  activeLayer: MapLayer;
  envBySectorId: Record<string, LiveEnvironmentData | undefined>;
  liveEnvironment: LiveEnvironmentData | null;
  isLoadingEnv: boolean;
  isSyncingAllEnv: boolean;
  envError: string | null;
  onSelectSector: (sector: ResolvedIndiaSector) => void;
  onHoverSector: (sector: ResolvedIndiaSector | null) => void;
  onSelectGeocodePlace: (place: GeocodePlace) => void;
}

const CATEGORIES: Array<ZoneCategory | 'All'> = [
  'All',
  'Parkland & Watershed',
  'Residential',
  'Commercial & Civic',
  'Industrial & Transit',
  'Institutional & Tech',
];

const TIERS: Array<SettlementTier | 'All'> = [
  'All',
  'Tier 1',
  'Tier 2',
  'Tier 3',
  'Rural',
];

const SORT_OPTIONS: Array<{ value: SortOption; label: string }> = [
  { value: 'default', label: 'Sort: Study Region Order' },
  { value: 'aqi-desc', label: 'AQI (NAQI): High → Low (Worst First)' },
  { value: 'aqi-asc', label: 'AQI (NAQI): Low → High (Cleanest First)' },
  { value: 'temp-desc', label: 'Surface Temp (LST): High → Low' },
  { value: 'temp-asc', label: 'Surface Temp (LST): Low → High' },
  { value: 'air-temp-desc', label: 'Live Air Temp: High → Low' },
  { value: 'air-temp-asc', label: 'Live Air Temp: Low → High' },
];

export function NeighborhoodSidebar({
  isOpen,
  isDark,
  onClose,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  tierFilter,
  onTierChange,
  sortOption,
  onSortChange,
  regionFilter,
  onRegionChange,
  allSectors,
  filteredSectors,
  selectedSector,
  hoveredSector,
  activeLayer,
  envBySectorId,
  liveEnvironment,
  isLoadingEnv,
  isSyncingAllEnv,
  envError,
  onSelectSector,
  onHoverSector,
  onSelectGeocodePlace,
}: NeighborhoodSidebarProps) {
  if (!isOpen) return null;

  const displaySector = hoveredSector ?? selectedSector;
  const isHoverPreview =
    hoveredSector !== null && hoveredSector.id !== selectedSector.id;
  const vulnerability = computeVulnerabilityIndex(displaySector);

  const activeEnv =
    (isHoverPreview ? envBySectorId[displaySector.id] : liveEnvironment) ??
    envBySectorId[displaySector.id] ??
    null;

  const indianAqi = resolveIndianAqi(activeEnv);
  const usAqi = resolveUsAqi(activeEnv);
  const pm25 = activeEnv?.airQuality?.pollutants?.find((p) => p.code === 'pm25');
  const pm10 = activeEnv?.airQuality?.pollutants?.find((p) => p.code === 'pm10');

  const vulnTierClass = isDark
    ? 'text-[#facc15]'
    : vulnerability.tier === 'Low'
      ? 'text-sky-700'
      : vulnerability.tier === 'Moderate'
        ? 'text-amber-700'
        : vulnerability.tier === 'Elevated'
          ? 'text-orange-700'
          : 'text-red-800';

  const isSortingByAqi = sortOption === 'aqi-desc' || sortOption === 'aqi-asc';
  const isSortingByAirTemp =
    sortOption === 'air-temp-desc' || sortOption === 'air-temp-asc';
  const isSortingBySurfaceTemp =
    sortOption === 'temp-desc' || sortOption === 'temp-asc';

  const selectClass = `w-full px-2.5 py-1.5 text-xs border rounded-[8px] focus:outline-none focus:ring-2 transition-colors ${
    isDark
      ? 'bg-[#141414] border-[#facc15]/30 text-[#fef9c3] focus:border-[#facc15] focus:ring-[#facc15]/25'
      : 'bg-[#f5f5f7] border-[#d2d2d7] text-[#1d1d1f] focus:bg-white focus:border-[#0071e3] focus:ring-[#0071e3]/20'
  }`;

  return (
    <aside
      aria-label="India Microclimate Inspector"
      className={`w-full border-r lg:border-r-0 lg:border-b flex flex-col shrink-0 h-full lg:h-auto overflow-hidden lg:overflow-visible z-20 transition-colors ${
        isDark
          ? 'bg-[#0a0a0a] border-[#facc15]/25 text-[#fef9c3]'
          : 'bg-white border-[#d2d2d7] text-[#1d1d1f]'
      }`}
    >
      {/* Sidebar Header, Unified Search, Tier & Sort Controls */}
      <div
        className={`p-4 border-b space-y-2.5 shrink-0 ${
          isDark ? 'border-[#facc15]/20' : 'border-[#d2d2d7]/80'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1
              className={`text-sm font-semibold tracking-tight ${
                isDark ? 'text-[#facc15]' : 'text-[#1d1d1f]'
              }`}
            >
              India Microclimate Inspector
            </h1>
            <p
              className={`text-xs mt-0.5 ${
                isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
              }`}
            >
              Tier 1 · Tier 2 · Tier 3 · Rural India ({allSectors.length} Zones)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Collapse neighborhood sidebar"
            className={`p-1.5 rounded-[8px] transition-colors cursor-pointer ${
              isDark
                ? 'text-[#d4c46a] hover:text-[#facc15] hover:bg-[#141414]'
                : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
            }`}
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Unified Inspector Search with Live India Study & Google Places Suggestions */}
        <IndiaPlaceSearch
          sectors={allSectors}
          activeLayer={activeLayer}
          isDark={isDark}
          variant="sidebar"
          inputId="inspector-place-search"
          placeholder="Search city, tier, sector, or pin any India place..."
          onSelectSector={onSelectSector}
          onSelectGeocodePlace={onSelectGeocodePlace}
          onQueryChange={onSearchChange}
        />

        {/* Settlement Tier + Land-Use Classification Filters */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="tier-filter" className="sr-only">
              Filter by city tier or rural zone
            </label>
            <select
              id="tier-filter"
              value={tierFilter}
              onChange={(e) =>
                onTierChange(e.target.value as SettlementTier | 'All')
              }
              className={selectClass}
            >
              {TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier === 'All'
                    ? 'All Tiers & Rural'
                    : tier === 'Rural'
                      ? 'Rural / Eco-Zones'
                      : `${tier} Cities`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="zone-category-filter" className="sr-only">
              Filter by land-use zone
            </label>
            <select
              id="zone-category-filter"
              value={categoryFilter}
              onChange={(e) =>
                onCategoryChange(e.target.value as ZoneCategory | 'All')
              }
              className={selectClass}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Land-Use Types' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Differentiate Places by AQI or Temperature (High→Low / Low→High) */}
        <div className="flex items-center gap-2">
          <ArrowUpDown
            className={`w-3.5 h-3.5 shrink-0 ${
              isDark ? 'text-[#facc15]' : 'text-[#0071e3]'
            }`}
            aria-hidden="true"
          />
          <label htmlFor="sector-sort-select" className="sr-only">
            Sort places by AQI level or temperature
          </label>
          <select
            id="sector-sort-select"
            value={sortOption}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className={selectClass}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Sector Satellite + Live Open-Meteo Telemetry */}
      <div
        className={`p-3.5 border-b shrink-0 overflow-y-auto max-h-[430px] lg:max-h-none lg:overflow-visible ${
          isDark
            ? 'border-[#facc15]/20 bg-[#141414]/80'
            : 'border-[#d2d2d7]/80 bg-[#f5f5f7]/75'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div
              className={`flex items-center gap-1.5 text-[11px] font-mono ${
                isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
              }`}
            >
              <span
                className={`font-medium ${
                  isDark ? 'text-[#facc15]' : 'text-[#0071e3]'
                }`}
              >
                {displaySector.code}
              </span>
              <span aria-hidden="true">·</span>
              <span>{displaySector.tier}</span>
              <span aria-hidden="true">·</span>
              <span className="truncate">{displaySector.category}</span>
              {isHoverPreview && (
                <>
                  <span aria-hidden="true">·</span>
                  <span
                    className={`font-medium ${
                      isDark ? 'text-[#facc15]' : 'text-[#1d1d1f]'
                    }`}
                  >
                    Preview
                  </span>
                </>
              )}
            </div>
            <h2
              className={`text-base font-semibold mt-0.5 truncate ${
                isDark ? 'text-[#fef9c3]' : 'text-[#1d1d1f]'
              }`}
            >
              {displaySector.displayName}
            </h2>
            <p
              className={`text-[11px] truncate mt-0.5 ${
                isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
              }`}
            >
              {displaySector.formattedAddress}
            </p>
          </div>
          {displaySector.location && (
            <span
              className={`text-[11px] font-mono tabular-nums shrink-0 pt-0.5 ${
                isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
              }`}
            >
              {displaySector.location.lat.toFixed(2)}°N
            </span>
          )}
        </div>

        {/* 4 Core Satellite UHI Metrics */}
        <dl
          className={`grid grid-cols-2 gap-x-4 gap-y-2.5 mt-3 pt-3 border-t ${
            isDark ? 'border-[#facc15]/20' : 'border-[#d2d2d7]/70'
          }`}
        >
          <div>
            <dt
              className={`text-[11px] font-medium ${
                isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
              }`}
            >
              Avg Surface Temp
            </dt>
            <dd className="mt-0.5 flex items-baseline gap-1">
              <span
                className={`text-lg font-semibold font-mono tabular-nums ${
                  isDark ? 'text-[#fef9c3]' : 'text-[#1d1d1f]'
                }`}
              >
                {displaySector.avgSurfaceTempC.toFixed(1)}
              </span>
              <span
                className={`text-xs font-mono ${
                  isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                }`}
              >
                °C
              </span>
              <span
                className={`text-[11px] font-mono tabular-nums ml-auto ${
                  isDark
                    ? 'text-[#facc15]'
                    : displaySector.tempAnomalyC > 0
                      ? 'text-red-700'
                      : 'text-sky-700'
                }`}
              >
                {displaySector.tempAnomalyC > 0 ? '+' : ''}
                {displaySector.tempAnomalyC.toFixed(1)}°
              </span>
            </dd>
          </div>

          <div>
            <dt
              className={`text-[11px] font-medium ${
                isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
              }`}
            >
              Green Space %
            </dt>
            <dd className="mt-0.5 flex items-baseline gap-1">
              <span
                className={`text-lg font-semibold font-mono tabular-nums ${
                  isDark ? 'text-[#fef9c3]' : 'text-[#1d1d1f]'
                }`}
              >
                {(displaySector.greenCanopyPct + displaySector.waterBodyPct).toFixed(1)}
              </span>
              <span
                className={`text-xs font-mono ${
                  isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                }`}
              >
                %
              </span>
              <span
                className={`text-[11px] font-mono tabular-nums ml-auto ${
                  isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                }`}
              >
                NDVI {displaySector.ndviMean.toFixed(2)}
              </span>
            </dd>
          </div>

          <div>
            <dt
              className={`text-[11px] font-medium ${
                isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
              }`}
            >
              Impervious Ratio
            </dt>
            <dd className="mt-0.5 flex items-baseline gap-1">
              <span
                className={`text-lg font-semibold font-mono tabular-nums ${
                  isDark ? 'text-[#fef9c3]' : 'text-[#1d1d1f]'
                }`}
              >
                {displaySector.imperviousPct.toFixed(1)}
              </span>
              <span
                className={`text-xs font-mono ${
                  isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                }`}
              >
                %
              </span>
              <span
                className={`text-[11px] font-mono tabular-nums ml-auto ${
                  isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                }`}
              >
                α {displaySector.albedoIndex.toFixed(2)}
              </span>
            </dd>
          </div>

          <div>
            <dt
              className={`text-[11px] font-medium ${
                isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
              }`}
            >
              Vulnerability Index
            </dt>
            <dd className="mt-0.5 flex items-baseline gap-1.5">
              <span
                className={`text-lg font-semibold font-mono tabular-nums ${
                  isDark ? 'text-[#fef9c3]' : 'text-[#1d1d1f]'
                }`}
              >
                {vulnerability.score}
              </span>
              <span
                className={`text-xs font-mono ${
                  isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                }`}
              >
                /100
              </span>
              <span className={`text-[11px] font-semibold ml-auto ${vulnTierClass}`}>
                {vulnerability.tier}
              </span>
            </dd>
          </div>
        </dl>

        {/* Live Open-Meteo Microclimate & Air Quality Status Widget */}
        <div
          className={`mt-3 pt-2.5 border-t space-y-1.5 ${
            isDark ? 'border-[#facc15]/20' : 'border-[#d2d2d7]/70'
          }`}
        >
          <div
            className={`flex items-center justify-between text-[11px] font-medium ${
              isDark ? 'text-[#fef9c3]' : 'text-[#1d1d1f]'
            }`}
          >
            <span className="inline-flex items-center gap-1.5">
              <CloudSun
                className={`w-3.5 h-3.5 ${
                  isDark ? 'text-[#facc15]' : 'text-[#0071e3]'
                }`}
                aria-hidden="true"
              />
              <span>Microclimate &amp; Air Quality Status</span>
            </span>
            {(isLoadingEnv || (!activeEnv && isSyncingAllEnv)) ? (
              <span
                className={`font-mono text-[10px] ${
                  isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                }`}
              >
                Fetching...
              </span>
            ) : (
              <span
                className={`font-mono text-[10px] ${
                  isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                }`}
              >
                Open-Meteo
              </span>
            )}
          </div>

          {!isLoadingEnv && envError && !activeEnv && (
            <p className={`text-[11px] ${isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'}`}>
              {envError}
            </p>
          )}

          {activeEnv && (
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-mono tabular-nums">
              <div className="whitespace-nowrap">
                Air:{' '}
                <span className="font-semibold">
                  {activeEnv.weather.available &&
                  activeEnv.weather.temperatureC != null
                    ? `${activeEnv.weather.temperatureC.toFixed(1)}°C`
                    : 'Unavailable'}
                </span>
                {activeEnv.weather.feelsLikeC != null && (
                  <span className={isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'}>
                    {' '}
                    · Feels {activeEnv.weather.feelsLikeC.toFixed(1)}°
                  </span>
                )}
              </div>
              <div className="text-right whitespace-nowrap">
                {activeEnv.weather.relativeHumidity != null
                  ? `RH ${activeEnv.weather.relativeHumidity}%`
                  : activeEnv.weather.conditionText ?? ''}
                {activeEnv.weather.windSpeedKmh != null && (
                  <span
                    className={`inline-flex items-center gap-1 ml-2 ${
                      isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                    }`}
                  >
                    <Wind className="w-3 h-3" aria-hidden="true" />
                    {Math.round(activeEnv.weather.windSpeedKmh)} km/h
                  </span>
                )}
              </div>
              <div className="col-span-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                <span>
                  NAQI:{' '}
                  <span className="font-semibold">
                    {indianAqi
                      ? `${indianAqi.aqi} (${indianAqi.category.replace(/\s*air quality$/i, '')})`
                      : 'Unavailable'}
                  </span>
                  {usAqi != null && (
                    <span className={isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'}>
                      {' '}
                      · US {usAqi}
                    </span>
                  )}
                </span>
                {pm25?.concentration?.value != null && (
                  <span
                    className={`shrink-0 ${
                      isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                    }`}
                  >
                    PM2.5 {pm25.concentration.value.toFixed(1)}
                    {pm10?.concentration?.value != null
                      ? ` · PM10 ${pm10.concentration.value.toFixed(0)}`
                      : ''}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <p
          className={`mt-2.5 pt-2 border-t text-xs leading-relaxed ${
            isDark
              ? 'border-[#facc15]/15 text-[#d4c46a]'
              : 'border-[#d2d2d7]/60 text-[#86868b]'
          }`}
        >
          {displaySector.coolingMitigationNote}
        </p>
      </div>

      {/* Scrollable India Sector Directory */}
      <div className="flex-1 overflow-y-auto lg:flex-none lg:max-h-[240px]">
        <div
          className={`px-4 py-2 border-b flex items-center justify-between text-[11px] font-medium sticky top-0 z-10 ${
            isDark
              ? 'bg-[#141414] border-[#facc15]/20 text-[#d4c46a]'
              : 'bg-[#f5f5f7] border-[#d2d2d7]/70 text-[#86868b]'
          }`}
        >
          <span>
            {regionFilter === 'All India' ? 'India Sectors' : regionFilter} (
            {filteredSectors.length})
            {isSyncingAllEnv ? ' · Syncing NAQI...' : ''}
          </span>
          <span className="font-mono">
            {isSortingByAqi
              ? 'NAQI (IN)'
              : isSortingByAirTemp
                ? 'Live Air °C'
                : isSortingBySurfaceTemp
                  ? 'LST °C'
                  : activeLayer === 'aqi'
                    ? 'NAQI (IN)'
                    : activeLayer === 'temperature'
                      ? 'Anomaly'
                      : activeLayer === 'landcover'
                        ? 'Canopy'
                        : 'Albedo'}
          </span>
        </div>

        {filteredSectors.length === 0 ? (
          <div className="p-6 text-center space-y-2.5">
            <MapPin
              className={`w-5 h-5 mx-auto ${
                isDark ? 'text-[#facc15]/50' : 'text-[#d2d2d7]'
              }`}
              aria-hidden="true"
            />
            <p className="text-xs font-medium">No matching Indian study sectors</p>
            <p className={`text-xs ${isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'}`}>
              Pick a suggestion from the search dropdown above or reset filters.
            </p>
            <button
              type="button"
              onClick={() => {
                onSearchChange('');
                onCategoryChange('All');
                onTierChange('All');
                onRegionChange('All India');
                onSortChange('default');
              }}
              className={`mt-1 px-3 py-1.5 text-xs font-medium rounded-[11px] transition-colors cursor-pointer ${
                isDark
                  ? 'bg-[#facc15] text-black hover:bg-[#eab308]'
                  : 'text-[#0071e3] bg-[#f5f5f7] hover:bg-[#e8e8ed]'
              }`}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <ul
            className={`divide-y ${
              isDark ? 'divide-[#facc15]/15' : 'divide-[#d2d2d7]/40'
            }`}
            role="listbox"
            aria-label="India microclimate sectors"
          >
            {filteredSectors.map((sector, index) => {
              const isSelected = sector.id === selectedSector.id;
              const sectorEnv = envBySectorId[sector.id];
              const sectorAqi = resolveIndianAqi(sectorEnv);
              const airTemp = sectorEnv?.weather?.available
                ? sectorEnv.weather.temperatureC
                : null;
              const metric = getLayerMetricValue(sector, activeLayer, sectorEnv);

              let rightMetricText = metric.shortFormatted;
              if (isSortingByAqi) {
                rightMetricText = sectorAqi ? `${sectorAqi.aqi}` : '...';
              } else if (isSortingByAirTemp) {
                rightMetricText =
                  airTemp != null ? `${airTemp.toFixed(1)}°` : '...';
              } else if (isSortingBySurfaceTemp) {
                rightMetricText = `${sector.avgSurfaceTempC.toFixed(1)}°`;
              }

              return (
                <li key={sector.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => onSelectSector(sector)}
                    onMouseEnter={() => onHoverSector(sector)}
                    onMouseLeave={() => onHoverSector(null)}
                    className={`w-full px-4 py-2.5 text-left flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? isDark
                          ? 'bg-[#facc15]/14 text-[#fef9c3]'
                          : 'bg-[#0071e3]/[0.08] text-[#1d1d1f]'
                        : isDark
                          ? 'hover:bg-[#141414] text-[#fef9c3]'
                          : 'hover:bg-[#f5f5f7] text-[#1d1d1f]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        {sortOption !== 'default' && (
                          <span
                            className={`text-[10px] font-mono tabular-nums shrink-0 ${
                              isDark ? 'text-[#facc15]' : 'text-[#0071e3]'
                            }`}
                          >
                            #{index + 1}
                          </span>
                        )}
                        <span
                          className={`text-[11px] font-mono shrink-0 ${
                            isSelected
                              ? isDark
                                ? 'text-[#facc15] font-semibold'
                                : 'text-[#0071e3] font-semibold'
                              : isDark
                                ? 'text-[#d4c46a]'
                                : 'text-[#86868b]'
                          }`}
                        >
                          {sector.code}
                        </span>
                        <span
                          className={`text-xs truncate ${
                            isSelected ? 'font-semibold' : 'font-medium'
                          }`}
                        >
                          {sector.label}
                        </span>
                      </div>
                      <div
                        className={`text-[11px] mt-0.5 truncate ${
                          isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                        }`}
                      >
                        {sector.city} · {sector.tier}
                        {sectorAqi ? ` · NAQI ${sectorAqi.aqi}` : ''}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-mono tabular-nums font-medium shrink-0 ${
                        isSelected && isDark ? 'text-[#facc15]' : ''
                      }`}
                    >
                      {rightMetricText}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
