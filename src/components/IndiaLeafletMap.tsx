import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Pane,
  Polygon,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  PanelLeftOpen,
  Thermometer,
  Trees,
  Sun,
  Map as MapIcon,
  Layers,
  Satellite,
  Wind,
  WifiOff,
} from 'lucide-react';
import {
  IndiaRegion,
  LiveEnvironmentData,
  MapLayer,
  ResolvedIndiaSector,
  SettlementTier,
  computeVulnerabilityIndex,
  getLayerMetricValue,
  getSectorFillColor,
  resolveIndianAqi,
  resolveUsAqi,
} from '../utils/uhiModel';
import {
  INDIA_NATIONAL_BOUNDARY,
  INDIA_STATES_BOUNDARY,
  buildIndiaExteriorMask,
  getIndiaBorderLayerStyles,
} from '../utils/indiaBorders';
import { CollapsibleMapLegend } from './CollapsibleMapLegend';

interface IndiaLeafletMapProps {
  sectors: ResolvedIndiaSector[];
  filteredIds: Set<string>;
  selectedSector: ResolvedIndiaSector;
  hoveredSector: ResolvedIndiaSector | null;
  activeLayer: MapLayer;
  regionFilter: IndiaRegion;
  tierFilter: SettlementTier | 'All';
  isSidebarOpen: boolean;
  envBySectorId: Record<string, LiveEnvironmentData | undefined>;
  liveEnvironment: LiveEnvironmentData | null;
  isLoadingEnv: boolean;
  isOnline: boolean;
  isDark: boolean;
  onOpenSidebar: () => void;
  onSelectLayer: (layer: MapLayer) => void;
  onSelectRegion: (region: IndiaRegion) => void;
  onSelectTier: (tier: SettlementTier | 'All') => void;
  onSelectSector: (sector: ResolvedIndiaSector) => void;
  onHoverSector: (sector: ResolvedIndiaSector | null) => void;
}

type BasemapMode = 'street' | 'satellite' | 'minimal';

const INDIA_CENTER: [number, number] = [22.3, 81.8];
const INDIA_EXTERIOR_MASK = buildIndiaExteriorMask(INDIA_NATIONAL_BOUNDARY);

function getDefaultIndiaZoom(): number {
  if (typeof window !== 'undefined' && window.innerWidth < 640) {
    return 4;
  }
  return 4.5;
}

const LAYER_TABS: Array<{
  id: MapLayer;
  label: string;
  mobileLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'temperature', label: 'Temp Anomaly (°C)', mobileLabel: 'Temp', icon: Thermometer },
  { id: 'aqi', label: 'Live AQI (NAQI)', mobileLabel: 'AQI', icon: Wind },
  { id: 'landcover', label: 'Land Cover', mobileLabel: 'Cover', icon: Trees },
  { id: 'albedo', label: 'Albedo Index', mobileLabel: 'Albedo', icon: Sun },
];

const TIER_PILLS: Array<{ id: SettlementTier | 'All'; label: string }> = [
  { id: 'All', label: 'All Tiers' },
  { id: 'Tier 1', label: 'Tier 1' },
  { id: 'Tier 2', label: 'Tier 2' },
  { id: 'Tier 3', label: 'Tier 3' },
  { id: 'Rural', label: 'Rural' },
];

const INDIA_REGIONS: IndiaRegion[] = [
  'All India',
  'North & NCR',
  'West',
  'South',
  'East',
  'Central',
  'Northeast',
];

