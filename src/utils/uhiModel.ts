export type MapLayer = 'temperature' | 'aqi' | 'landcover' | 'albedo';

export type ZoneCategory =
  | 'Parkland & Watershed'
  | 'Residential'
  | 'Commercial & Civic'
  | 'Industrial & Transit'
  | 'Institutional & Tech';

export type SettlementTier = 'Tier 1' | 'Tier 2' | 'Tier 3' | 'Rural';

export type SortOption =
  | 'default'
  | 'aqi-desc'
  | 'aqi-asc'
  | 'temp-desc'
  | 'temp-asc'
  | 'air-temp-desc'
  | 'air-temp-asc';

export type IndiaRegion =
  | 'All India'
  | 'North & NCR'
  | 'West'
  | 'South'
  | 'East'
  | 'Central'
  | 'Northeast';

export type VulnerabilityTier = 'Low' | 'Moderate' | 'Elevated' | 'Severe';

export interface LatLngLiteral {
  lat: number;
  lng: number;
}

export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface LiveEnvironmentData {
  fetchedAt: string;
  source?: 'open-meteo' | 'fallback';
  weather: {
    available: boolean;
    isFallback?: boolean;
    conditionText?: string | null;
    conditionType?: string | null;
    weatherCode?: number | null;
    temperatureC?: number | null;
    feelsLikeC?: number | null;
    heatIndexC?: number | null;
    relativeHumidity?: number | null;
    uvIndex?: number | null;
    windSpeedKmh?: number | null;
    windCardinal?: string | null;
    maxTemp24hC?: number | null;
    minTemp24hC?: number | null;
    message?: string;
  };
  airQuality: {
    available: boolean;
    isFallback?: boolean;
    dateTime?: string | null;
    indexes?: Array<{
      code?: string;
      displayName?: string;
      aqi?: number;
      aqiDisplay?: string;
      category?: string;
      dominantPollutant?: string;
    }>;
    pollutants?: Array<{
      code?: string;
      displayName?: string;
      fullName?: string;
      concentration?: { value?: number; units?: string };
    }>;
    message?: string;
  };
}

export interface IndianAqiReading {
  aqi: number;
  category: string;
  displayName: string;
  source: 'ind_cpcb' | 'cpcb_calculated';
  dominantPollutant: string | null;
  pm25: number | null;
  pm10: number | null;
  dateTime: string | null;
}

export interface IndiaZoneTemplate {
  id: string;
  code: string;
  label: string;
  city: string;
  state: string;
  tier: SettlementTier;
  subRegion: Exclude<IndiaRegion, 'All India'>;
  lat: number;
  lng: number;
  formattedAddress?: string;
  placeQuery: string;
  category: ZoneCategory;
  avgSurfaceTempC: number; // Landsat 8/9 TIRS pre-monsoon peak LST
  tempAnomalyC: number; // Delta vs 36.5°C Pan-India vegetated baseline
  greenCanopyPct: number; // Sentinel-2 NDVI canopy %
  waterBodyPct: number; // NDWI surface water %
  imperviousPct: number; // Asphalt / concrete / built-up %
  albedoIndex: number; // Broadband shortwave reflectance (0.08 - 0.45)
  ndviMean: number;
  coolingMitigationNote: string;
}

export interface ResolvedIndiaSector extends IndiaZoneTemplate {
  placeId: string | null;
  displayName: string;
  formattedAddress: string;
  location: LatLngLiteral;
  viewport: ViewportBounds | null;
  footprintPolygon: LatLngLiteral[];
  isCustomPin?: boolean;
}

export interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
}

export interface IndiaSummary {
  ruralBaselineC: number;
  meanSurfaceTempC: number;
  maxAnomalyC: number;
  minAnomalyC: number;
  meanCanopyPct: number;
  meanImperviousPct: number;
  regression: RegressionResult;
}

export interface DiurnalPoint {
  hour: string;
  sectorTempC: number;
  baselineTempC: number;
  parkReferenceTempC: number;
}

