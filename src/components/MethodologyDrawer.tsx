import { useEffect, useState } from 'react';
import {
  X,
  Layers,
  Satellite,
  ThermometerSun,
  Presentation,
} from 'lucide-react';
import { IndiaSummary } from '../utils/uhiModel';

interface MethodologyDrawerProps {
  isOpen: boolean;
  isDark: boolean;
  onClose: () => void;
  indiaSummary: IndiaSummary;
}

type DrawerTab = 'methodology' | 'blueprint';

export function MethodologyDrawer({
  isOpen,
  isDark,
  onClose,
  indiaSummary,
}: MethodologyDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('methodology');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="methodology-drawer-title"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-2xl h-full border-l flex flex-col overflow-hidden shadow-[rgba(0,0,0,0.28)_3px_5px_30px_0px] ${
          isDark
            ? 'bg-[#0a0a0a] border-[#facc15]/30 text-[#fef9c3]'
            : 'bg-white border-[#d2d2d7] text-[#1d1d1f]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`px-6 py-4 border-b flex items-center justify-between gap-4 shrink-0 ${
            isDark ? 'border-[#facc15]/20' : 'border-[#d2d2d7]/70'
          }`}
        >
          <div>
            <p
              className={`text-xs font-mono ${
                isDark ? 'text-[#facc15]' : 'text-[#0071e3]'
              }`}
            >
              Pan-India Environmental Science Study · Leaflet &amp; Open-Meteo
            </p>
            <h2 id="methodology-drawer-title" className="text-lg font-semibold mt-0.5">
              Methodology, Data Sources &amp; Presentation Blueprint
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close methodology drawer"
            className={`p-2 rounded-[8px] transition-colors cursor-pointer ${
              isDark
                ? 'text-[#d4c46a] hover:text-[#facc15] hover:bg-[#141414]'
                : 'text-[#86868b] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Segmented Switcher */}
        <div
          className={`px-6 py-3 border-b flex items-center shrink-0 ${
            isDark
              ? 'bg-[#141414]/80 border-[#facc15]/20'
              : 'bg-[#f5f5f7]/60 border-[#d2d2d7]/70'
          }`}
        >
          <div
            className={`inline-flex items-center gap-1 p-1 rounded-[10px] ${
              isDark ? 'bg-black border border-[#facc15]/20' : 'bg-[#e8e8ed]/75'
            }`}
          >
            <button
              type="button"
              onClick={() => setActiveTab('methodology')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[8px] transition-all cursor-pointer ${
                activeTab === 'methodology'
                  ? isDark
                    ? 'bg-[#facc15] text-black shadow-xs font-semibold'
                    : 'bg-white text-[#1d1d1f] shadow-xs'
                  : isDark
                    ? 'text-[#d4c46a] hover:text-[#fef9c3]'
                    : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              <Satellite className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Scientific Methodology</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('blueprint')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[8px] transition-all cursor-pointer ${
                activeTab === 'blueprint'
                  ? isDark
                    ? 'bg-[#facc15] text-black shadow-xs font-semibold'
                    : 'bg-white text-[#1d1d1f] shadow-xs'
                  : isDark
                    ? 'text-[#d4c46a] hover:text-[#fef9c3]'
                    : 'text-[#86868b] hover:text-[#1d1d1f]'
              }`}
            >
              <Presentation className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Presentation Blueprint (6 Parts)</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm leading-relaxed">
          {activeTab === 'methodology' ? (
            <>
              <section className="space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Satellite
                    className={`w-4 h-4 ${isDark ? 'text-[#facc15]' : 'text-[#0071e3]'}`}
                    aria-hidden="true"
                  />
                  <h3>01. Satellite &amp; Open-Meteo / Leaflet Provenance</h3>
                </div>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'}`}>
                  Spatial footprints, geocoded localities, ambient weather, and air
                  quality across North &amp; NCR, West, South, East, Central, and
                  Northeast India combine remote-sensing thermal baselines with
                  Leaflet CartoDB Positron mapping and live Open-Meteo APIs:
                </p>
                <dl
                  className={`grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t text-xs ${
                    isDark ? 'border-[#facc15]/20' : 'border-[#d2d2d7]/70'
                  }`}
                >
                  <div>
                    <dt className="font-semibold">
                      Leaflet CartoDB Positron &amp; Open-Meteo APIs
                    </dt>
                    <dd className={`mt-0.5 ${isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'}`}>
                      Desaturated Positron vector/raster basemaps, India-wide Open-Meteo
                      geocoding search, ambient air temperature, relative humidity,
                      US AQI, CPCB NAQI (IN), and PM2.5/PM10 telemetry.
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold">
                      Landsat 8/9 TIRS &amp; Sentinel-2 MSI
                    </dt>
                    <dd className={`mt-0.5 ${isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'}`}>
                      Pre-monsoon cloud-free thermal Band 10 (30 m resampled) paired
                      with 10 m Sentinel-2 NDVI vegetation and NDWI water indices.
                    </dd>
                  </div>
                </dl>
              </section>

              <section
                className={`space-y-2.5 pt-4 border-t ${
                  isDark ? 'border-[#facc15]/20' : 'border-[#d2d2d7]/70'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <ThermometerSun
                    className={`w-4 h-4 ${isDark ? 'text-[#facc15]' : 'text-[#0071e3]'}`}
                    aria-hidden="true"
                  />
                  <h3>02. Thermal Infrared Band LST Calculation</h3>
                </div>
                <div
                  className={`rounded-[11px] p-4 font-mono text-xs space-y-2 ${
                    isDark ? 'bg-[#141414] border border-[#facc15]/20' : 'bg-[#f5f5f7]'
                  }`}
                >
                  <div>1. T_B = K2 / ln((K1 / L_λ) + 1) - 273.15 [°C]</div>
                  <div>2. P_v = ((NDVI - NDVI_min) / (NDVI_max - NDVI_min))²</div>
                  <div>3. ε_λ = 0.004 · P_v + 0.986</div>
                  <div>4. LST = T_B / (1 + (λ · T_B / ρ) · ln(ε_λ))</div>
                </div>
                <p className={`text-xs ${isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'}`}>
                  Pan-India UHI Anomaly (ΔT) is measured against the vegetated rural
                  reference baseline (
                  <span
                    className={`font-mono font-medium ${
                      isDark ? 'text-[#fef9c3]' : 'text-[#1d1d1f]'
                    }`}
                  >
                    {indiaSummary.ruralBaselineC.toFixed(1)} °C
                  </span>
                  ).
                </p>
              </section>

              <section
                className={`space-y-2.5 pt-4 border-t ${
                  isDark ? 'border-[#facc15]/20' : 'border-[#d2d2d7]/70'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <Layers
                    className={`w-4 h-4 ${isDark ? 'text-[#facc15]' : 'text-[#0071e3]'}`}
                    aria-hidden="true"
                  />
                  <h3>03. All-India Empirical Findings</h3>
                </div>
                <ul className={`space-y-2.5 text-xs ${isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'}`}>
                  <li
                    className={`pb-2.5 border-b ${
                      isDark ? 'border-[#facc15]/15' : 'border-[#d2d2d7]/50'
                    }`}
                  >
                    <span className={`font-semibold ${isDark ? 'text-[#fef9c3]' : 'text-[#1d1d1f]'}`}>
                      Canopy Evapotranspiration Slope:
                    </span>{' '}
                    OLS regression across the Indian study network shows a{' '}
                    <span className={`font-mono ${isDark ? 'text-[#facc15]' : 'text-[#1d1d1f]'}`}>
                      {indiaSummary.regression.slope.toFixed(3)} °C
                    </span>{' '}
                    surface temperature reduction per{' '}
                    <span className={`font-mono ${isDark ? 'text-[#facc15]' : 'text-[#1d1d1f]'}`}>
                      +1%
                    </span>{' '}
                    green canopy increase (
                    <span className={`font-mono ${isDark ? 'text-[#facc15]' : 'text-[#1d1d1f]'}`}>
                      R² = {indiaSummary.regression.rSquared.toFixed(2)}
                    </span>
                    ).
                  </li>
                  <li
                    className={`pb-2.5 border-b ${
                      isDark ? 'border-[#facc15]/15' : 'border-[#d2d2d7]/50'
                    }`}
                  >
                    <span className={`font-semibold ${isDark ? 'text-[#fef9c3]' : 'text-[#1d1d1f]'}`}>
                      National Cooling Sinks:
                    </span>{' '}
                    Shillong Pine Ridge, Sanjay Gandhi National Park (Mumbai), Sanjay Van
                    (Delhi), and Cubbon Park (Bengaluru) remain{' '}
                    <span className={`font-mono ${isDark ? 'text-[#facc15]' : 'text-[#1d1d1f]'}`}>
                      2.9–3.5 °C
                    </span>{' '}
                    cooler than reference baselines.
                  </li>
                  <li>
                    <span className={`font-semibold ${isDark ? 'text-[#fef9c3]' : 'text-[#1d1d1f]'}`}>
                      High-Heat Corridors:
                    </span>{' '}
                    Anand Vihar (Delhi), Naroda GIDC (Ahmedabad), Sitabuldi (Nagpur), and
                    Jaipur Walled Core combine &gt;88% impervious cover with low albedo.
                  </li>
                </ul>
              </section>
            </>
          ) : (
            <div className="space-y-3.5">
              <p className={`text-xs ${isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'}`}>
                Use this 6-part structure to present the Pan-India Urban Heat Island
                platform clearly in a 5–7 minute academic walkthrough or viva.
              </p>

              {[
                {
                  step: 'Part 1 · National Scope & Macro-Regions (Top Bar & Map)',
                  talk: 'Start at the All-India view covering North & NCR, West, South, East, Central, and Northeast India. Contrast arid continental cores (Delhi, Ahmedabad, Nagpur) with coastal and highland green sinks (Kochi, Mumbai SGNP, Shillong).',
                },
                {
                  step: 'Part 2 · Leaflet Positron Layers & Sequential GIS Scale (Map Controls)',
                  talk: 'Switch between "Temp Anomaly (°C)", "Live AQI (NAQI)", "Land Cover Density", and "Albedo Index", and toggle Positron / Dark Matter / OSM basemaps or Black & Yellow dark mode.',
                },
                {
                  step: 'Part 3 · Instant Search, Inspector & Open-Meteo Weather/AQI (Search & Sidebar)',
                  talk: 'Use the Top Bar or Inspector search to pick any Indian city or pin any location via Open-Meteo Geocoding, inspecting LST, Green Space %, Impervious Ratio, Vulnerability Index, and live Microclimate & Air Quality Status.',
                },
                {
                  step: 'Part 4 · Empirical Proof: Canopy Cooling Correlation (Regression Tab)',
                  talk: 'Highlight the OLS regression scatter plot showing how +10% canopy gain consistently lowers peak surface temperature across diverse Indian cities.',
                },
                {
                  step: 'Part 5 · Nocturnal Heat Retention & AI Area Analyst (Diurnal + THERMA)',
                  talk: 'Open the 24h Diurnal Profile tab and launch Ask THERMA to query why specific neighborhoods retain heat after sunset and receive tailored cooling recommendations.',
                },
                {
                  step: 'Part 6 · Policy Prioritization & Methodology (Matrix & Drawer)',
                  talk: 'Sort the India Sector Matrix by Vulnerability Index to rank high-priority cool-roof and urban forestry wards, grounded in Landsat 8/9 TIRS physics.',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className={`p-4 rounded-[11px] space-y-1 ${
                    isDark ? 'bg-[#141414] border border-[#facc15]/20' : 'bg-[#f5f5f7]'
                  }`}
                >
                  <h3 className="text-xs font-semibold">{item.step}</h3>
                  <p
                    className={`text-xs leading-relaxed ${
                      isDark ? 'text-[#d4c46a]' : 'text-[#86868b]'
                    }`}
                  >
                    {item.talk}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div
          className={`px-6 py-3.5 border-t flex items-center justify-between text-xs shrink-0 ${
            isDark
              ? 'bg-[#141414] border-[#facc15]/20 text-[#d4c46a]'
              : 'bg-[#f5f5f7] border-[#d2d2d7]/70 text-[#86868b]'
          }`}
        >
          <span>India Microclimate Study · Leaflet Positron + Open-Meteo + Landsat TIRS</span>
          <button
            type="button"
            onClick={onClose}
            className={`px-[15px] py-1.5 font-medium rounded-[11px] transition-colors cursor-pointer ${
              isDark
                ? 'bg-[#facc15] text-black hover:bg-[#eab308]'
                : 'text-white bg-[#0071e3] hover:bg-[#005bb5]'
            }`}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
