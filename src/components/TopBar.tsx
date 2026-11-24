import { BookOpen, Moon, Sun } from 'lucide-react';
import { MapLayer, ResolvedIndiaSector } from '../utils/uhiModel';
import { GeocodePlace } from '../hooks/useIndiaPlaces';
import { IndiaPlaceSearch } from './IndiaPlaceSearch';

export type AnalyticsTab = 'regression' | 'diurnal' | 'matrix' | 'compare';

interface TopBarProps {
  activeTab: AnalyticsTab;
  isDark: boolean;
  sectors: ResolvedIndiaSector[];
  activeLayer: MapLayer;
  onToggleTheme: () => void;
  onSelectTab: (tab: AnalyticsTab) => void;
  onFocusMap: () => void;
  onOpenMethodology: () => void;
  onSelectSector: (sector: ResolvedIndiaSector) => void;
  onSelectGeocodePlace: (place: GeocodePlace) => void;
}

export function TopBar({
  activeTab,
  isDark,
  sectors,
  activeLayer,
  onToggleTheme,
  onSelectTab,
  onFocusMap,
  onOpenMethodology,
  onSelectSector,
  onSelectGeocodePlace,
}: TopBarProps) {
  return (
    <header
      className={`shrink-0 z-30 border-b backdrop-blur-xl transition-colors ${
        isDark
          ? 'bg-black/95 border-[#facc15]/25 text-[#fef9c3]'
          : 'bg-[#161617]/92 border-white/10 text-white'
      }`}
      style={{ backdropFilter: 'saturate(180%) blur(20px)' }}
    >
      <div className="h-12 px-3 sm:px-5 flex items-center justify-between gap-3">
        {/* Zone 1: Brand Title */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onFocusMap();
          }}
          className={`text-sm font-semibold tracking-tight whitespace-nowrap shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 ${
            isDark
              ? 'text-[#facc15] focus-visible:ring-[#facc15]'
              : 'text-white focus-visible:ring-[#0071e3]'
          }`}
        >
          THERMALLABS
        </a>

        {/* Zone 2: App Search Bar + Single-line Navigation */}
        <div className="flex items-center gap-4 lg:gap-6 flex-1 max-w-2xl justify-center">
          <div className="hidden md:block w-56 lg:w-64 shrink-0">
            <IndiaPlaceSearch
              sectors={sectors}
              activeLayer={activeLayer}
              isDark={isDark}
              variant="topbar"
              inputId="app-topbar-search"
              placeholder="Search India cities, sectors, places..."
              onSelectSector={onSelectSector}
              onSelectGeocodePlace={onSelectGeocodePlace}
            />
          </div>

          <nav aria-label="Workspace views" className="hidden lg:flex items-center gap-4 xl:gap-5">
            <button
              type="button"
              onClick={onFocusMap}
              className={`text-xs font-normal hover:underline underline-offset-4 transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer ${
                isDark
                  ? 'text-[#d4c46a] hover:text-[#facc15]'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              Map Explorer
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('regression')}
              className={`text-xs transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer underline-offset-4 ${
                activeTab === 'regression'
                  ? isDark
                    ? 'text-[#facc15] underline font-semibold'
                    : 'text-white underline font-semibold'
                  : isDark
                    ? 'text-[#d4c46a] hover:text-[#facc15] hover:underline font-normal'
                    : 'text-white/75 hover:text-white hover:underline font-normal'
              }`}
            >
              Canopy Regression
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('diurnal')}
              className={`text-xs transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer underline-offset-4 ${
                activeTab === 'diurnal'
                  ? isDark
                    ? 'text-[#facc15] underline font-semibold'
                    : 'text-white underline font-semibold'
                  : isDark
                    ? 'text-[#d4c46a] hover:text-[#facc15] hover:underline font-normal'
                    : 'text-white/75 hover:text-white hover:underline font-normal'
              }`}
            >
              Diurnal Profile
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('matrix')}
              className={`text-xs transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer underline-offset-4 ${
                activeTab === 'matrix'
                  ? isDark
                    ? 'text-[#facc15] underline font-semibold'
                    : 'text-white underline font-semibold'
                  : isDark
                    ? 'text-[#d4c46a] hover:text-[#facc15] hover:underline font-normal'
                    : 'text-white/75 hover:text-white hover:underline font-normal'
              }`}
            >
              India Matrix
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('compare')}
              className={`text-xs transition-colors duration-200 whitespace-nowrap shrink-0 cursor-pointer underline-offset-4 ${
                activeTab === 'compare'
                  ? isDark
                    ? 'text-[#facc15] underline font-semibold'
                    : 'text-white underline font-semibold'
                  : isDark
                    ? 'text-[#d4c46a] hover:text-[#facc15] hover:underline font-normal'
                    : 'text-white/75 hover:text-white hover:underline font-normal'
              }`}
            >
              Compare Zones
            </button>
          </nav>
        </div>

        {/* Zone 3: Theme Switch + Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-pressed={isDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Black & Yellow Dark Mode'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-[11px] border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isDark
                ? 'bg-[#141414] border-[#facc15]/40 text-[#facc15] hover:bg-[#1f1f1f]'
                : 'bg-white/10 border-white/20 text-white hover:bg-white/18'
            }`}
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <Moon className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">{isDark ? 'Light' : 'Dark'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenMethodology}
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-[15px] py-1.5 text-xs font-medium rounded-[11px] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 ${
              isDark
                ? 'bg-[#facc15] text-black hover:bg-[#eab308] focus-visible:ring-[#facc15]'
                : 'bg-[#0071e3] text-white hover:bg-[#005bb5] active:bg-[#004488] focus-visible:ring-[#2997ff]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Methodology &amp; Blueprint</span>
            <span className="sm:hidden">Guide</span>
          </button>
        </div>
      </div>

      {/* Mobile App Search Strip (< md) */}
      <div
        className={`md:hidden px-3 pb-2 border-t pt-2 ${
          isDark ? 'border-[#facc15]/15' : 'border-white/10'
        }`}
      >
        <IndiaPlaceSearch
          sectors={sectors}
          activeLayer={activeLayer}
          isDark={isDark}
          variant="topbar"
          inputId="app-mobile-search"
          placeholder="Search India cities, sectors, or places..."
          onSelectSector={onSelectSector}
          onSelectGeocodePlace={onSelectGeocodePlace}
        />
      </div>
    </header>
  );
}