// Pan-India pre-monsoon vegetated rural reference baseline (°C)
export const INDIA_BASELINE_C = 36.5;

// Official CPCB India NAQI (0–500) piecewise linear breakpoints for PM2.5 & PM10 (µg/m³)
const CPCB_PM25_BANDS: Array<[number, number, number, number]> = [
  [0, 30, 0, 50],
  [30, 60, 51, 100],
  [60, 90, 101, 200],
  [90, 120, 201, 300],
  [120, 250, 301, 400],
  [250, 380, 401, 500],
];

const CPCB_PM10_BANDS: Array<[number, number, number, number]> = [
  [0, 50, 0, 50],
  [50, 100, 51, 100],
  [100, 250, 101, 200],
  [250, 350, 201, 300],
  [350, 430, 301, 400],
  [430, 550, 401, 500],
];

function computePiecewiseSubIndex(
  concentration: number,
  bands: Array<[number, number, number, number]>
): number {
  const c = Math.max(0, concentration);
  for (const [bLow, bHigh, iLow, iHigh] of bands) {
    if (c <= bHigh) {
      const span = bHigh - bLow || 1;
      return Math.round(((iHigh - iLow) / span) * (c - bLow) + iLow);
    }
  }
  return 500;
}

export function getCpcbAqiCategory(aqi: number): string {
  if (aqi <= 50) return 'Good air quality';
  if (aqi <= 100) return 'Satisfactory air quality';
  if (aqi <= 200) return 'Moderate air quality';
  if (aqi <= 300) return 'Poor air quality';
  if (aqi <= 400) return 'Very poor air quality';
  return 'Severe air quality';
}

/**
 * Extracts the factually accurate Indian National Air Quality Index (NAQI · CPCB, 0–500 scale)
 * from live Google Maps Air Quality API telemetry.
 * Strictly prioritizes `ind_cpcb` and NEVER mislabels Google's inverse `uaqi` (where 100 = cleanest)
 * as an Indian AQI figure. When a remote/mountain coordinate lacks `ind_cpcb`, computes the exact
 * CPCB sub-index from live Google Maps PM2.5 & PM10 pollutant concentrations.
 */
export function resolveIndianAqi(
  env: LiveEnvironmentData | null | undefined
): IndianAqiReading | null {
  if (!env?.airQuality?.available) return null;

  const indexes = env.airQuality.indexes ?? [];
  const pollutants = env.airQuality.pollutants ?? [];
  const pm25Val =
    pollutants.find((p) => p.code === 'pm25')?.concentration?.value ?? null;
  const pm10Val =
    pollutants.find((p) => p.code === 'pm10')?.concentration?.value ?? null;

  const indCpcb = indexes.find(
    (idx) => idx.code === 'ind_cpcb' && typeof idx.aqi === 'number'
  );

  if (indCpcb && typeof indCpcb.aqi === 'number') {
    return {
      aqi: Math.round(indCpcb.aqi),
      category: indCpcb.category || getCpcbAqiCategory(indCpcb.aqi),
      displayName: indCpcb.displayName || 'NAQI (IN)',
      source: 'ind_cpcb',
      dominantPollutant: indCpcb.dominantPollutant ?? null,
      pm25: pm25Val,
      pm10: pm10Val,
      dateTime: env.airQuality.dateTime ?? null,
    };
  }

  // Fallback for high-altitude / border stations where Google omits `ind_cpcb` but supplies live PM2.5 / PM10
  const subIndexes: Array<{ code: string; value: number }> = [];
  if (typeof pm25Val === 'number' && Number.isFinite(pm25Val)) {
    subIndexes.push({
      code: 'pm25',
      value: computePiecewiseSubIndex(pm25Val, CPCB_PM25_BANDS),
    });
  }
  if (typeof pm10Val === 'number' && Number.isFinite(pm10Val)) {
    subIndexes.push({
      code: 'pm10',
      value: computePiecewiseSubIndex(pm10Val, CPCB_PM10_BANDS),
    });
  }

  if (subIndexes.length === 0) return null;

  subIndexes.sort((a, b) => b.value - a.value);
  const peak = subIndexes[0];
  return {
    aqi: peak.value,
    category: getCpcbAqiCategory(peak.value),
    displayName: 'NAQI (IN · CPCB)',
    source: 'cpcb_calculated',
    dominantPollutant: peak.code,
    pm25: pm25Val,
    pm10: pm10Val,
    dateTime: env.airQuality.dateTime ?? null,
  };
}

