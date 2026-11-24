import { useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Scatter, Line } from 'react-chartjs-2';
import { ArrowUpDown } from 'lucide-react';
import {
  IndiaSummary,
  LiveEnvironmentData,
  ResolvedIndiaSector,
  SortOption,
  computeVulnerabilityIndex,
  formatDiurnalCurve,
  getSectorFillColor,
  resolveIndianAqi,
} from '../utils/uhiModel';
import { AnalyticsTab } from './TopBar';
import { NeighborhoodComparisonView } from './NeighborhoodComparisonView';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

interface AnalyticsPanelProps {
  sectors: ResolvedIndiaSector[];
  allSectors?: ResolvedIndiaSector[];
  selectedSector: ResolvedIndiaSector;
  indiaSummary: IndiaSummary;
  activeTab: AnalyticsTab;
  sortOption: SortOption;
  envBySectorId: Record<string, LiveEnvironmentData | undefined>;
  isDark: boolean;
  onSelectTab: (tab: AnalyticsTab) => void;
  onSelectSector: (sector: ResolvedIndiaSector) => void;
}

type SortKey =
  | 'label'
  | 'city'
  | 'tier'
  | 'naqi'
  | 'liveAirTemp'
  | 'avgSurfaceTempC'
  | 'tempAnomalyC'
  | 'greenCanopyPct'
  | 'imperviousPct'
  | 'albedoIndex'
  | 'vulnerability';

