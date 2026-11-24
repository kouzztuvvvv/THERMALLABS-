import { useEffect, useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { ChartOptions } from 'chart.js';
import { ArrowLeftRight, MapPin } from 'lucide-react';
import {
  IndiaSummary,
  LiveEnvironmentData,
  ResolvedIndiaSector,
  formatDiurnalCurve,
} from '../utils/uhiModel';
import {
  computeNeighborhoodComparison,
  pickDefaultComparisonPartner,
} from '../utils/comparisonMetrics';

interface NeighborhoodComparisonViewProps {
  sectors: ResolvedIndiaSector[];
  selectedSector: ResolvedIndiaSector;
  indiaSummary: IndiaSummary;
  envBySectorId: Record<string, LiveEnvironmentData | undefined>;
  isDark: boolean;
  onSelectSector: (sector: ResolvedIndiaSector) => void;
}

export function NeighborhoodComparisonView({
  sectors,
  selectedSector,
  indiaSummary,
  envBySectorId,
  isDark,
  onSelectSector,
}: NeighborhoodComparisonViewProps) {
  const [sectorAId, setSectorAId] = useState<string>(() => selectedSector.id);
  const [sectorBId, setSectorBId] = useState<string>(() => {
    const partner = pickDefaultComparisonPartner(sectors, selectedSector.id);
    return partner?.id ?? selectedSector.id;
  });

  // Ensure A and B stay valid if custom pins or sector lists change
  useEffect(() => {
    if (sectors.length === 0) return;
    if (!sectors.some((s) => s.id === sectorAId)) {
      setSectorAId(selectedSector.id);
    }
    if (!sectors.some((s) => s.id === sectorBId)) {
      const partner = pickDefaultComparisonPartner(sectors, sectorAId);
      if (partner) setSectorBId(partner.id);
    }
  }, [sectors, sectorAId, sectorBId, selectedSector.id]);

  const sectorA = useMemo(
    () => sectors.find((s) => s.id === sectorAId) ?? selectedSector,
    [sectors, sectorAId, selectedSector]
  );

  const sectorB = useMemo(() => {
    const found = sectors.find((s) => s.id === sectorBId);
    if (found) return found;
    return pickDefaultComparisonPartner(sectors, sectorA.id) ?? sectorA;
  }, [sectors, sectorBId, sectorA]);

  const comparison = useMemo(
    () =>
      computeNeighborhoodComparison(
        sectorA,
        sectorB,
        envBySectorId[sectorA.id],
        envBySectorId[sectorB.id]
      ),
    [sectorA, sectorB, envBySectorId]
  );

  const curveA = useMemo(
    () => formatDiurnalCurve(sectorA, indiaSummary.ruralBaselineC),
    [sectorA, indiaSummary.ruralBaselineC]
  );
  const curveB = useMemo(
    () => formatDiurnalCurve(sectorB, indiaSummary.ruralBaselineC),
    [sectorB, indiaSummary.ruralBaselineC]
  );

  const dualChartData = useMemo(
    () => ({
      labels: curveA.map((p) => p.hour),
      datasets: [
        {
          label: `A: ${sectorA.label}`,
          data: curveA.map((p) => p.sectorTempC),
          borderColor: isDark ? '#facc15' : '#0071e3',
          backgroundColor: isDark
            ? 'rgba(250, 204, 21, 0.12)'
            : 'rgba(0, 113, 227, 0.08)',
          borderWidth: 2,
          tension: 0.35,
          fill: false,
          pointRadius: 2.5,
        },
        {
          label: `B: ${sectorB.label}`,
          data: curveB.map((p) => p.sectorTempC),
          borderColor: isDark ? '#38bdf8' : '#0f766e',
          backgroundColor: isDark
            ? 'rgba(56, 189, 248, 0.12)'
            : 'rgba(15, 118, 110, 0.08)',
          borderWidth: 2,
          borderDash: [5, 4],
          tension: 0.35,
          fill: false,
          pointRadius: 2.5,
        },
      ],
    }),
    [curveA, curveB, sectorA.label, sectorB.label, isDark]
  );

  const dualChartOptions = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 160 },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            boxHeight: 2,
            font: { family: 'SF Pro Text, -apple-system, sans-serif', size: 10 },
            color: isDark ? '#fef9c3' : '#1d1d1f',
          },
        },
        tooltip: {
          backgroundColor: isDark ? '#0a0a0a' : '#1d1d1f',
          borderColor: isDark ? '#facc15' : 'transparent',
          borderWidth: isDark ? 1 : 0,
          titleColor: isDark ? '#facc15' : '#ffffff',
          bodyColor: isDark ? '#fef9c3' : '#ffffff',
          titleFont: { family: 'SFMono-Regular, IBM Plex Mono, monospace', size: 10 },
          bodyFont: { family: 'SFMono-Regular, IBM Plex Mono, monospace', size: 10 },
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
            font: { family: 'SFMono-Regular, IBM Plex Mono, monospace', size: 9 },
          },
        },
        y: {
          grid: { color: isDark ? 'rgba(250, 204, 21, 0.14)' : '#e5e5ea' },
          ticks: {
            color: isDark ? '#d4c46a' : '#86868b',
            font: { family: 'SFMono-Regular, IBM Plex Mono, monospace', size: 9 },
            callback: (val) => `${val}°`,
          },
        },
      },
    }),
    [isDark]
  );

  const handleSwap = () => {
    setSectorAId(sectorB.id);
    setSectorBId(sectorA.id);
  };

  const selectClass = `w-full min-w-0 text-xs rounded-[8px] border px-2 py-1 focus-visible:outline-none focus-visible:ring-2 cursor-pointer ${
    isDark
      ? 'bg-[#141414] border-[#facc15]/30 text-[#fef9c3] focus-visible:ring-[#facc15]'
      : 'bg-[#f5f5f7] border-[#d2d2d7] text-[#1d1d1f] focus-visible:ring-[#0071e3]'
  }`;

  return (
    <div
      data-testid="neighborhood-comparison-view"
      className="h-full flex flex-col gap-1.5 min-h-0"
    >
      {/* Selector Row: Pick Neighborhood A & Neighborhood B + Swap */}
      <div className="shrink-0 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 items-center">
        {/* Neighborhood A Selector */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            aria-hidden="true"
            className={`inline-flex items-center justify-center w-5 h-5 rounded-[6px] text-[10px] font-bold shrink-0 ${
              isDark
                ? 'bg-[#facc15] text-black'
                : 'bg-[#0071e3] text-white'
            }`}
          >
            A
          </span>
          <select
            aria-label="Select Neighborhood A to compare"
            value={sectorA.id}
            onChange={(e) => setSectorAId(e.target.value)}
            className={selectClass}
          >
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} · {s.label} ({s.city} · {s.tier})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onSelectSector(sectorA)}
            title={`Locate ${sectorA.label} on map`}
            aria-label={`Locate ${sectorA.label} on map`}
            className={`p-1.5 rounded-[7px] border shrink-0 transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#141414] border-[#facc15]/25 text-[#facc15] hover:bg-[#1f1f1f]'
                : 'bg-[#f5f5f7] border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Swap Button */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={handleSwap}
            aria-label="Swap compared neighborhoods"
            title="Swap Neighborhood A and B"
            className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded-[7px] border transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#141414] border-[#facc15]/30 text-[#facc15] hover:bg-[#1f1f1f]'
                : 'bg-[#f5f5f7] border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="sm:hidden">Swap</span>
          </button>
        </div>

        {/* Neighborhood B Selector */}
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            aria-hidden="true"
            className={`inline-flex items-center justify-center w-5 h-5 rounded-[6px] text-[10px] font-bold shrink-0 ${
              isDark
                ? 'bg-[#38bdf8] text-black'
                : 'bg-[#0f766e] text-white'
            }`}
          >
            B
          </span>
          <select
            aria-label="Select Neighborhood B to compare"
            value={sectorB.id}
            onChange={(e) => setSectorBId(e.target.value)}
            className={selectClass}
          >
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} · {s.label} ({s.city} · {s.tier})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onSelectSector(sectorB)}
            title={`Locate ${sectorB.label} on map`}
            aria-label={`Locate ${sectorB.label} on map`}
            className={`p-1.5 rounded-[7px] border shrink-0 transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#141414] border-[#facc15]/25 text-[#38bdf8] hover:bg-[#1f1f1f]'
                : 'bg-[#f5f5f7] border-[#d2d2d7] text-[#0f766e] hover:bg-[#e8e8ed]'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Side-by-Side Comparison Metrics Table + Simultaneous 24h Curve */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* Metrics Matrix (7 cols) */}
        <div
          className={`lg:col-span-7 min-h-0 overflow-auto border rounded-[8px] ${
            isDark ? 'border-[#facc15]/25' : 'border-[#d2d2d7]/80'
          }`}
        >
          <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
            <thead
              className={`sticky top-0 border-b text-[10.5px] ${
                isDark
                  ? 'bg-[#141414] border-[#facc15]/25 text-[#d4c46a]'
                  : 'bg-[#f5f5f7] border-[#d2d2d7] text-[#6e6e73]'
              }`}
            >
              <tr>
                <th className="py-1 px-2.5 font-semibold">Climate Metric</th>
                <th className="py-1 px-2.5 font-semibold text-right">
                  <span
                    className={
                      isDark ? 'text-[#facc15]' : 'text-[#0071e3]'
                    }
                  >
                    A · {sectorA.label}
                  </span>
                </th>
                <th className="py-1 px-2.5 font-semibold text-right">
                  <span
                    className={
                      isDark ? 'text-[#38bdf8]' : 'text-[#0f766e]'
                    }
                  >
                    B · {sectorB.label}
                  </span>
                </th>
                <th className="py-1 px-2.5 font-semibold text-right whitespace-nowrap">
                  Δ (A − B)
                </th>
              </tr>
            </thead>
            <tbody
              className={`divide-y ${
                isDark ? 'divide-[#facc15]/15' : 'divide-[#d2d2d7]/45'
              }`}
            >
              {comparison.rows.map((row) => (
                <tr
                  key={row.id}
                  className={
                    isDark ? 'hover:bg-[#141414]/70' : 'hover:bg-[#f5f5f7]/70'
                  }
                >
                  <td
                    className={`py-[3px] px-2.5 font-medium whitespace-nowrap ${
                      isDark ? 'text-[#fef9c3]' : 'text-[#1d1d1f]'
                    }`}
                  >
                    {row.label}
                  </td>
                  <td
                    className={`py-[3px] px-2.5 text-right font-mono tabular-nums whitespace-nowrap ${
                      row.favored === 'A'
                        ? isDark
                          ? 'text-[#facc15] font-semibold'
                          : 'text-emerald-700 font-semibold'
                        : ''
                    }`}
                  >
                    <span>{row.valueA}</span>
                    {row.subA && (
                      <span
                        className={`ml-1 text-[10px] font-sans font-normal ${
                          isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                        }`}
                      >
                        ({row.subA})
                      </span>
                    )}
                  </td>
                  <td
                    className={`py-[3px] px-2.5 text-right font-mono tabular-nums whitespace-nowrap ${
                      row.favored === 'B'
                        ? isDark
                          ? 'text-[#38bdf8] font-semibold'
                          : 'text-emerald-700 font-semibold'
                        : ''
                    }`}
                  >
                    <span>{row.valueB}</span>
                    {row.subB && (
                      <span
                        className={`ml-1 text-[10px] font-sans font-normal ${
                          isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                        }`}
                      >
                        ({row.subB})
                      </span>
                    )}
                  </td>
                  <td
                    className={`py-[3px] px-2.5 text-right font-mono tabular-nums whitespace-nowrap text-[10.5px] ${
                      isDark ? 'text-[#d4c46a]' : 'text-[#6e6e73]'
                    }`}
                  >
                    {row.deltaFormatted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Simultaneous 24h Diurnal Curve + Headline Insight (5 cols) */}
        <div
          className={`lg:col-span-5 flex flex-col min-h-[140px] border rounded-[8px] px-2.5 py-1.5 ${
            isDark
              ? 'bg-[#0a0a0a] border-[#facc15]/20'
              : 'bg-[#fbfbfd] border-[#d2d2d7]/70'
          }`}
        >
          <div className="shrink-0 flex items-center justify-between gap-2 text-[10.5px]">
            <span
              className={`font-semibold truncate ${
                isDark ? 'text-[#facc15]' : 'text-[#1d1d1f]'
              }`}
            >
              {comparison.headlineSummary}
            </span>
            <span
              className={`font-mono tabular-nums shrink-0 ${
                isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
              }`}
            >
              24h LST
            </span>
          </div>
          <div className="flex-1 min-h-[105px] relative mt-0.5">
            <Line data={dualChartData} options={dualChartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