export function resolveUsAqi(
  env: LiveEnvironmentData | null | undefined
): number | null {
  if (!env?.airQuality?.available) return null;
  const us = env.airQuality.indexes?.find(
    (idx) => idx.code === 'usa_epa' && typeof idx.aqi === 'number'
  );
  return us && typeof us.aqi === 'number' ? Math.round(us.aqi) : null;
}

export function computeVulnerabilityIndex(sector: IndiaZoneTemplate): {
  score: number;
  tier: VulnerabilityTier;
} {
  const thermalComponent = clamp((sector.tempAnomalyC + 3.5) / 10.5, 0, 1) * 45;
  const imperviousComponent = clamp(sector.imperviousPct / 100, 0, 1) * 30;
  const canopyDeficitComponent =
    clamp((100 - sector.greenCanopyPct) / 100, 0, 1) * 15;
  const albedoAbsorptionComponent =
    clamp((0.42 - sector.albedoIndex) / 0.34, 0, 1) * 10;

  const rawScore =
    thermalComponent +
    imperviousComponent +
    canopyDeficitComponent +
    albedoAbsorptionComponent;

  const score = Math.round(clamp(rawScore, 0, 100));

  let tier: VulnerabilityTier = 'Low';
  if (score >= 76) {
    tier = 'Severe';
  } else if (score >= 54) {
    tier = 'Elevated';
  } else if (score >= 32) {
    tier = 'Moderate';
  }

  return { score, tier };
}

export function computeLinearRegression(
  points: Array<{ x: number; y: number }>
): RegressionResult {
  if (points.length < 2) {
    return { slope: 0, intercept: 0, rSquared: 0 };
  }

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const pt of points) {
    sumX += pt.x;
    sumY += pt.y;
    sumXY += pt.x * pt.y;
    sumXX += pt.x * pt.x;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;
  const denominator = sumXX - n * meanX * meanX;

  if (Math.abs(denominator) < 1e-9) {
    return { slope: 0, intercept: meanY, rSquared: 0 };
  }

  const slope = (sumXY - n * meanX * meanY) / denominator;
  const intercept = meanY - slope * meanX;

  let ssTot = 0;
  let ssRes = 0;
  for (const pt of points) {
    const predicted = slope * pt.x + intercept;
    ssTot += (pt.y - meanY) ** 2;
    ssRes += (pt.y - predicted) ** 2;
  }

  const rSquared = ssTot < 1e-9 ? 1 : clamp(1 - ssRes / ssTot, 0, 1);

  return {
    slope: Number(slope.toFixed(4)),
    intercept: Number(intercept.toFixed(4)),
    rSquared: Number(rSquared.toFixed(4)),
  };
}

export function getLayerMetricValue(
  sector: IndiaZoneTemplate,
  layer: MapLayer,
  liveEnv?: LiveEnvironmentData | null
): { value: number; formatted: string; shortFormatted: string; available: boolean } {
  if (layer === 'temperature') {
    const sign = sector.tempAnomalyC > 0 ? '+' : '';
    return {
      value: sector.tempAnomalyC,
      formatted: `${sign}${sector.tempAnomalyC.toFixed(1)} °C`,
      shortFormatted: `${sign}${sector.tempAnomalyC.toFixed(1)}°`,
      available: true,
    };
  }
  if (layer === 'aqi') {
    const reading = resolveIndianAqi(liveEnv);
    if (!reading) {
      return {
        value: -1,
        formatted: 'Loading AQI...',
        shortFormatted: '...',
        available: false,
      };
    }
    return {
      value: reading.aqi,
      formatted: `NAQI ${reading.aqi} (${reading.category})`,
      shortFormatted: `${reading.aqi}`,
      available: true,
    };
  }
  if (layer === 'landcover') {
    return {
      value: sector.greenCanopyPct,
      formatted: `${sector.greenCanopyPct.toFixed(1)}% canopy`,
      shortFormatted: `${Math.round(sector.greenCanopyPct)}%`,
      available: true,
    };
  }
  return {
    value: sector.albedoIndex,
    formatted: `${sector.albedoIndex.toFixed(2)} α`,
    shortFormatted: sector.albedoIndex.toFixed(2),
    available: true,
  };
}