export function AnalyticsPanel({
  sectors,
  allSectors,
  selectedSector,
  indiaSummary,
  activeTab,
  sortOption,
  envBySectorId,
  isDark,
  onSelectTab,
  onSelectSector,
}: AnalyticsPanelProps) {
  const [sortKey, setSortKey] = useState<SortKey>('tempAnomalyC');
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (sortOption === 'aqi-desc') {
      setSortKey('naqi');
      setSortAsc(false);
    } else if (sortOption === 'aqi-asc') {
      setSortKey('naqi');
      setSortAsc(true);
    } else if (sortOption === 'temp-desc') {
      setSortKey('avgSurfaceTempC');
      setSortAsc(false);
    } else if (sortOption === 'temp-asc') {
      setSortKey('avgSurfaceTempC');
      setSortAsc(true);
    } else if (sortOption === 'air-temp-desc') {
      setSortKey('liveAirTemp');
      setSortAsc(false);
    } else if (sortOption === 'air-temp-asc') {
      setSortKey('liveAirTemp');
      setSortAsc(true);
    }
  }, [sortOption]);

  const otherSectors = useMemo(
    () => sectors.filter((s) => s.id !== selectedSector.id),
    [sectors, selectedSector.id]
  );

  const regressionLinePoints = useMemo(() => {
    const { slope, intercept } = indiaSummary.regression;
    return [
      { x: 0, y: Number(intercept.toFixed(2)) },
      { x: 85, y: Number((slope * 85 + intercept).toFixed(2)) },
    ];
  }, [indiaSummary.regression]);

  const scatterData = useMemo(
    () => ({
      datasets: [
        {
          label: 'India Sectors',
          data: otherSectors.map((s) => ({
            x: s.greenCanopyPct,
            y: s.tempAnomalyC,
            sector: s,
          })),
          backgroundColor: otherSectors.map((s) =>
            getSectorFillColor(s, 'temperature')
          ),
          borderColor: isDark ? '#fef08a' : '#334155',
          borderWidth: 1,
          pointRadius: 5.5,
          pointHoverRadius: 7.5,
        },
        {
          label: `Selected: ${selectedSector.label}`,
          data: [
            {
              x: selectedSector.greenCanopyPct,
              y: selectedSector.tempAnomalyC,
              sector: selectedSector,
            },
          ],
          backgroundColor: getSectorFillColor(selectedSector, 'temperature'),
          borderColor: isDark ? '#facc15' : '#0071e3',
          borderWidth: 2.5,
          pointRadius: 8.5,
          pointHoverRadius: 10.5,
        },
        {
          label: 'OLS Linear Fit',
          data: regressionLinePoints,
          showLine: true,
          fill: false,
          borderColor: isDark ? '#facc15' : '#1d1d1f',
          borderWidth: 1.5,
          borderDash: [5, 4],
          pointRadius: 0,
          pointHoverRadius: 0,
        },
      ],
    }),
    [otherSectors, selectedSector, regressionLinePoints, isDark]
  );

  const scatterOptions = useMemo<ChartOptions<'scatter'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 180 },
      onClick: (_event, elements) => {
        if (!elements || elements.length === 0) return;
        const first = elements[0];
        if (first.datasetIndex === 0) {
          const picked = otherSectors[first.index];
          if (picked) onSelectSector(picked);
        }
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            font: { family: 'SF Pro Text, -apple-system, sans-serif', size: 11 },
            color: isDark ? '#d4c46a' : '#86868b',
          },
        },
        tooltip: {
          backgroundColor: isDark ? '#0a0a0a' : '#1d1d1f',
          borderColor: isDark ? '#facc15' : 'transparent',
          borderWidth: isDark ? 1 : 0,
          titleColor: isDark ? '#facc15' : '#ffffff',
          bodyColor: isDark ? '#fef9c3' : '#ffffff',
          titleFont: { family: 'SF Pro Text, -apple-system, sans-serif', size: 12 },
          bodyFont: { family: 'SFMono-Regular, IBM Plex Mono, monospace', size: 11 },
          padding: 10,
          callbacks: {
            title: (items) => {
              const raw = items[0]?.raw as { sector?: ResolvedIndiaSector };
              return raw?.sector
                ? `${raw.sector.code} · ${raw.sector.label} (${raw.sector.city})`
                : 'OLS Trendline';
            },
            label: (item) => {
              const raw = item.raw as {
                x: number;
                y: number;
                sector?: ResolvedIndiaSector;
              };
              if (!raw.sector) {
                return `Predicted ΔT: ${raw.y > 0 ? '+' : ''}${raw.y.toFixed(2)} °C`;
              }
              return [
                `Canopy Cover: ${raw.x.toFixed(1)}%`,
                `Temp Anomaly: ${raw.y > 0 ? '+' : ''}${raw.y.toFixed(1)} °C (${raw.sector.avgSurfaceTempC.toFixed(1)} °C)`,
                `Impervious: ${raw.sector.imperviousPct.toFixed(1)}%`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          min: 0,
          max: 90,
          title: {
            display: true,
            text: 'Green Canopy Coverage (%)',
            color: isDark ? '#fef9c3' : '#1d1d1f',
            font: { family: 'SF Pro Text, -apple-system, sans-serif', size: 11, weight: 600 },
          },
          grid: { color: isDark ? 'rgba(250, 204, 21, 0.14)' : '#e5e5ea' },
          ticks: {
            color: isDark ? '#d4c46a' : '#86868b',
            font: { family: 'SFMono-Regular, IBM Plex Mono, monospace', size: 10 },
          },
        },
        y: {
          min: -4,
          max: 8,
          title: {
            display: true,
            text: 'Temp Anomaly (°C)',
            color: isDark ? '#fef9c3' : '#1d1d1f',
            font: { family: 'SF Pro Text, -apple-system, sans-serif', size: 11, weight: 600 },
          },
          grid: { color: isDark ? 'rgba(250, 204, 21, 0.14)' : '#e5e5ea' },
          ticks: {
            color: isDark ? '#d4c46a' : '#86868b',
            font: { family: 'SFMono-Regular, IBM Plex Mono, monospace', size: 10 },
            callback: (val) => `${Number(val) > 0 ? '+' : ''}${val}°`,
          },
        },
      },
    }),
    [otherSectors, onSelectSector, isDark]
  );

  const diurnalPoints = useMemo(
    () => formatDiurnalCurve(selectedSector, indiaSummary.ruralBaselineC),
    [selectedSector, indiaSummary.ruralBaselineC]
  );

  const diurnalData = useMemo(
    () => ({
      labels: diurnalPoints.map((p) => p.hour),
      datasets: [
        {
          label: `${selectedSector.label} (LST)`,
          data: diurnalPoints.map((p) => p.sectorTempC),
          borderColor: isDark
            ? '#facc15'
            : selectedSector.tempAnomalyC >= 0
              ? '#b84a39'
              : '#3b6e8c',
          backgroundColor: isDark
            ? 'rgba(250, 204, 21, 0.12)'
            : selectedSector.tempAnomalyC >= 0
              ? 'rgba(184, 74, 57, 0.08)'
              : 'rgba(59, 110, 140, 0.08)',
          borderWidth: 2.2,
          tension: 0.35,
          fill: true,
          pointRadius: 3.5,
        },
        {
          label: `India Rural Baseline (${indiaSummary.ruralBaselineC.toFixed(1)} °C Peak)`,
          data: diurnalPoints.map((p) => p.baselineTempC),
          borderColor: isDark ? '#d4c46a' : '#64748b',
          borderWidth: 1.5,
          borderDash: [5, 4],
          tension: 0.35,
          fill: false,
          pointRadius: 0,
        },
        {
          label: 'National Park / Forest Sink',
          data: diurnalPoints.map((p) => p.parkReferenceTempC),
          borderColor: isDark ? '#fef08a' : '#3d6e59',
          borderWidth: 1.5,
          borderDash: [2, 3],
          tension: 0.35,
          fill: false,
          pointRadius: 0,
        },
      ],
    }),
    [
      diurnalPoints,
      selectedSector.label,
      selectedSector.tempAnomalyC,
      indiaSummary.ruralBaselineC,
      isDark,
    ]
  );

  const diurnalOptions = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 180 },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            boxHeight: 2,
            font: { family: 'SF Pro Text, -apple-system, sans-serif', size: 11 },
            color: isDark ? '#d4c46a' : '#86868b',
          },
        },
        tooltip: {
          backgroundColor: isDark ? '#0a0a0a' : '#1d1d1f',
          borderColor: isDark ? '#facc15' : 'transparent',
          borderWidth: isDark ? 1 : 0,
          titleColor: isDark ? '#facc15' : '#ffffff',
          bodyColor: isDark ? '#fef9c3' : '#ffffff',
          titleFont: { family: 'SFMono-Regular, IBM Plex Mono, monospace', size: 11 },
          bodyFont: { family: 'SFMono-Regular, IBM Plex Mono, monospace', size: 11 },
          callbacks: {
            label: (ctx) =>
              `${ctx.dataset.label}: ${Number(ctx.parsed.y).toFixed(1)} °C`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: isDark ? 'rgba(250, 204, 21, 0.08)' : '#f5f5f7' },
          ticks: {
            color: isDark ? '#d4c46a' : '#86868b',
            font: { family: 'SFMono-Regular, IBM Plex Mono, monospace', size: 10 },
          },
        },
        y: {
          title: {
            display: true,
            text: 'Surface Temp (°C)',
            color: isDark ? '#fef9c3' : '#1d1d1f',
            font: { family: 'SF Pro Text, -apple-system, sans-serif', size: 11, weight: 600 },
          },
          grid: { color: isDark ? 'rgba(250, 204, 21, 0.14)' : '#e5e5ea' },
          ticks: {
            color: isDark ? '#d4c46a' : '#86868b',
            font: { family: 'SFMono-Regular, IBM Plex Mono, monospace', size: 10 },
            callback: (val) => `${val}°`,
          },
        },
      },
    }),
    [isDark]
  );

  const sortedSectors = useMemo(() => {
    const copy = [...sectors];
    copy.sort((a, b) => {
      let av: number | string | null = 0;
      let bv: number | string | null = 0;
      if (sortKey === 'label') {
        av = a.label;
        bv = b.label;
      } else if (sortKey === 'city') {
        av = a.city;
        bv = b.city;
      } else if (sortKey === 'tier') {
        av = a.tier;
        bv = b.tier;
      } else if (sortKey === 'naqi') {
        av = resolveIndianAqi(envBySectorId[a.id])?.aqi ?? null;
        bv = resolveIndianAqi(envBySectorId[b.id])?.aqi ?? null;
      } else if (sortKey === 'liveAirTemp') {
        av = envBySectorId[a.id]?.weather?.available
          ? envBySectorId[a.id]?.weather?.temperatureC ?? null
          : null;
        bv = envBySectorId[b.id]?.weather?.available
          ? envBySectorId[b.id]?.weather?.temperatureC ?? null
          : null;
      } else if (sortKey === 'vulnerability') {
        av = computeVulnerabilityIndex(a).score;
        bv = computeVulnerabilityIndex(b).score;
      } else {
        av = a[sortKey];
        bv = b[sortKey];
      }

      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;

      if (typeof av === 'string' && typeof bv === 'string') {
        return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortAsc ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
    return copy;
  }, [sectors, sortKey, sortAsc, envBySectorId]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(key === 'label' || key === 'city' || key === 'tier');
    }
  };

  const predictedAnomaly =
    indiaSummary.regression.slope * selectedSector.greenCanopyPct +
    indiaSummary.regression.intercept;
  const residual = selectedSector.tempAnomalyC - predictedAnomaly;

  const eveningPoint = diurnalPoints.find((p) => p.hour === '21:00');
  const nocturnalGap = eveningPoint
    ? (eveningPoint.sectorTempC - eveningPoint.parkReferenceTempC).toFixed(1)
    : '0.0';

  return (
    <section
      aria-label="Comparative Microclimate Analytics"
      className={`border-t lg:border-t-0 shrink-0 flex flex-col transition-colors ${
        activeTab === 'compare'
          ? 'min-h-[296px] lg:min-h-0 lg:h-auto'
          : 'h-[256px] lg:h-auto'
      } ${
        isDark
          ? 'bg-[#0a0a0a] border-[#facc15]/25 text-[#fef9c3]'
          : 'bg-white border-[#d2d2d7] text-[#1d1d1f]'
      }`}
    >
      {/* Analytics Sub-Header & Segmented Tabs */}
      <div
        className={`px-3 sm:px-5 lg:px-4 py-1.5 lg:py-2.5 border-b flex items-center justify-between gap-3 lg:flex-col lg:items-stretch lg:gap-2 shrink-0 ${
          isDark ? 'border-[#facc15]/20' : 'border-[#d2d2d7]/70'
        }`}
      >
        <div
          role="tablist"
          aria-label="Analytics charts"
          className={`inline-flex items-center gap-1 p-1 rounded-[10px] max-w-full overflow-x-auto ${
            isDark ? 'bg-[#141414]' : 'bg-[#f5f5f7]'
          }`}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'regression'}
            onClick={() => onSelectTab('regression')}
            className={`px-3 py-1 text-xs font-medium rounded-[8px] transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'regression'
                ? isDark
                  ? 'bg-[#facc15] text-black shadow-xs font-semibold'
                  : 'bg-white text-[#1d1d1f] shadow-xs'
                : isDark
                  ? 'text-[#d4c46a] hover:text-[#fef9c3]'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Canopy vs. Temp Regression
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'diurnal'}
            onClick={() => onSelectTab('diurnal')}
            className={`px-3 py-1 text-xs font-medium rounded-[8px] transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'diurnal'
                ? isDark
                  ? 'bg-[#facc15] text-black shadow-xs font-semibold'
                  : 'bg-white text-[#1d1d1f] shadow-xs'
                : isDark
                  ? 'text-[#d4c46a] hover:text-[#fef9c3]'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            24h Diurnal Profile (IST)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'matrix'}
            onClick={() => onSelectTab('matrix')}
            className={`px-3 py-1 text-xs font-medium rounded-[8px] transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'matrix'
                ? isDark
                  ? 'bg-[#facc15] text-black shadow-xs font-semibold'
                  : 'bg-white text-[#1d1d1f] shadow-xs'
                : isDark
                  ? 'text-[#d4c46a] hover:text-[#fef9c3]'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            India Sector Matrix ({sectors.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'compare'}
            onClick={() => onSelectTab('compare')}
            className={`px-3 py-1 text-xs font-medium rounded-[8px] transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'compare'
                ? isDark
                  ? 'bg-[#facc15] text-black shadow-xs font-semibold'
                  : 'bg-white text-[#1d1d1f] shadow-xs'
                : isDark
                  ? 'text-[#d4c46a] hover:text-[#fef9c3]'
                  : 'text-[#86868b] hover:text-[#1d1d1f]'
            }`}
          >
            Side-by-Side Compare
          </button>
        </div>

        {/* Regional Statistical Summary Strip */}
        <div
          className={`hidden lg:flex lg:flex-wrap lg:items-center lg:justify-between gap-x-3 gap-y-1 text-[11px] shrink-0 lg:pt-1.5 lg:border-t ${
            isDark ? 'lg:border-[#facc15]/15' : 'lg:border-[#d2d2d7]/50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className={isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'}>
              India Mean LST:
            </span>
            <span className="font-mono tabular-nums font-semibold">
              {indiaSummary.meanSurfaceTempC.toFixed(1)} °C
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'}>
              Peak UHI ΔT:
            </span>
            <span
              className={`font-mono tabular-nums font-semibold ${
                isDark ? 'text-[#facc15]' : 'text-red-800'
              }`}
            >
              +{indiaSummary.maxAnomalyC.toFixed(1)} °C
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'}>
              Canopy Cooling:
            </span>
            <span className="font-mono tabular-nums font-semibold">
              {indiaSummary.regression.slope.toFixed(3)} °C/% (R²=
              {indiaSummary.regression.rSquared.toFixed(2)})
            </span>
          </div>
        </div>
      </div>

      {/* Panel Body */}
      <div
        className={`flex-1 min-h-0 px-3 sm:px-5 lg:px-4 py-2 lg:py-3 ${
          activeTab === 'compare'
            ? 'overflow-visible'
            : 'overflow-hidden lg:overflow-visible'
        }`}
      >
        {activeTab === 'regression' && (
          <div className="h-full lg:h-auto w-full min-w-0 grid grid-cols-1 gap-5 lg:gap-4 items-stretch">
            <div className="h-full lg:h-[230px] min-h-[160px] min-w-0 relative">
              <Scatter data={scatterData} options={scatterOptions} />
            </div>
            <div
              className={`hidden lg:flex flex-col justify-between gap-3 border-t pt-3 text-xs ${
                isDark ? 'border-[#facc15]/20' : 'border-[#d2d2d7]/70'
              }`}
            >
              <div>
                <p
                  className={`text-[11px] font-mono font-medium ${
                    isDark ? 'text-[#facc15]' : 'text-[#0071e3]'
                  }`}
                >
                  Pan-India Cooling Correlation
                </p>
                <h3 className="text-sm font-semibold mt-0.5">
                  Urban Forest &amp; Canopy Mitigation
                </h3>
                <p
                  className={`text-xs mt-1.5 leading-relaxed ${
                    isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                  }`}
                >
                  Across India’s 6 macro-regions, every{' '}
                  <span
                    className={`font-mono font-medium ${
                      isDark ? 'text-[#fef9c3]' : 'text-[#1d1d1f]'
                    }`}
                  >
                    +10%
                  </span>{' '}
                  tree canopy gain reduces peak LST by{' '}
                  <span
                    className={`font-mono font-semibold ${
                      isDark ? 'text-[#facc15]' : 'text-[#1d1d1f]'
                    }`}
                  >
                    {Math.abs(indiaSummary.regression.slope * 10).toFixed(2)} °C
                  </span>
                  .
                </p>
              </div>
              <dl
                className={`grid grid-cols-2 gap-3 pt-2.5 border-t ${
                  isDark ? 'border-[#facc15]/20' : 'border-[#d2d2d7]/70'
                }`}
              >
                <div>
                  <dt
                    className={`text-[11px] ${
                      isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                    }`}
                  >
                    Selected Residual
                  </dt>
                  <dd className="font-mono tabular-nums font-semibold mt-0.5">
                    {residual > 0 ? '+' : ''}
                    {residual.toFixed(2)} °C vs. fit
                  </dd>
                </div>
                <div>
                  <dt
                    className={`text-[11px] ${
                      isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                    }`}
                  >
                    Fit Strength (R²)
                  </dt>
                  <dd className="font-mono tabular-nums font-semibold mt-0.5">
                    {indiaSummary.regression.rSquared.toFixed(3)}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {activeTab === 'diurnal' && (
          <div className="h-full lg:h-auto w-full min-w-0 grid grid-cols-1 gap-5 lg:gap-4 items-stretch">
            <div className="h-full lg:h-[230px] min-h-[160px] min-w-0 relative">
              <Line data={diurnalData} options={diurnalOptions} />
            </div>
            <div
              className={`hidden lg:flex flex-col justify-between gap-3 border-t pt-3 text-xs ${
                isDark ? 'border-[#facc15]/20' : 'border-[#d2d2d7]/70'
              }`}
            >
              <div>
                <p
                  className={`text-[11px] font-mono font-medium ${
                    isDark ? 'text-[#facc15]' : 'text-[#0071e3]'
                  }`}
                >
                  Nocturnal Thermal Inertia
                </p>
                <h3 className="text-sm font-semibold mt-0.5">
                  {selectedSector.label} · 24h Curve
                </h3>
                <p
                  className={`text-xs mt-1.5 leading-relaxed ${
                    isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                  }`}
                >
                  Impervious ground cover ({selectedSector.imperviousPct.toFixed(0)}%)
                  releases stored shortwave radiation slowly after dusk, keeping night
                  temperatures above forested &amp; watershed sinks.
                </p>
              </div>
              <dl
                className={`grid grid-cols-2 gap-3 pt-2.5 border-t ${
                  isDark ? 'border-[#facc15]/20' : 'border-[#d2d2d7]/70'
                }`}
              >
                <div>
                  <dt
                    className={`text-[11px] ${
                      isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                    }`}
                  >
                    21:00 Park Delta
                  </dt>
                  <dd className="font-mono tabular-nums font-semibold mt-0.5">
                    +{nocturnalGap} °C
                  </dd>
                </div>
                <div>
                  <dt
                    className={`text-[11px] ${
                      isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                    }`}
                  >
                    Surface Albedo
                  </dt>
                  <dd className="font-mono tabular-nums font-semibold mt-0.5">
                    {selectedSector.albedoIndex.toFixed(2)} α
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {activeTab === 'matrix' && (
          <div
            className={`h-full lg:h-auto lg:max-h-[360px] overflow-auto border rounded-[8px] ${
              isDark ? 'border-[#facc15]/25' : 'border-[#d2d2d7]/80'
            }`}
          >
            <table className="w-full text-left border-collapse text-xs">
              <thead
                className={`border-b sticky top-0 text-[11px] ${
                  isDark
                    ? 'bg-[#141414] border-[#facc15]/25 text-[#d4c46a]'
                    : 'bg-[#f5f5f7] border-[#d2d2d7] text-[#86868b]'
                }`}
              >
                <tr>
                  <th className="py-2 px-3 font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleSort('label')}
                      className={`inline-flex items-center gap-1 cursor-pointer ${
                        isDark ? 'hover:text-[#facc15]' : 'hover:text-[#1d1d1f]'
                      }`}
                    >
                      <span>Locality</span>
                      <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="py-2 px-3 font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleSort('city')}
                      className={`inline-flex items-center gap-1 cursor-pointer ${
                        isDark ? 'hover:text-[#facc15]' : 'hover:text-[#1d1d1f]'
                      }`}
                    >
                      <span>City</span>
                      <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="py-2 px-3 font-semibold">
                    <button
                      type="button"
                      onClick={() => toggleSort('tier')}
                      className={`inline-flex items-center gap-1 cursor-pointer ${
                        isDark ? 'hover:text-[#facc15]' : 'hover:text-[#1d1d1f]'
                      }`}
                    >
                      <span>Tier</span>
                      <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="py-2 px-3 font-semibold text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('naqi')}
                      className={`inline-flex items-center gap-1 cursor-pointer ${
                        isDark ? 'hover:text-[#facc15]' : 'hover:text-[#1d1d1f]'
                      }`}
                    >
                      <span>NAQI (IN)</span>
                      <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="py-2 px-3 font-semibold text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('liveAirTemp')}
                      className={`inline-flex items-center gap-1 cursor-pointer ${
                        isDark ? 'hover:text-[#facc15]' : 'hover:text-[#1d1d1f]'
                      }`}
                    >
                      <span>Air (°C)</span>
                      <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="py-2 px-3 font-semibold text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('avgSurfaceTempC')}
                      className={`inline-flex items-center gap-1 cursor-pointer ${
                        isDark ? 'hover:text-[#facc15]' : 'hover:text-[#1d1d1f]'
                      }`}
                    >
                      <span>LST (°C)</span>
                      <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="py-2 px-3 font-semibold text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('tempAnomalyC')}
                      className={`inline-flex items-center gap-1 cursor-pointer ${
                        isDark ? 'hover:text-[#facc15]' : 'hover:text-[#1d1d1f]'
                      }`}
                    >
                      <span>Anomaly</span>
                      <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="py-2 px-3 font-semibold text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('greenCanopyPct')}
                      className={`inline-flex items-center gap-1 cursor-pointer ${
                        isDark ? 'hover:text-[#facc15]' : 'hover:text-[#1d1d1f]'
                      }`}
                    >
                      <span>Canopy</span>
                      <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="py-2 px-3 font-semibold text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('imperviousPct')}
                      className={`inline-flex items-center gap-1 cursor-pointer ${
                        isDark ? 'hover:text-[#facc15]' : 'hover:text-[#1d1d1f]'
                      }`}
                    >
                      <span>Impervious</span>
                      <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="py-2 px-3 font-semibold text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('albedoIndex')}
                      className={`inline-flex items-center gap-1 cursor-pointer ${
                        isDark ? 'hover:text-[#facc15]' : 'hover:text-[#1d1d1f]'
                      }`}
                    >
                      <span>Albedo</span>
                      <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </th>
                  <th className="py-2 px-3 font-semibold text-right">
                    <button
                      type="button"
                      onClick={() => toggleSort('vulnerability')}
                      className={`inline-flex items-center gap-1 cursor-pointer ${
                        isDark ? 'hover:text-[#facc15]' : 'hover:text-[#1d1d1f]'
                      }`}
                    >
                      <span>Vulnerability</span>
                      <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${
                  isDark ? 'divide-[#facc15]/15' : 'divide-[#d2d2d7]/40'
                }`}
              >
                {sortedSectors.map((sector) => {
                  const isSelected = sector.id === selectedSector.id;
                  const vuln = computeVulnerabilityIndex(sector);
                  const env = envBySectorId[sector.id];
                  const indianAqi = resolveIndianAqi(env);
                  const liveAir = env?.weather?.available
                    ? env.weather.temperatureC
                    : null;
                  return (
                    <tr
                      key={sector.id}
                      onClick={() => onSelectSector(sector)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? isDark
                            ? 'bg-[#facc15]/15 font-medium'
                            : 'bg-[#0071e3]/[0.08] font-medium'
                          : isDark
                            ? 'hover:bg-[#141414]'
                            : 'hover:bg-[#f5f5f7]'
                      }`}
                    >
                      <td className="py-1.5 px-3 whitespace-nowrap">
                        <span
                          className={`font-mono text-[11px] mr-2 ${
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
                        {sector.label}
                      </td>
                      <td
                        className={`py-1.5 px-3 whitespace-nowrap ${
                          isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                        }`}
                      >
                        {sector.city}, {sector.state}
                      </td>
                      <td
                        className={`py-1.5 px-3 whitespace-nowrap font-mono text-[11px] ${
                          isDark ? 'text-[#facc15]' : 'text-[#1d1d1f]'
                        }`}
                      >
                        {sector.tier}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        {indianAqi ? (
                          <span title={indianAqi.category}>
                            {indianAqi.aqi}
                          </span>
                        ) : (
                          <span className={isDark ? 'text-[#d4c46a]/60' : 'text-[#86868b]'}>
                            —
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                        {liveAir != null ? `${liveAir.toFixed(1)}°` : '—'}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums">
                        {sector.avgSurfaceTempC.toFixed(1)}°
                      </td>
                      <td
                        className={`py-1.5 px-3 text-right font-mono tabular-nums ${
                          isDark
                            ? 'text-[#facc15]'
                            : sector.tempAnomalyC > 0
                              ? 'text-red-800'
                              : 'text-sky-700'
                        }`}
                      >
                        {sector.tempAnomalyC > 0 ? '+' : ''}
                        {sector.tempAnomalyC.toFixed(1)}°
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums">
                        {sector.greenCanopyPct.toFixed(1)}%
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums">
                        {sector.imperviousPct.toFixed(1)}%
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums">
                        {sector.albedoIndex.toFixed(2)}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono tabular-nums">
                        {vuln.score} ({vuln.tier})
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'compare' && (
          <NeighborhoodComparisonView
            sectors={allSectors && allSectors.length > 0 ? allSectors : sectors}
            selectedSector={selectedSector}
            indiaSummary={indiaSummary}
            envBySectorId={envBySectorId}
            isDark={isDark}
            onSelectSector={onSelectSector}
          />
        )}
      </div>
    </section>
  );
}
