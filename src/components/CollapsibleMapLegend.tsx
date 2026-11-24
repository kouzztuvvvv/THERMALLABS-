import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { LAYER_SCALES, MapLayer } from '../utils/uhiModel';
import { getLegendSpec, LEGEND_TAB_ORDER } from '../utils/legendSpecs';

interface CollapsibleMapLegendProps {
  activeLayer: MapLayer;
  isDark: boolean;
  onSelectLayer: (layer: MapLayer) => void;
}

function getInitialLegendExpanded(): boolean {
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return false;
  }
  return true;
}

export function CollapsibleMapLegend({
  activeLayer,
  isDark,
  onSelectLayer,
}: CollapsibleMapLegendProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(getInitialLegendExpanded);
  const spec = getLegendSpec(activeLayer);
  const scaleInfo = LAYER_SCALES[activeLayer];

  const cardSurface = isDark
    ? 'bg-[#0a0a0a]/94 border-[#facc15]/35 shadow-[0_6px_24px_rgba(0,0,0,0.72)]'
    : 'bg-white/95 border-[#d2d2d7]/90 shadow-[0_6px_24px_rgba(0,0,0,0.12)]';

  const primaryText = isDark ? 'text-[#fef9c3]' : 'text-[#1d1d1f]';
  const secondaryText = isDark ? 'text-[#d4c46a]' : 'text-[#6e6e73]';
  const dividerBorder = isDark ? 'border-[#facc15]/20' : 'border-[#d2d2d7]/75';

  return (
    <aside
      aria-label="Scientific map color legend"
      data-testid="collapsible-map-legend"
      data-expanded={isExpanded}
      className={`absolute bottom-6 left-2.5 sm:left-3 max-h-[calc(100%-34px)] flex flex-col overflow-hidden ${
        isExpanded ? 'z-30 w-[calc(100vw-20px)] max-w-[310px]' : 'z-20 w-[166px] sm:w-[244px]'
      } backdrop-blur-xl border rounded-[11px] font-sans transition-all duration-200 ${cardSurface}`}
    >
      {/* Always-visible Header + Gradient Summary + Collapse/Expand Toggle */}
      <div className="shrink-0 px-2.5 py-2 sm:px-3 sm:py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex items-center gap-1.5">
            <Info
              className={`w-3.5 h-3.5 shrink-0 ${
                isDark ? 'text-[#facc15]' : 'text-[#0071e3]'
              }`}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span
                  className={`text-[11px] sm:text-xs font-semibold tracking-tight truncate ${primaryText}`}
                >
                  {isExpanded ? spec.title : scaleInfo.label}
                </span>
              </div>
              {!isExpanded && (
                <span
                  className={`hidden sm:block text-[9.5px] font-normal tracking-tight truncate ${secondaryText}`}
                >
                  {scaleInfo.unit}
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            aria-controls="uhi-map-legend-panel"
            aria-label={
              isExpanded ? 'Collapse map legend' : 'Expand map legend'
            }
            className={`inline-flex items-center gap-1 px-1.5 py-1 text-[10px] sm:text-[11px] font-medium rounded-[7px] border shrink-0 transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#141414] border-[#facc15]/30 text-[#facc15] hover:bg-[#1f1f1f]'
                : 'bg-[#f5f5f7] border-[#d2d2d7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
            }`}
          >
            <span>{isExpanded ? 'Hide' : 'Key'}</span>
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" aria-hidden="true" />
            ) : (
              <ChevronUp className="w-3 h-3" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Continuous Color Scale Bar */}
        <div
          className={`h-1.5 w-full rounded-full mt-1.5 border ${
            isDark ? 'border-[#facc15]/25' : 'border-[#d2d2d7]/70'
          }`}
          style={{ background: spec.gradientCss }}
          aria-hidden="true"
        />
        <div
          className={`flex items-center justify-between gap-1 mt-1 text-[9px] sm:text-[10px] font-medium tabular-nums tracking-tight ${secondaryText}`}
        >
          <span>{spec.minLabel}</span>
          <span className={isExpanded ? 'inline' : 'hidden sm:inline'}>
            {spec.midLabel}
          </span>
          <span>{spec.maxLabel}</span>
        </div>
      </div>

      {/* Collapsible Scientific Explanation & Discrete Color-Coding Breakdown */}
      {isExpanded && (
        <div
          id="uhi-map-legend-panel"
          className={`flex-1 min-h-0 overflow-y-auto border-t px-2.5 py-2 sm:px-3 sm:py-2.5 space-y-2 ${dividerBorder}`}
        >
          {/* Synced Layer Tabs inside Legend */}
          <div
            role="group"
            aria-label="Inspect layer color coding"
            className={`grid grid-cols-4 gap-0.5 p-0.5 rounded-[8px] border ${
              isDark
                ? 'bg-[#141414] border-[#facc15]/20'
                : 'bg-[#f5f5f7] border-[#d2d2d7]/80'
            }`}
          >
            {LEGEND_TAB_ORDER.map((layerId) => {
              const tabSpec = getLegendSpec(layerId);
              const isSelected = activeLayer === layerId;
              return (
                <button
                  key={layerId}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectLayer(layerId)}
                  className={`px-1 py-1 text-[10px] font-medium rounded-[6px] transition-colors truncate cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'bg-[#facc15] text-black font-semibold'
                        : 'bg-[#0071e3] text-white'
                      : isDark
                        ? 'text-[#d4c46a] hover:text-[#fef9c3] hover:bg-[#1f1f1f]'
                        : 'text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-white'
                  }`}
                >
                  {tabSpec.tabLabel}
                </button>
              );
            })}
          </div>

          {/* Scientific Dataset / Index Methodology */}
          <p className={`text-[10.5px] leading-snug ${secondaryText}`}>
            {spec.methodology}
          </p>

          {/* Discrete Color Bands */}
          <ul
            aria-label={`${spec.title} color bands`}
            className="space-y-1.5"
          >
            {spec.bands.map((band) => (
              <li
                key={band.id}
                className="flex items-start gap-2 text-[10.5px] leading-tight"
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 w-3 h-3 rounded-[3px] shrink-0 border ${
                    isDark ? 'border-white/25' : 'border-black/15'
                  }`}
                  style={{ backgroundColor: band.color }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1.5">
                    <span className={`font-semibold ${primaryText}`}>
                      {band.title}
                    </span>
                    <span
                      className={`font-mono text-[9.5px] tabular-nums shrink-0 ${secondaryText}`}
                    >
                      {band.rangeLabel}
                    </span>
                  </div>
                  <p className={`text-[10px] mt-0.5 ${secondaryText}`}>
                    {band.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* Map Symbology Key */}
          <div
            className={`pt-1.5 border-t flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] ${dividerBorder} ${secondaryText}`}
          >
            <span className="inline-flex items-center gap-1">
              <span
                aria-hidden="true"
                className={`inline-block w-3 h-[2px] ${
                  isDark ? 'bg-[#facc15]' : 'bg-[#0f172a]'
                }`}
              />
              India Border
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                aria-hidden="true"
                className={`inline-block w-3 border-t border-dashed ${
                  isDark ? 'border-[#eab308]' : 'border-[#475569]'
                }`}
              />
              State / UT
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                aria-hidden="true"
                className={`inline-block w-2.5 h-2.5 rounded-full border ${
                  isDark
                    ? 'border-[#facc15] bg-[#facc15]/20'
                    : 'border-[#0071e3] bg-[#0071e3]/20'
                }`}
              />
              Active Sector
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