function CameraController({
  selectedSector,
  regionFilter,
  sectors,
  resetSignal,
  isSidebarOpen,
}: {
  selectedSector: ResolvedIndiaSector;
  regionFilter: IndiaRegion;
  sectors: ResolvedIndiaSector[];
  resetSignal: number;
  isSidebarOpen: boolean;
}) {
  const map = useMap();
  const prevSectorIdRef = useRef<string>(selectedSector.id);
  const prevRegionRef = useRef<IndiaRegion>(regionFilter);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize({ animate: false });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [map, isSidebarOpen]);

  useEffect(() => {
    const container = map.getContainer();
    if (typeof ResizeObserver === 'undefined' || !container) return;
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  useEffect(() => {
    if (prevRegionRef.current !== regionFilter) {
      prevRegionRef.current = regionFilter;
      if (regionFilter === 'All India') {
        map.flyTo(INDIA_CENTER, getDefaultIndiaZoom(), { duration: 0.6 });
        return;
      }

      const matching = sectors.filter((s) => s.subRegion === regionFilter);
      if (matching.length > 1) {
        const bounds = L.latLngBounds(
          matching.map((s) => [s.location.lat, s.location.lng] as [number, number])
        );
        map.flyToBounds(bounds, { padding: [48, 48], duration: 0.6, maxZoom: 8 });
        return;
      } else if (matching.length === 1) {
        map.flyTo([matching[0].location.lat, matching[0].location.lng], 8, {
          duration: 0.6,
        });
        return;
      }
    }

    if (prevSectorIdRef.current !== selectedSector.id) {
      prevSectorIdRef.current = selectedSector.id;
      const targetZoom = Math.max(map.getZoom(), 7);
      map.flyTo(
        [selectedSector.location.lat, selectedSector.location.lng],
        targetZoom,
        { duration: 0.55 }
      );
    }
  }, [map, selectedSector, regionFilter, sectors]);

  useEffect(() => {
    if (resetSignal === 0) return;
    map.flyTo(INDIA_CENTER, getDefaultIndiaZoom(), { duration: 0.55 });
  }, [map, resetSignal]);

  return null;
}

function MapZoomButtons({
  isDark,
  onResetView,
}: {
  isDark: boolean;
  onResetView: () => void;
}) {
  const map = useMap();

  return (
    <div
      role="group"
      aria-label="Map zoom controls"
      className={`flex flex-col backdrop-blur-xl border rounded-[11px] divide-y overflow-hidden ${
        isDark
          ? 'bg-[#0a0a0a]/92 border-[#facc15]/35 divide-[#facc15]/20 shadow-[0_2px_12px_rgba(0,0,0,0.65)]'
          : 'bg-white/95 border-[#d2d2d7]/90 divide-[#d2d2d7]/70 shadow-[0_2px_12px_rgba(0,0,0,0.12)]'
      }`}
    >
      <button
        type="button"
        onClick={() => map.zoomIn()}
        aria-label="Zoom in map"
        className={`p-2 transition-colors cursor-pointer ${
          isDark
            ? 'text-[#fef9c3] hover:bg-[#1a1a1a] hover:text-[#facc15]'
            : 'text-[#1d1d1f] hover:bg-[#f5f5f7]'
        }`}
      >
        <ZoomIn className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => map.zoomOut()}
        aria-label="Zoom out map"
        className={`p-2 transition-colors cursor-pointer ${
          isDark
            ? 'text-[#fef9c3] hover:bg-[#1a1a1a] hover:text-[#facc15]'
            : 'text-[#1d1d1f] hover:bg-[#f5f5f7]'
        }`}
      >
        <ZoomOut className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={onResetView}
        aria-label="Reset India map view"
        className={`p-2 transition-colors cursor-pointer ${
          isDark
            ? 'text-[#fef9c3] hover:bg-[#1a1a1a] hover:text-[#facc15]'
            : 'text-[#1d1d1f] hover:bg-[#f5f5f7]'
        }`}
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function IndiaLeafletMap({
  sectors,
  filteredIds,
  selectedSector,
  hoveredSector,
  activeLayer,
  regionFilter,
  tierFilter,
  isSidebarOpen,
  envBySectorId,
  liveEnvironment,
  isLoadingEnv,
  isOnline,
  isDark,
  onOpenSidebar,
  onSelectLayer,
  onSelectRegion,
  onSelectTier,
  onSelectSector,
  onHoverSector,
}: IndiaLeafletMapProps) {
  const [basemap, setBasemap] = useState<BasemapMode>('street');
  const [resetSignal, setResetSignal] = useState(0);

  const borderStyles = getIndiaBorderLayerStyles(isDark, basemap);
  const borderLayerKey = `${isDark ? 'dark' : 'light'}-${basemap}`;

  const toolbarSurface = isDark
    ? 'bg-[#0a0a0a] border-[#facc15]/25'
    : 'bg-white border-[#d2d2d7]/80';

  const pillGroupSurface = isDark
    ? 'bg-[#141414] border-[#facc15]/25'
    : 'bg-[#f5f5f7] border-[#d2d2d7]/80';

  const mapContainerTileTheme =
    basemap === 'street'
      ? isDark
        ? 'uhi-map-street-dark'
        : 'uhi-map-street-light'
      : '';

  const renderTileLayers = () => {
    if (basemap === 'street') {
      return (
        <TileLayer
          key="street-base"
          url="/api/tiles/street/{z}/{x}/{y}.png"
          attribution="&copy; Esri, OpenStreetMap contributors &amp; GIS Community"
        />
      );
    }

    if (basemap === 'satellite') {
      return (
        <>
          <TileLayer
            key="sat-base"
            url="/api/tiles/satellite/{z}/{x}/{y}.png"
            attribution="&copy; Esri, Maxar, Earthstar Geographics"
          />
          <TileLayer
            key="sat-labels"
            url="/api/tiles/satellite_labels/{z}/{x}/{y}.png"
            opacity={0.95}
          />
        </>
      );
    }

    const minimalKey = isDark ? 'dark_matter' : 'positron';
    return (
      <>
        <TileLayer
          key={`minimal-${minimalKey}`}
          url={`/api/tiles/${minimalKey}/{z}/{x}/{y}.png`}
          attribution="&copy; OpenStreetMap contributors &copy; CARTO &copy; Esri"
        />
        <TileLayer
          key={`minimal-labels-${minimalKey}`}
          url={`/api/tiles/${minimalKey}_labels/{z}/{x}/{y}.png`}
          opacity={0.85}
        />
      </>
    );
  };

  return (
    <section
      aria-label="Interactive India Leaflet UHI Map"
      data-testid="india-leaflet-map"
      data-active-layer={activeLayer}
      data-selected-sector={selectedSector.id}
      className={`flex-1 flex flex-col min-h-[420px] overflow-hidden ${
        isDark ? 'bg-black' : 'bg-[#f5f5f7]'
      }`}
    >
      {/* Docked Map Control Header (Zero Floating Overlap with Map Popups/Zoom) */}
      <div
        className={`shrink-0 border-b px-2.5 py-2 sm:px-3 flex flex-col gap-1.5 z-20 ${toolbarSurface}`}
      >
        {/* Row 1: Inspector Button (when closed) + Layer Switcher + Desktop Basemap Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 md:flex-initial">
            {!isSidebarOpen && (
              <button
                type="button"
                onClick={onOpenSidebar}
                aria-label="Open Inspector sidebar"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 border rounded-[9px] text-xs font-medium transition-colors shrink-0 cursor-pointer ${
                  isDark
                    ? 'bg-[#141414] border-[#facc15]/35 text-[#facc15] hover:bg-[#1f1f1f]'
                    : 'bg-[#f5f5f7] border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
                }`}
              >
                <PanelLeftOpen className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Inspector</span>
              </button>
            )}

            <div
              role="group"
              aria-label="Map layer selector"
              className={`grid grid-cols-4 md:inline-flex items-center gap-0.5 p-0.5 border rounded-[9px] flex-1 md:flex-initial min-w-0 ${pillGroupSurface}`}
            >
              {LAYER_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeLayer === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onSelectLayer(tab.id)}
                    className={`inline-flex items-center justify-center gap-1 px-1.5 sm:px-2.5 py-1 text-[11px] sm:text-xs font-medium rounded-[7px] transition-colors whitespace-nowrap cursor-pointer ${
                      isActive
                        ? isDark
                          ? 'bg-[#facc15] text-black font-semibold'
                          : 'bg-[#0071e3] text-white'
                        : isDark
                          ? 'text-[#fef9c3] hover:bg-[#1f1f1f]'
                          : 'text-[#1d1d1f] hover:bg-white'
                    }`}
                  >
                    <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" aria-hidden="true" />
                    <span className="md:hidden">{tab.mobileLabel}</span>
                    <span className="hidden md:inline">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right side: Offline badge (only when offline) + Desktop Basemap Style Selector */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {!isOnline && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-[8px] border ${
                  isDark
                    ? 'bg-[#1a1400] border-[#facc15]/40 text-[#facc15]'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                <WifiOff className="w-3 h-3" aria-hidden="true" />
                <span>Offline Cache</span>
              </span>
            )}

            <div
              role="group"
              aria-label="Leaflet basemap style"
              className={`inline-flex items-center gap-0.5 p-0.5 border rounded-[9px] ${pillGroupSurface}`}
            >
              {(
                [
                  { id: 'street', label: 'Map', icon: MapIcon },
                  { id: 'satellite', label: 'Satellite', icon: Satellite },
                  { id: 'minimal', label: 'Minimal', icon: Layers },
                ] as const
              ).map((mode) => {
                const Icon = mode.icon;
                const active = basemap === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setBasemap(mode.id)}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-[7px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      active
                        ? isDark
                          ? 'bg-[#facc15] text-black font-semibold'
                          : 'bg-[#1d1d1f] text-white'
                        : isDark
                          ? 'text-[#d4c46a] hover:text-[#fef9c3] hover:bg-[#1f1f1f]'
                          : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-white'
                    }`}
                  >
                    <Icon className="w-3 h-3" aria-hidden="true" />
                    <span>{mode.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2 (Desktop & Tablet only; hidden on mobile so mobile stays ultra-clean): Region + Tier Pills */}
        <div className="hidden md:flex flex-wrap items-center justify-between gap-2">
          <div
            role="group"
            aria-label="India region filter"
            className={`inline-flex items-center gap-0.5 p-0.5 border rounded-[9px] max-w-full overflow-x-auto ${pillGroupSurface}`}
          >
            {INDIA_REGIONS.map((region) => {
              const isActive = regionFilter === region;
              return (
                <button
                  key={region}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onSelectRegion(region)}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded-[7px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-[#facc15] text-black font-semibold'
                        : 'bg-[#1d1d1f] text-white'
                      : isDark
                        ? 'text-[#d4c46a] hover:text-[#fef9c3] hover:bg-[#1f1f1f]'
                        : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-white'
                  }`}
                >
                  {region}
                </button>
              );
            })}
          </div>

          <div
            role="group"
            aria-label="City tier and rural filter"
            className={`inline-flex items-center gap-0.5 p-0.5 border rounded-[9px] shrink-0 ${pillGroupSurface}`}
          >
            {TIER_PILLS.map((tier) => {
              const isActive = tierFilter === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onSelectTier(tier.id)}
                  className={`px-2 py-0.5 text-[11px] font-medium rounded-[7px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? isDark
                        ? 'bg-[#facc15] text-black font-semibold'
                        : 'bg-[#0071e3] text-white'
                      : isDark
                        ? 'text-[#d4c46a] hover:text-[#fef9c3] hover:bg-[#1f1f1f]'
                        : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-white'
                  }`}
                >
                  {tier.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Unobstructed Leaflet Map Canvas */}
      <div className="relative flex-1 min-h-[340px]">
        <MapContainer
          center={INDIA_CENTER}
          zoom={getDefaultIndiaZoom()}
          zoomSnap={0.5}
          zoomDelta={0.5}
          minZoom={3.5}
          maxZoom={18}
          zoomControl={false}
          className={`w-full h-full min-h-[340px] ${mapContainerTileTheme}`}
        >
          {renderTileLayers()}

          {/* Proper Survey of India National Outer Boundary + State/UT Borders */}
          <Pane name="india-borders" style={{ zIndex: 350, pointerEvents: 'none' }}>
            <GeoJSON
              key={`india-mask-${borderLayerKey}`}
              data={INDIA_EXTERIOR_MASK}
              interactive={false}
              style={() => borderStyles.exteriorMask}
            />
            <GeoJSON
              key={`india-states-${borderLayerKey}`}
              data={INDIA_STATES_BOUNDARY}
              interactive={false}
              style={() => borderStyles.stateBorders}
            />
            <GeoJSON
              key={`india-halo-${borderLayerKey}`}
              data={INDIA_NATIONAL_BOUNDARY}
              interactive={false}
              style={() => borderStyles.nationalHalo}
            />
            <GeoJSON
              key={`india-outline-${borderLayerKey}`}
              data={INDIA_NATIONAL_BOUNDARY}
              interactive={false}
              style={() => borderStyles.nationalOutline}
            />
          </Pane>

          <CameraController
            selectedSector={selectedSector}
            regionFilter={regionFilter}
            sectors={sectors}
            resetSignal={resetSignal}
            isSidebarOpen={isSidebarOpen}
          />

          {/* Top-Right Compact Zoom Controls */}
          <div className="leaflet-top leaflet-right pointer-events-none">
            <div className="mt-3 mr-3 pointer-events-auto">
              <MapZoomButtons
                isDark={isDark}
                onResetView={() => setResetSignal((n) => n + 1)}
              />
            </div>
          </div>

          {/* Hexagonal UHI Thermal Footprint for Selected Sector */}
          {selectedSector.footprintPolygon.length > 0 && (
            <Polygon
              positions={selectedSector.footprintPolygon.map(
                (pt): [number, number] => [pt.lat, pt.lng]
              )}
              pathOptions={{
                fillColor: getSectorFillColor(
                  selectedSector,
                  activeLayer,
                  envBySectorId[selectedSector.id] ?? liveEnvironment
                ),
                fillOpacity: 0.34,
                color: isDark ? '#facc15' : '#0071e3',
                weight: 2.5,
              }}
            />
          )}

          {/* Outer Google-Maps-style Highlight Halo on Selected Marker */}
          {selectedSector.location && (
            <CircleMarker
              center={[selectedSector.location.lat, selectedSector.location.lng]}
              radius={19}
              interactive={false}
              pathOptions={{
                fillColor: isDark ? '#facc15' : '#0071e3',
                fillOpacity: 0.16,
                color: isDark ? '#facc15' : '#0071e3',
                weight: 1.8,
                dashArray: '3 3',
              }}
            />
          )}

          {/* Interactive Color-Coded CircleMarkers Across India */}
          {sectors.map((sector) => {
            const isSelected = sector.id === selectedSector.id;
            const isHovered = hoveredSector?.id === sector.id;
            const isMatched = filteredIds.has(sector.id);
            const envForSector =
              envBySectorId[sector.id] ?? (isSelected ? liveEnvironment : null);
            const fillColor = getSectorFillColor(sector, activeLayer, envForSector);
            const metric = getLayerMetricValue(sector, activeLayer, envForSector);
            const vuln = computeVulnerabilityIndex(sector);
            const indianAqi = resolveIndianAqi(envForSector);
            const usAqi = resolveUsAqi(envForSector);
            const pm25 = envForSector?.airQuality?.pollutants?.find(
              (p) => p.code === 'pm25'
            );

            const baseRadius =
              sector.tier === 'Tier 1' ? 9.5 : sector.tier === 'Tier 2' ? 8.5 : 7.5;
            const radius = isSelected
              ? baseRadius + 3.5
              : isHovered
                ? baseRadius + 2
                : baseRadius;

            const ringColor = isSelected
              ? isDark
                ? '#facc15'
                : '#0071e3'
              : basemap === 'satellite' || isDark
                ? '#ffffff'
                : '#1d1d1f';

            return (
              <CircleMarker
                key={sector.id}
                center={[sector.location.lat, sector.location.lng]}
                radius={radius}
                pathOptions={{
                  fillColor,
                  fillOpacity: isMatched ? 0.92 : 0.25,
                  color: ringColor,
                  weight: isSelected ? 3 : isHovered ? 2.4 : 1.7,
                  opacity: isMatched ? 0.98 : 0.35,
                }}
                eventHandlers={{
                  click: () => onSelectSector(sector),
                  mouseover: () => onHoverSector(sector),
                  mouseout: () => onHoverSector(null),
                }}
              >
                <Tooltip direction="top" offset={[0, -6]} opacity={0.96}>
                  <div className="font-sans tracking-tight text-[11px] leading-snug">
                    <span className="font-semibold">{sector.city}</span> · {sector.label}{' '}
                    <span className="font-mono font-semibold ml-1">
                      {metric.shortFormatted}
                    </span>
                  </div>
                </Tooltip>

                <Popup
                  maxWidth={280}
                  autoPanPaddingTopLeft={[16, 20]}
                  autoPanPaddingBottomRight={[16, 75]}
                >
                  <div className="p-0.5 space-y-2 font-sans tracking-tight">
                    <div>
                      <div
                        className={`text-[10px] font-medium ${
                          isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                        }`}
                      >
                        {sector.code} · {sector.tier} · {sector.subRegion}
                      </div>
                      <h3 className="text-sm font-semibold mt-0.5 leading-snug">
                        {sector.displayName}
                      </h3>
                      <p
                        className={`text-[11px] mt-0.5 leading-snug ${
                          isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                        }`}
                      >
                        {sector.formattedAddress}
                      </p>
                    </div>

                    <div
                      className={`grid grid-cols-2 gap-2 pt-2 border-t text-xs ${
                        isDark ? 'border-[#facc15]/20' : 'border-[#d2d2d7]'
                      }`}
                    >
                      <div>
                        <span
                          className={`text-[10px] font-medium block ${
                            isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                          }`}
                        >
                          Satellite LST
                        </span>
                        <span className="font-semibold tabular-nums">
                          {sector.avgSurfaceTempC.toFixed(1)} °C (
                          {sector.tempAnomalyC > 0 ? '+' : ''}
                          {sector.tempAnomalyC.toFixed(1)}°)
                        </span>
                      </div>
                      <div>
                        <span
                          className={`text-[10px] font-medium block ${
                            isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                          }`}
                        >
                          Vulnerability
                        </span>
                        <span className="font-semibold tabular-nums">
                          {vuln.score}/100 ({vuln.tier})
                        </span>
                      </div>
                      <div>
                        <span
                          className={`text-[10px] font-medium block ${
                            isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                          }`}
                        >
                          Green / Impervious
                        </span>
                        <span className="font-semibold tabular-nums">
                          {sector.greenCanopyPct.toFixed(0)}% /{' '}
                          {sector.imperviousPct.toFixed(0)}%
                        </span>
                      </div>
                      <div>
                        <span
                          className={`text-[10px] font-medium block ${
                            isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                          }`}
                        >
                          Open-Meteo Air / AQI
                        </span>
                        <span className="font-semibold tabular-nums">
                          {isLoadingEnv && !envForSector
                            ? 'Loading...'
                            : envForSector?.weather.available &&
                                envForSector.weather.temperatureC != null
                              ? `${envForSector.weather.temperatureC.toFixed(1)} °C${
                                  indianAqi ? ` · NAQI ${indianAqi.aqi}` : ''
                                }`
                              : indianAqi
                                ? `NAQI ${indianAqi.aqi}`
                                : 'Unavailable'}
                        </span>
                        {(indianAqi || usAqi != null) && (
                          <span
                            className={`block text-[10px] tabular-nums ${
                              isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                            }`}
                          >
                            {usAqi != null ? `US AQI ${usAqi}` : ''}
                            {pm25?.concentration?.value != null
                              ? ` · PM2.5 ${pm25.concentration.value.toFixed(1)}`
                              : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Offline Badge on Mobile (clean corner pill only when offline) */}
        {!isOnline && (
          <div
            className={`md:hidden absolute top-3 left-3 z-20 inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-[8px] border shadow-sm ${
              isDark
                ? 'bg-[#0a0a0a]/95 border-[#facc15]/45 text-[#facc15]'
                : 'bg-amber-50/95 border-amber-300 text-amber-900'
            }`}
          >
            <WifiOff className="w-3 h-3" aria-hidden="true" />
            <span>Offline Cache</span>
          </div>
        )}

        {/* Scientific Collapsible Map Legend explaining Temperature, AQI, Land Cover & Albedo */}
        <CollapsibleMapLegend
          activeLayer={activeLayer}
          isDark={isDark}
          onSelectLayer={onSelectLayer}
        />
      </div>
    </section>
  );
}
