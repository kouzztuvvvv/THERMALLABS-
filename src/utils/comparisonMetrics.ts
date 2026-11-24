import {
  LiveEnvironmentData,
  ResolvedIndiaSector,
  computeVulnerabilityIndex,
  resolveIndianAqi,
} from './uhiModel';

export interface ComparisonMetricRow {
  id:
    | 'lst'
    | 'anomaly'
    | 'airTemp'
    | 'naqi'
    | 'canopy'
    | 'impervious'
    | 'albedo'
    | 'vulnerability';
  label: string;
  valueA: string;
  valueB: string;
  subA?: string;
  subB?: string;
  deltaFormatted: string;
  /** Which side has the cooler / lower-heat-stress / cleaner-air reading */
  favored: 'A' | 'B' | 'tie' | 'neutral';
}

export interface NeighborhoodComparisonSummary {
  sectorA: ResolvedIndiaSector;
  sectorB: ResolvedIndiaSector;
  rows: ComparisonMetricRow[];
  headlineSummary: string;
  lstDeltaC: number;
  canopyDeltaPct: number;
  vulnerabilityDeltaPts: number;
}

/**
 * Picks a contrasting partner neighborhood (preferring opposite thermal / canopy profile)
 * so Side-by-Side Comparison immediately highlights microclimate differences.
 */
export function pickDefaultComparisonPartner(
  sectors: ResolvedIndiaSector[],
  primaryId: string
): ResolvedIndiaSector | null {
  const candidates = sectors.filter((s) => s.id !== primaryId);
  if (candidates.length === 0) return null;

  const primary = sectors.find((s) => s.id === primaryId);
  if (!primary) return candidates[0];

  // Prefer same-city park/hotspot contrast first, otherwise largest LST contrast across India
  const sameCity = candidates.filter(
    (c) => c.city.toLowerCase() === primary.city.toLowerCase()
  );
  const pool = sameCity.length > 0 ? sameCity : candidates;

  let best = pool[0];
  let bestContrast = -1;
  for (const item of pool) {
    const contrast = Math.abs(item.avgSurfaceTempC - primary.avgSurfaceTempC);
    if (contrast > bestContrast) {
      bestContrast = contrast;
      best = item;
    }
  }
  return best;
}

function formatSigned(value: number, decimals: number, suffix: string = ''): string {
  const rounded = Number(value.toFixed(decimals));
  if (Math.abs(rounded) < Math.pow(10, -decimals) / 2) {
    return `0.${'0'.repeat(decimals)}${suffix}`.replace(/\.$/, '');
  }
  const sign = rounded > 0 ? '+' : '';
  return `${sign}${rounded.toFixed(decimals)}${suffix}`;
}

