import {
  interpolateSequentialColor,
  LAYER_SCALES,
  MapLayer,
} from './uhiModel';

export interface LegendBand {
  id: string;
  rangeLabel: string;
  title: string;
  detail: string;
  color: string;
}

export interface ScientificLegendSpec {
  layer: MapLayer;
  title: string;
  tabLabel: string;
  methodology: string;
  unitNote: string;
  gradientCss: string;
  minLabel: string;
  midLabel: string;
  maxLabel: string;
  bands: LegendBand[];
}

function buildGradientCss(layer: MapLayer): string {
  const scale = LAYER_SCALES[layer];
  return `linear-gradient(to right, ${scale.stops
    .map((s) => `rgb(${s.rgb.join(',')}) ${Math.round(s.t * 100)}%`)
    .join(', ')})`;
}

function sampleLayerColor(layer: MapLayer, representativeValue: number): string {
  const scale = LAYER_SCALES[layer];
  return interpolateSequentialColor(
    representativeValue,
    scale.min,
    scale.max,
    scale.stops
  );
}

export const LEGEND_SPECS: Record<MapLayer, ScientificLegendSpec> = {
  temperature: {
    layer: 'temperature',
    title: 'Surface Temperature Anomaly',
    tabLabel: 'Temp',
    methodology:
      'Landsat 8/9 TIRS pre-monsoon peak Land Surface Temperature (LST) delta vs. 36.5 °C India vegetated rural baseline.',
    unitNote: 'ΔT (°C)',
    gradientCss: buildGradientCss('temperature'),
    minLabel: LAYER_SCALES.temperature.minLabel,
    midLabel: LAYER_SCALES.temperature.midLabel,
    maxLabel: LAYER_SCALES.temperature.maxLabel,
    bands: [
      {
        id: 'temp-cool',
        rangeLabel: '≤ -2.0 °C',
        title: 'Cool Sink',
        detail: 'Dense urban parks, wetlands, high-altitude ridges.',
        color: sampleLayerColor('temperature', -3.2),
      },
      {
        id: 'temp-mild',
        rangeLabel: '-2.0 to +1.0 °C',
        title: 'Near Baseline',
        detail: 'Coastal breezes & tree-lined institutional campuses.',
        color: sampleLayerColor('temperature', -0.5),
      },
      {
        id: 'temp-mod',
        rangeLabel: '+1.0 to +3.5 °C',
        title: 'Moderate Heating',
        detail: 'Mixed residential fabric with partial shade cover.',
        color: sampleLayerColor('temperature', 2.2),
      },
      {
        id: 'temp-high',
        rangeLabel: '+3.5 to +5.5 °C',
        title: 'High Heat Island',
        detail: 'Dense commercial hubs & heat-retaining arterial roads.',
        color: sampleLayerColor('temperature', 4.5),
      },
      {
        id: 'temp-peak',
        rangeLabel: '≥ +5.5 °C',
        title: 'Extreme UHI Core',
        detail: 'High impervious concrete/metal roofs, minimal canopy.',
        color: sampleLayerColor('temperature', 6.5),
      },
    ],
  },
  aqi: {
    layer: 'aqi',
    title: 'Air Quality (India NAQI)',
    tabLabel: 'AQI',
    methodology:
      'Official CPCB National Air Quality Index (0–500) computed from live Open-Meteo PM2.5 & PM10 breakpoints.',
    unitNote: 'NAQI (IN)',
    gradientCss: buildGradientCss('aqi'),
    minLabel: LAYER_SCALES.aqi.minLabel,
    midLabel: LAYER_SCALES.aqi.midLabel,
    maxLabel: LAYER_SCALES.aqi.maxLabel,
    bands: [
      {
        id: 'aqi-good',
        rangeLabel: '0–50',
        title: 'Good',
        detail: 'Minimal health impact (PM2.5 ≤ 30 µg/m³).',
        color: sampleLayerColor('aqi', 25),
      },
      {
        id: 'aqi-sat',
        rangeLabel: '51–100',
        title: 'Satisfactory',
        detail: 'Minor discomfort to sensitive groups (PM2.5 31–60).',
        color: sampleLayerColor('aqi', 75),
      },
      {
        id: 'aqi-mod',
        rangeLabel: '101–200',
        title: 'Moderate',
        detail: 'Breathing discomfort on prolonged exertion (PM2.5 61–90).',
        color: sampleLayerColor('aqi', 150),
      },
      {
        id: 'aqi-poor',
        rangeLabel: '201–300',
        title: 'Poor',
        detail: 'Discomfort to most people on sustained exposure.',
        color: sampleLayerColor('aqi', 250),
      },
      {
        id: 'aqi-vpoor',
        rangeLabel: '301–400',
        title: 'Very Poor',
        detail: 'Respiratory illness risk on prolonged exposure.',
        color: sampleLayerColor('aqi', 350),
      },
      {
        id: 'aqi-sev',
        rangeLabel: '401–500',
        title: 'Severe',
        detail: 'Acute respiratory hazard across all populations.',
        color: sampleLayerColor('aqi', 440),
      },
    ],
  },
  landcover: {
    layer: 'landcover',
    title: 'Land Cover & Canopy',
    tabLabel: 'Land Cover',
    methodology:
      'Sentinel-2 NDVI green canopy percentage vs. asphalt/concrete impervious surface fraction.',
    unitNote: '% Canopy',
    gradientCss: buildGradientCss('landcover'),
    minLabel: LAYER_SCALES.landcover.minLabel,
    midLabel: LAYER_SCALES.landcover.midLabel,
    maxLabel: LAYER_SCALES.landcover.maxLabel,
    bands: [
      {
        id: 'lc-built',
        rangeLabel: '0–15%',
        title: 'Impervious Core',
        detail: 'Asphalt, concrete & rooftop dominant (>80% built).',
        color: sampleLayerColor('landcover', 8),
      },
      {
        id: 'lc-sparse',
        rangeLabel: '15–30%',
        title: 'Sparse Urban Mix',
        detail: 'High built density with fragmented street avenues.',
        color: sampleLayerColor('landcover', 22),
      },
      {
        id: 'lc-suburban',
        rangeLabel: '30–50%',
        title: 'Balanced / Suburban',
        detail: 'Moderate vegetation offsetting daytime solar gain.',
        color: sampleLayerColor('landcover', 40),
      },
      {
        id: 'lc-buffered',
        rangeLabel: '50–70%',
        title: 'Canopy-Buffered',
        detail: 'Strong evapotranspiration & shaded microclimate.',
        color: sampleLayerColor('landcover', 60),
      },
      {
        id: 'lc-forest',
        rangeLabel: '70–85%+',
        title: 'Urban Forest / Rural',
        detail: 'Continuous tree canopy or agricultural wetland sink.',
        color: sampleLayerColor('landcover', 80),
      },
    ],
  },
  albedo: {
    layer: 'albedo',
    title: 'Surface Albedo Index',
    tabLabel: 'Albedo',
    methodology:
      'Broadband shortwave solar reflectance (α); lower α absorbs more radiation into urban thermal mass.',
    unitNote: 'Reflectance (α)',
    gradientCss: buildGradientCss('albedo'),
    minLabel: LAYER_SCALES.albedo.minLabel,
    midLabel: LAYER_SCALES.albedo.midLabel,
    maxLabel: LAYER_SCALES.albedo.maxLabel,
    bands: [
      {
        id: 'alb-dark',
        rangeLabel: '0.10–0.17',
        title: 'High Absorption',
        detail: 'Dark bitumen asphalt, industrial roofs & dense tarmac.',
        color: sampleLayerColor('albedo', 0.13),
      },
      {
        id: 'alb-urban',
        rangeLabel: '0.18–0.25',
        title: 'Standard Built-Up',
        detail: 'Weathered concrete, mixed urban pavements & brick.',
        color: sampleLayerColor('albedo', 0.21),
      },
      {
        id: 'alb-mid',
        rangeLabel: '0.26–0.33',
        title: 'Reflective Masonry',
        detail: 'Lighter stone, sandy soils & pale residential terraces.',
        color: sampleLayerColor('albedo', 0.29),
      },
      {
        id: 'alb-bright',
        rangeLabel: '0.34–0.42',
        title: 'High Reflectance',
        detail: 'Cool-coated surfaces, bright desert sand & highland rock.',
        color: sampleLayerColor('albedo', 0.39),
      },
    ],
  },
};

export const LEGEND_TAB_ORDER: MapLayer[] = [
  'temperature',
  'aqi',
  'landcover',
  'albedo',
];

export function getLegendSpec(layer: MapLayer): ScientificLegendSpec {
  return LEGEND_SPECS[layer];
}
