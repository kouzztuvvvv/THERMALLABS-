import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  INDIA_BASELINE_C,
  IndiaRegion,
  MapLayer,
  ResolvedIndiaSector,
  SettlementTier,
  SortOption,
  ZoneCategory,
  buildHexFootprint,
  computeIndiaSummary,
  filterSectors,
  sortSectors,
} from './utils/uhiModel';
import { GeocodePlace, useIndiaPlaces } from './hooks/useIndiaPlaces';
import {
  useBatchEnvironment,
  useLiveEnvironment,
} from './hooks/useLiveEnvironment';
import { TopBar, AnalyticsTab } from './components/TopBar';
import { NeighborhoodSidebar } from './components/NeighborhoodSidebar';
import { IndiaLeafletMap } from './components/IndiaLeafletMap';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { MethodologyDrawer } from './components/MethodologyDrawer';
import { AreaAiChatbox } from './components/AreaAiChatbox';
import {
  loadLastViewedState,
  saveLastViewedState,
} from './utils/offlineCache';

function inferIndiaRegion(stateOrAdmin: string): Exclude<IndiaRegion, 'All India'> {
  const lower = stateOrAdmin.toLowerCase();
  if (
    lower.includes('maharashtra') ||
    lower.includes('mumbai') ||
    lower.includes('pune') ||
    lower.includes('gujarat') ||
    lower.includes('ahmedabad') ||
    lower.includes('surat') ||
    lower.includes('goa')
  ) {
    return lower.includes('nagpur') ? 'Central' : 'West';
  }
  if (
    lower.includes('karnataka') ||
    lower.includes('bengaluru') ||
    lower.includes('bangalore') ||
    lower.includes('tamil nadu') ||
    lower.includes('chennai') ||
    lower.includes('telangana') ||
    lower.includes('hyderabad') ||
    lower.includes('kerala') ||
    lower.includes('kochi') ||
    lower.includes('andhra') ||
    lower.includes('puducherry')
  ) {
    return 'South';
  }
  if (
    lower.includes('west bengal') ||
    lower.includes('kolkata') ||
    lower.includes('howrah') ||
    lower.includes('odisha') ||
    lower.includes('bhubaneswar') ||
    lower.includes('bihar') ||
    lower.includes('patna') ||
    lower.includes('jharkhand') ||
    lower.includes('ranchi')
  ) {
    return 'East';
  }
  if (
    lower.includes('assam') ||
    lower.includes('guwahati') ||
    lower.includes('meghalaya') ||
    lower.includes('shillong') ||
    lower.includes('sikkim') ||
    lower.includes('tripura') ||
    lower.includes('manipur') ||
    lower.includes('arunachal') ||
    lower.includes('nagaland') ||
    lower.includes('mizoram')
  ) {
    return 'Northeast';
  }
  if (
    lower.includes('madhya pradesh') ||
    lower.includes('bhopal') ||
    lower.includes('indore') ||
    lower.includes('chhattisgarh') ||
    lower.includes('raipur') ||
    lower.includes('nagpur')
  ) {
    return 'Central';
  }
  return 'North & NCR';
}

function inferTierFromGeocode(name: string, state: string, isGreen: boolean): SettlementTier {
  const lower = `${name} ${state}`.toLowerCase();
  if (
    lower.includes('delhi') ||
    lower.includes('mumbai') ||
    lower.includes('bengaluru') ||
    lower.includes('bangalore') ||
    lower.includes('chennai') ||
    lower.includes('hyderabad') ||
    lower.includes('kolkata') ||
    lower.includes('pune') ||
    lower.includes('ahmedabad')
  ) {
    return 'Tier 1';
  }
  if (isGreen || lower.includes('village') || lower.includes('rural')) {
    return 'Rural';
  }
  return 'Tier 2';
}