export function computeNeighborhoodComparison(
  sectorA: ResolvedIndiaSector,
  sectorB: ResolvedIndiaSector,
  envA?: LiveEnvironmentData | null,
  envB?: LiveEnvironmentData | null
): NeighborhoodComparisonSummary {
  const vulnA = computeVulnerabilityIndex(sectorA);
  const vulnB = computeVulnerabilityIndex(sectorB);
  const aqiA = resolveIndianAqi(envA);
  const aqiB = resolveIndianAqi(envB);

  const airTempA =
    envA?.weather?.available && typeof envA.weather.temperatureC === 'number'
      ? envA.weather.temperatureC
      : null;
  const airTempB =
    envB?.weather?.available && typeof envB.weather.temperatureC === 'number'
      ? envB.weather.temperatureC
      : null;

  const lstDelta = sectorA.avgSurfaceTempC - sectorB.avgSurfaceTempC;
  const anomalyDelta = sectorA.tempAnomalyC - sectorB.tempAnomalyC;
  const canopyDelta = sectorA.greenCanopyPct - sectorB.greenCanopyPct;
  const imperviousDelta = sectorA.imperviousPct - sectorB.imperviousPct;
  const albedoDelta = sectorA.albedoIndex - sectorB.albedoIndex;
  const vulnDelta = vulnA.score - vulnB.score;

  const rows: ComparisonMetricRow[] = [
    {
      id: 'lst',
      label: 'Surface Temp (LST)',
      valueA: `${sectorA.avgSurfaceTempC.toFixed(1)} °C`,
      valueB: `${sectorB.avgSurfaceTempC.toFixed(1)} °C`,
      deltaFormatted: formatSigned(lstDelta, 1, ' °C'),
      favored:
        Math.abs(lstDelta) < 0.05 ? 'tie' : lstDelta < 0 ? 'A' : 'B',
    },
    {
      id: 'anomaly',
      label: 'UHI Temp Anomaly',
      valueA: `${sectorA.tempAnomalyC > 0 ? '+' : ''}${sectorA.tempAnomalyC.toFixed(1)} °C`,
      valueB: `${sectorB.tempAnomalyC > 0 ? '+' : ''}${sectorB.tempAnomalyC.toFixed(1)} °C`,
      deltaFormatted: formatSigned(anomalyDelta, 1, ' °C'),
      favored:
        Math.abs(anomalyDelta) < 0.05 ? 'tie' : anomalyDelta < 0 ? 'A' : 'B',
    },
    {
      id: 'airTemp',
      label: 'Live Air Temp',
      valueA: airTempA != null ? `${airTempA.toFixed(1)} °C` : '—',
      valueB: airTempB != null ? `${airTempB.toFixed(1)} °C` : '—',
      deltaFormatted:
        airTempA != null && airTempB != null
          ? formatSigned(airTempA - airTempB, 1, ' °C')
          : '—',
      favored:
        airTempA == null || airTempB == null
          ? 'neutral'
          : Math.abs(airTempA - airTempB) < 0.1
            ? 'tie'
            : airTempA < airTempB
              ? 'A'
              : 'B',
    },
    {
      id: 'naqi',
      label: 'Live Air Quality (NAQI)',
      valueA: aqiA ? `${aqiA.aqi}` : '—',
      valueB: aqiB ? `${aqiB.aqi}` : '—',
      subA: aqiA ? aqiA.category.replace(' air quality', '') : undefined,
      subB: aqiB ? aqiB.category.replace(' air quality', '') : undefined,
      deltaFormatted:
        aqiA && aqiB ? formatSigned(aqiA.aqi - aqiB.aqi, 0, '') : '—',
      favored:
        !aqiA || !aqiB
          ? 'neutral'
          : aqiA.aqi === aqiB.aqi
            ? 'tie'
            : aqiA.aqi < aqiB.aqi
              ? 'A'
              : 'B',
    },
    {
      id: 'canopy',
      label: 'Green Canopy Cover',
      valueA: `${sectorA.greenCanopyPct.toFixed(1)}%`,
      valueB: `${sectorB.greenCanopyPct.toFixed(1)}%`,
      subA: `NDVI ${sectorA.ndviMean.toFixed(2)}`,
      subB: `NDVI ${sectorB.ndviMean.toFixed(2)}`,
      deltaFormatted: formatSigned(canopyDelta, 1, '%'),
      favored:
        Math.abs(canopyDelta) < 0.1 ? 'tie' : canopyDelta > 0 ? 'A' : 'B',
    },
    {
      id: 'impervious',
      label: 'Impervious Surface',
      valueA: `${sectorA.imperviousPct.toFixed(1)}%`,
      valueB: `${sectorB.imperviousPct.toFixed(1)}%`,
      deltaFormatted: formatSigned(imperviousDelta, 1, '%'),
      favored:
        Math.abs(imperviousDelta) < 0.1
          ? 'tie'
          : imperviousDelta < 0
            ? 'A'
            : 'B',
    },
    {
      id: 'albedo',
      label: 'Surface Albedo (α)',
      valueA: `${sectorA.albedoIndex.toFixed(2)} α`,
      valueB: `${sectorB.albedoIndex.toFixed(2)} α`,
      deltaFormatted: formatSigned(albedoDelta, 2, ' α'),
      favored:
        Math.abs(albedoDelta) < 0.01 ? 'tie' : albedoDelta > 0 ? 'A' : 'B',
    },
    {
      id: 'vulnerability',
      label: 'Vulnerability Index',
      valueA: `${vulnA.score}/100`,
      valueB: `${vulnB.score}/100`,
      subA: vulnA.tier,
      subB: vulnB.tier,
      deltaFormatted: `${vulnDelta > 0 ? '+' : ''}${vulnDelta} pts`,
      favored: vulnDelta === 0 ? 'tie' : vulnDelta < 0 ? 'A' : 'B',
    },
  ];

  const coolerSide =
    Math.abs(lstDelta) < 0.05
      ? 'Equal surface temperature'
      : lstDelta < 0
        ? `${sectorA.label} is ${Math.abs(lstDelta).toFixed(1)} °C cooler than ${sectorB.label}`
        : `${sectorB.label} is ${Math.abs(lstDelta).toFixed(1)} °C cooler than ${sectorA.label}`;

  return {
    sectorA,
    sectorB,
    rows,
    headlineSummary: coolerSide,
    lstDeltaC: Number(lstDelta.toFixed(1)),
    canopyDeltaPct: Number(canopyDelta.toFixed(1)),
    vulnerabilityDeltaPts: vulnDelta,
  };
}