export interface ColorStop {
  t: number;
  rgb: [number, number, number];
}

export const LAYER_SCALES: Record<
  MapLayer,
  {
    label: string;
    shortLabel: string;
    unit: string;
    min: number;
    max: number;
    minLabel: string;
    midLabel: string;
    maxLabel: string;
    stops: ColorStop[];
  }
> = {
  temperature: {
    label: 'Temp Anomaly',
    shortLabel: 'Temp Anomaly',
    unit: 'India baseline 36.5°C',
    min: -4.0,
    max: 7.0,
    minLabel: '-4.0° Cool',
    midLabel: '+1.5°',
    maxLabel: '+7.0° Peak',
    stops: [
      { t: 0.0, rgb: [59, 110, 140] },
      { t: 0.25, rgb: [122, 161, 181] },
      { t: 0.45, rgb: [228, 214, 184] },
      { t: 0.72, rgb: [217, 138, 72] },
      { t: 1.0, rgb: [148, 43, 33] },
    ],
  },
  aqi: {
    label: 'Live NAQI (IN)',
    shortLabel: 'Air Quality',
    unit: 'CPCB India 0–500',
    min: 0,
    max: 450,
    minLabel: '0 Good',
    midLabel: '200 Mod',
    maxLabel: '450 Severe',
    stops: [
      { t: 0.0, rgb: [47, 118, 79] },
      { t: 0.22, rgb: [118, 164, 92] },
      { t: 0.44, rgb: [214, 178, 76] },
      { t: 0.67, rgb: [212, 112, 54] },
      { t: 0.89, rgb: [168, 46, 42] },
      { t: 1.0, rgb: [112, 24, 34] },
    ],
  },
  landcover: {
    label: 'Canopy Cover',
    shortLabel: 'Land Cover',
    unit: '% Green Canopy',
    min: 0,
    max: 85,
    minLabel: '0% Built',
    midLabel: '42%',
    maxLabel: '85% Forest',
    stops: [
      { t: 0.0, rgb: [89, 82, 78] },
      { t: 0.3, rgb: [148, 138, 128] },
      { t: 0.55, rgb: [189, 196, 174] },
      { t: 0.8, rgb: [98, 145, 119] },
      { t: 1.0, rgb: [47, 94, 73] },
    ],
  },
  albedo: {
    label: 'Surface Albedo',
    shortLabel: 'Albedo Index',
    unit: 'Reflectance (α)',
    min: 0.1,
    max: 0.42,
    minLabel: '0.10 Dark',
    midLabel: '0.26',
    maxLabel: '0.42 Bright',
    stops: [
      { t: 0.0, rgb: [110, 46, 36] },
      { t: 0.32, rgb: [168, 96, 68] },
      { t: 0.58, rgb: [214, 192, 165] },
      { t: 0.82, rgb: [164, 193, 212] },
      { t: 1.0, rgb: [232, 241, 247] },
    ],
  },
};