export default function App() {
  const { sectors: baseSectors } = useIndiaPlaces();

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('uhi_theme') === 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    try {
      localStorage.setItem('uhi_theme', isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage write errors
    }
  }, [isDark]);

  const initialOfflineState = useMemo(() => loadLastViewedState(), []);

  const [customPins, setCustomPins] = useState<ResolvedIndiaSector[]>(
    () => initialOfflineState?.customPins ?? []
  );
  const [activeLayer, setActiveLayer] = useState<MapLayer>(
    () => initialOfflineState?.activeLayer ?? 'temperature'
  );
  const [selectedSectorId, setSelectedSectorId] = useState<string>(
    () => initialOfflineState?.selectedSectorId ?? 'dl-01'
  );
  const [hoveredSectorId, setHoveredSectorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ZoneCategory | 'All'>('All');
  const [tierFilter, setTierFilter] = useState<SettlementTier | 'All'>('All');
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [regionFilter, setRegionFilter] = useState<IndiaRegion>('All India');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [activeAnalyticsTab, setActiveAnalyticsTab] =
    useState<AnalyticsTab>('regression');
  const [isMethodologyOpen, setIsMethodologyOpen] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const allSectors = useMemo(() => {
    const combined = [...customPins, ...baseSectors];
    if (
      initialOfflineState?.lastSectorSnapshot &&
      !combined.some((s) => s.id === initialOfflineState.lastSectorSnapshot!.id)
    ) {
      return [initialOfflineState.lastSectorSnapshot, ...combined];
    }
    return combined;
  }, [customPins, baseSectors, initialOfflineState]);

  const {
    envBySectorId,
    isSyncingAll: isSyncingAllEnv,
    isOnline,
    upsertEnvironment,
  } = useBatchEnvironment(allSectors);

  const selectedSector = useMemo(
    () =>
      allSectors.find((s) => s.id === selectedSectorId) ?? allSectors[0],
    [allSectors, selectedSectorId]
  );

  const hoveredSector = useMemo(
    () =>
      hoveredSectorId
        ? allSectors.find((s) => s.id === hoveredSectorId) ?? null
        : null,
    [allSectors, hoveredSectorId]
  );

  const filteredSectors = useMemo(() => {
    const filtered = filterSectors(
      allSectors,
      searchQuery,
      categoryFilter,
      regionFilter,
      tierFilter
    );
    return sortSectors(filtered, sortOption, envBySectorId);
  }, [
    allSectors,
    searchQuery,
    categoryFilter,
    regionFilter,
    tierFilter,
    sortOption,
    envBySectorId,
  ]);

  const filteredIds = useMemo(
    () => new Set(filteredSectors.map((s) => s.id)),
    [filteredSectors]
  );

  const indiaSummary = useMemo(
    () => computeIndiaSummary(baseSectors),
    [baseSectors]
  );

  const {
    data: liveEnvironment,
    isLoading: isLoadingEnv,
    error: envError,
  } = useLiveEnvironment(
    selectedSector.id,
    selectedSector.location,
    envBySectorId[selectedSector.id],
    upsertEnvironment
  );

  // Persist last viewed neighborhood + active layer + custom pins to LocalStorage for offline resume
  useEffect(() => {
    saveLastViewedState({
      selectedSectorId: selectedSector.id,
      activeLayer,
      customPins,
      lastSectorSnapshot: selectedSector,
      savedAt: new Date().toISOString(),
    });
  }, [selectedSector, activeLayer, customPins]);

  const handleFocusMap = () => {
    mapContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSelectSector = useCallback((sector: ResolvedIndiaSector) => {
    setSelectedSectorId(sector.id);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);

  const handleHoverSector = useCallback((sector: ResolvedIndiaSector | null) => {
    setHoveredSectorId(sector ? sector.id : null);
  }, []);

  const handleSelectRegion = useCallback(
    (region: IndiaRegion) => {
      setRegionFilter(region);
      if (region !== 'All India') {
        const firstInRegion = allSectors.find((s) => s.subRegion === region);
        if (firstInRegion) {
          setSelectedSectorId(firstInRegion.id);
        }
      }
    },
    [allSectors]
  );

  const handleSelectGeocodePlace = useCallback(
    (place: GeocodePlace) => {
      const existing = allSectors.find(
        (s) =>
          Math.abs(s.location.lat - place.latitude) < 0.04 &&
          Math.abs(s.location.lng - place.longitude) < 0.04
      );
      if (existing) {
        setRegionFilter('All India');
        setSelectedSectorId(existing.id);
        return;
      }

      const name = place.name;
      const state = place.admin1 || 'India';
      const address = [place.name, place.admin2, place.admin1, 'India']
        .filter(Boolean)
        .join(', ');
      const subRegion = inferIndiaRegion(`${name} ${state}`);
      const loc = { lat: place.latitude, lng: place.longitude };
      const newId = `pin-${place.id}`;

      const lowerName = name.toLowerCase();
      const isGreen =
        lowerName.includes('park') ||
        lowerName.includes('garden') ||
        lowerName.includes('forest') ||
        lowerName.includes('sanctuary') ||
        lowerName.includes('lake') ||
        lowerName.includes('reserve');
      const avgSurfaceTempC = isGreen ? 34.2 : 40.4;
      const tempAnomalyC = Number(
        (avgSurfaceTempC - INDIA_BASELINE_C).toFixed(1)
      );

      const newPin: ResolvedIndiaSector = {
        id: newId,
        code: 'PIN',
        label: name,
        city: name,
        state,
        tier: inferTierFromGeocode(name, state, isGreen),
        subRegion,
        lat: loc.lat,
        lng: loc.lng,
        placeQuery: address,
        category: isGreen ? 'Parkland & Watershed' : 'Residential',
        avgSurfaceTempC,
        tempAnomalyC,
        greenCanopyPct: isGreen ? 64.0 : 18.5,
        waterBodyPct: isGreen ? 2.5 : 0.4,
        imperviousPct: isGreen ? 18.0 : 75.5,
        albedoIndex: isGreen ? 0.24 : 0.2,
        ndviMean: isGreen ? 0.63 : 0.22,
        coolingMitigationNote:
          'Custom India locality pinned via Open-Meteo Geocoding with live Open-Meteo Weather, US AQI & CPCB NAQI telemetry overlaid on Landsat baseline.',
        placeId: String(place.id),
        displayName: name,
        formattedAddress: address,
        location: loc,
        viewport: null,
        footprintPolygon: buildHexFootprint(loc, null),
        isCustomPin: true,
      };

      setCustomPins((prev) => [newPin, ...prev.filter((p) => p.id !== newId)]);
      setRegionFilter('All India');
      setCategoryFilter('All');
      setTierFilter('All');
      setSearchQuery('');
      setSelectedSectorId(newId);
    },
    [allSectors]
  );

  return (
    <div
      className={`min-h-screen lg:h-screen flex flex-col overflow-x-hidden lg:overflow-hidden transition-colors ${
        isDark ? 'bg-black text-[#fef9c3]' : 'bg-[#f5f5f7] text-[#1d1d1f]'
      }`}
    >
      <TopBar
        activeTab={activeAnalyticsTab}
        isDark={isDark}
        sectors={allSectors}
        activeLayer={activeLayer}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        onSelectTab={setActiveAnalyticsTab}
        onFocusMap={handleFocusMap}
        onOpenMethodology={() => setIsMethodologyOpen(true)}
        onSelectSector={handleSelectSector}
        onSelectGeocodePlace={handleSelectGeocodePlace}
      />

      <div className="flex-1 flex min-h-0 relative lg:overflow-hidden">
        {isSidebarOpen && (
          <div className="fixed inset-x-0 top-12 bottom-0 z-40 lg:static lg:inset-auto lg:z-20 flex bg-black/35 backdrop-blur-[2px] lg:bg-transparent lg:backdrop-blur-none">
            <NeighborhoodSidebar
              isOpen={isSidebarOpen}
              isDark={isDark}
              onClose={() => setIsSidebarOpen(false)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              categoryFilter={categoryFilter}
              onCategoryChange={setCategoryFilter}
              tierFilter={tierFilter}
              onTierChange={setTierFilter}
              sortOption={sortOption}
              onSortChange={setSortOption}
              regionFilter={regionFilter}
              onRegionChange={handleSelectRegion}
              allSectors={allSectors}
              filteredSectors={filteredSectors}
              selectedSector={selectedSector}
              hoveredSector={hoveredSector}
              activeLayer={activeLayer}
              envBySectorId={envBySectorId}
              liveEnvironment={liveEnvironment}
              isLoadingEnv={isLoadingEnv}
              isSyncingAllEnv={isSyncingAllEnv}
              envError={envError}
              onSelectSector={handleSelectSector}
              onHoverSector={handleHoverSector}
              onSelectGeocodePlace={handleSelectGeocodePlace}
            />
            <div
              className="flex-1 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
            />
          </div>
        )}

        <main
          ref={mapContainerRef}
          className="flex-1 flex flex-col min-w-0 min-h-0 lg:overflow-hidden"
        >
          <div className="relative flex-1 flex flex-col min-h-0">
            <IndiaLeafletMap
              sectors={allSectors}
              filteredIds={filteredIds}
              selectedSector={selectedSector}
              hoveredSector={hoveredSector}
              activeLayer={activeLayer}
              regionFilter={regionFilter}
              tierFilter={tierFilter}
              isSidebarOpen={isSidebarOpen}
              envBySectorId={envBySectorId}
              liveEnvironment={liveEnvironment}
              isLoadingEnv={isLoadingEnv}
              isOnline={isOnline}
              isDark={isDark}
              onOpenSidebar={() => setIsSidebarOpen(true)}
              onSelectLayer={setActiveLayer}
              onSelectRegion={handleSelectRegion}
              onSelectTier={setTierFilter}
              onSelectSector={handleSelectSector}
              onHoverSector={handleHoverSector}
            />

            <AreaAiChatbox
              selectedSector={selectedSector}
              allSectors={allSectors}
              activeLayer={activeLayer}
              envBySectorId={envBySectorId}
              liveEnvironment={liveEnvironment}
              isDark={isDark}
            />
          </div>

          <AnalyticsPanel
            sectors={filteredSectors.length > 0 ? filteredSectors : allSectors}
            allSectors={allSectors}
            selectedSector={selectedSector}
            indiaSummary={indiaSummary}
            activeTab={activeAnalyticsTab}
            sortOption={sortOption}
            envBySectorId={envBySectorId}
            isDark={isDark}
            onSelectTab={setActiveAnalyticsTab}
            onSelectSector={handleSelectSector}
          />
        </main>
      </div>

      <MethodologyDrawer
        isOpen={isMethodologyOpen}
        isDark={isDark}
        onClose={() => setIsMethodologyOpen(false)}
        indiaSummary={indiaSummary}
      />
    </div>
  );
}