export function interpolateSequentialColor(
  value: number,
  min: number,
  max: number,
  stops: ColorStop[]
): string {
  const t = clamp((value - min) / (max - min || 1), 0, 1);

  for (let i = 0; i < stops.length - 1; i++) {
    const left = stops[i];
    const right = stops[i + 1];
    if (t >= left.t && t <= right.t) {
      const localT = (t - left.t) / (right.t - left.t || 1);
      const r = Math.round(left.rgb[0] + (right.rgb[0] - left.rgb[0]) * localT);
      const g = Math.round(left.rgb[1] + (right.rgb[1] - left.rgb[1]) * localT);
      const b = Math.round(left.rgb[2] + (right.rgb[2] - left.rgb[2]) * localT);
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  const last = stops[stops.length - 1].rgb;
  return `rgb(${last[0]}, ${last[1]}, ${last[2]})`;
}

export function getSectorFillColor(
  sector: IndiaZoneTemplate,
  layer: MapLayer,
  liveEnv?: LiveEnvironmentData | null
): string {
  const scale = LAYER_SCALES[layer];
  const metric = getLayerMetricValue(sector, layer, liveEnv);
  if (!metric.available) {
    return 'rgb(148, 163, 184)';
  }
  return interpolateSequentialColor(metric.value, scale.min, scale.max, scale.stops);
}

export function isDarkFill(rgbString: string): boolean {
  const match = rgbString.match(/\d+/g);
  if (!match || match.length < 3) return false;
  const [r, g, b] = match.map(Number);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.54;
}

export function filterSectors<T extends IndiaZoneTemplate>(
  sectors: T[],
  query: string,
  categoryFilter: ZoneCategory | 'All' = 'All',
  regionFilter: IndiaRegion = 'All India',
  tierFilter: SettlementTier | 'All' = 'All'
): T[] {
  const normalized = query.trim().toLowerCase();
  return sectors.filter((sector) => {
    const matchesCategory =
      categoryFilter === 'All' || sector.category === categoryFilter;
    const matchesRegion =
      regionFilter === 'All India' || sector.subRegion === regionFilter;
    const matchesTier = tierFilter === 'All' || sector.tier === tierFilter;
    if (!matchesCategory || !matchesRegion || !matchesTier) return false;
    if (!normalized) return true;
    return (
      sector.label.toLowerCase().includes(normalized) ||
      sector.city.toLowerCase().includes(normalized) ||
      sector.state.toLowerCase().includes(normalized) ||
      sector.tier.toLowerCase().includes(normalized) ||
      sector.code.toLowerCase().includes(normalized) ||
      sector.subRegion.toLowerCase().includes(normalized) ||
      sector.category.toLowerCase().includes(normalized) ||
      sector.placeQuery.toLowerCase().includes(normalized)
    );
  });
}

export function sortSectors<T extends IndiaZoneTemplate>(
  sectors: T[],
  sortOption: SortOption,
  envById: Record<string, LiveEnvironmentData | undefined>
): T[] {
  if (sortOption === 'default') return sectors;
  const copy = [...sectors];

  copy.sort((a, b) => {
    if (sortOption === 'temp-desc') {
      return b.avgSurfaceTempC - a.avgSurfaceTempC;
    }
    if (sortOption === 'temp-asc') {
      return a.avgSurfaceTempC - b.avgSurfaceTempC;
    }
    if (sortOption === 'aqi-desc' || sortOption === 'aqi-asc') {
      const aAqi = resolveIndianAqi(envById[a.id])?.aqi ?? null;
      const bAqi = resolveIndianAqi(envById[b.id])?.aqi ?? null;
      if (aAqi === null && bAqi === null) return 0;
      if (aAqi === null) return 1;
      if (bAqi === null) return -1;
      return sortOption === 'aqi-desc' ? bAqi - aAqi : aAqi - bAqi;
    }
    if (sortOption === 'air-temp-desc' || sortOption === 'air-temp-asc') {
      const aTemp = envById[a.id]?.weather?.available
        ? envById[a.id]?.weather?.temperatureC ?? null
        : null;
      const bTemp = envById[b.id]?.weather?.available
        ? envById[b.id]?.weather?.temperatureC ?? null
        : null;
      if (aTemp === null && bTemp === null) return 0;
      if (aTemp === null) return 1;
      if (bTemp === null) return -1;
      return sortOption === 'air-temp-desc' ? bTemp - aTemp : aTemp - bTemp;
    }
    return 0;
  });

  return copy;
}

export function computeIndiaSummary(
  sectors: IndiaZoneTemplate[]
): IndiaSummary {
  if (sectors.length === 0) {
    return {
      ruralBaselineC: INDIA_BASELINE_C,
      meanSurfaceTempC: INDIA_BASELINE_C,
      maxAnomalyC: 0,
      minAnomalyC: 0,
      meanCanopyPct: 0,
      meanImperviousPct: 0,
      regression: { slope: 0, intercept: 0, rSquared: 0 },
    };
  }

  let tempSum = 0;
  let canopySum = 0;
  let imperviousSum = 0;
  let maxAnomaly = -Infinity;
  let minAnomaly = Infinity;

  const regressionPoints: Array<{ x: number; y: number }> = [];

  for (const s of sectors) {
    tempSum += s.avgSurfaceTempC;
    canopySum += s.greenCanopyPct;
    imperviousSum += s.imperviousPct;
    if (s.tempAnomalyC > maxAnomaly) maxAnomaly = s.tempAnomalyC;
    if (s.tempAnomalyC < minAnomaly) minAnomaly = s.tempAnomalyC;
    regressionPoints.push({ x: s.greenCanopyPct, y: s.tempAnomalyC });
  }

  const n = sectors.length;
  return {
    ruralBaselineC: INDIA_BASELINE_C,
    meanSurfaceTempC: Number((tempSum / n).toFixed(2)),
    maxAnomalyC: Number(maxAnomaly.toFixed(1)),
    minAnomalyC: Number(minAnomaly.toFixed(1)),
    meanCanopyPct: Number((canopySum / n).toFixed(1)),
    meanImperviousPct: Number((imperviousSum / n).toFixed(1)),
    regression: computeLinearRegression(regressionPoints),
  };
}

export function formatDiurnalCurve(
  sector: IndiaZoneTemplate,
  ruralBaselineC: number = INDIA_BASELINE_C
): DiurnalPoint[] {
  const hours = ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'];
  const solarShape = [-0.54, -0.70, -0.82, -0.22, 0.58, 1.0, 0.50, -0.10];
  const thermalInertia = [0.24, 0.16, 0.06, 0.0, 0.07, 0.12, 0.36, 0.32];

  const imperviousRatio = sector.imperviousPct / 100;
  const canopyRatio = sector.greenCanopyPct / 100;

  return hours.map((hour, idx) => {
    const baselineTemp = ruralBaselineC - 5.2 + solarShape[idx] * 7.8;
    const parkTemp = baselineTemp - 2.2 - canopyRatio * 0.65;
    const sectorHeating =
      sector.tempAnomalyC * (0.65 + 0.35 * Math.max(0, solarShape[idx])) +
      imperviousRatio * thermalInertia[idx] * 4.5 -
      canopyRatio * 0.48 * (idx >= 5 ? 1.25 : 0.45);

    return {
      hour,
      sectorTempC: Number((baselineTemp + sectorHeating).toFixed(1)),
      baselineTempC: Number(baselineTemp.toFixed(1)),
      parkReferenceTempC: Number(parkTemp.toFixed(1)),
    };
  });
}

/**
 * Generates a hexagonal GIS footprint polygon around a Google Maps coordinate
 * scaled from viewport bounds so sector footprints remain clearly legible across India.
 */
export function buildHexFootprint(
  center: LatLngLiteral,
  viewport: ViewportBounds | null
): LatLngLiteral[] {
  let latSpan = 0.028;
  if (viewport) {
    const rawSpan = Math.abs(viewport.north - viewport.south) * 0.48;
    latSpan = clamp(rawSpan, 0.018, 0.055);
  }
  const cosLat = Math.cos((center.lat * Math.PI) / 180) || 0.9;
  const lngSpan = latSpan / cosLat;

  const vertices: LatLngLiteral[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    vertices.push({
      lat: Number((center.lat + latSpan * Math.sin(angle)).toFixed(6)),
      lng: Number((center.lng + lngSpan * Math.cos(angle)).toFixed(6)),
    });
  }
  return vertices;
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}
