import {
  IndiaRegion,
  LiveEnvironmentData,
  SettlementTier,
} from './uhiModel';

export const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
export const OPEN_METEO_AIR_QUALITY_URL =
  'https://air-quality-api.open-meteo.com/v1/air-quality';
export const OPEN_METEO_GEOCODING_URL =
  'https://geocoding-api.open-meteo.com/v1/search';

export interface OpenMeteoWeatherCurrent {
  time?: string;
  temperature_2m?: number | null;
  relative_humidity_2m?: number | null;
  apparent_temperature?: number | null;
  weather_code?: number | null;
  wind_speed_10m?: number | null;
  wind_direction_10m?: number | null;
}

export interface OpenMeteoAirQualityCurrent {
  time?: string;
  us_aqi?: number | null;
  european_aqi?: number | null;
  pm2_5?: number | null;
  pm10?: number | null;
  nitrogen_dioxide?: number | null;
  ozone?: number | null;
}

export interface FallbackZoneHint {
  id?: string;
  lat: number;
  lng: number;
  subRegion?: Exclude<IndiaRegion, 'All India'>;
  tier?: SettlementTier;
  avgSurfaceTempC?: number;
  greenCanopyPct?: number;
}

const US_EPA_PM25_BANDS: Array<[number, number, number, number]> = [
  [0, 9.0, 0, 50],
  [9.1, 35.4, 51, 100],
  [35.5, 55.4, 101, 150],
  [55.5, 125.4, 151, 200],
  [125.5, 225.4, 201, 300],
  [225.5, 325.4, 301, 500],
];

export function computeUsAqiFromPm25(pm25: number): number {
  const c = Math.max(0, Number(pm25.toFixed(1)));
  for (const [bLow, bHigh, iLow, iHigh] of US_EPA_PM25_BANDS) {
    if (c <= bHigh) {
      const span = bHigh - bLow || 1;
      return Math.round(((iHigh - iLow) / span) * (c - bLow) + iLow);
    }
  }
  return 500;
}

export function getUsAqiCategory(usAqi: number): string {
  if (usAqi <= 50) return 'Good';
  if (usAqi <= 100) return 'Moderate';
  if (usAqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (usAqi <= 200) return 'Unhealthy';
  if (usAqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
}

export function wmoWeatherCodeToText(code?: number | null): string {
  if (code == null || !Number.isFinite(code)) return 'Clear / Fair';
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Haze / Fog';
  if (code >= 51 && code <= 57) return 'Light drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snowfall';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Partly cloudy';
}

export function degreesToCardinal(deg?: number | null): string | null {
  if (deg == null || !Number.isFinite(deg)) return null;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((deg % 360) / 45)) % 8];
}

/**
 * Generates deterministic, climatologically calibrated regional weather & air quality
 * values for India when an upstream Open-Meteo endpoint times out or the network is offline.
 */
export function buildFallbackEnvironment(
  hint: FallbackZoneHint
): LiveEnvironmentData {
  const lat = hint.lat;
  const isHimalayan = lat > 32.5;
  const isNortheastHill = hint.subRegion === 'Northeast' && lat > 25.0 && hint.lng > 91.8;
  const isNorthPlains = lat >= 25.2 && lat <= 31.2 && hint.lng >= 74 && hint.lng <= 86;
  const isCoastalSouth = lat < 15.5;

  const baseAirTemp = isHimalayan
    ? 6.4
    : isNortheastHill
      ? 16.5
      : isCoastalSouth
        ? 27.2
        : isNorthPlains
          ? 23.4
          : 25.6;

  const lstOffset =
    typeof hint.avgSurfaceTempC === 'number'
      ? (hint.avgSurfaceTempC - 37.5) * 0.22
      : 0;
  const temperatureC = Number((baseAirTemp + lstOffset).toFixed(1));
  const feelsLikeC = Number((temperatureC + (isCoastalSouth ? 2.4 : 0.8)).toFixed(1));
  const relativeHumidity = isHimalayan
    ? 38
    : isCoastalSouth
      ? 72
      : isNorthPlains
        ? 58
        : 54;
  const windSpeedKmh = isCoastalSouth ? 11.4 : isHimalayan ? 9.2 : 6.5;

  const canopy = hint.greenCanopyPct ?? 24;
  const pm25 = Number(
    (
      isHimalayan
        ? 11.5
        : isNorthPlains
          ? Math.max(48, 128 - canopy * 0.7)
          : Math.max(18, 56 - canopy * 0.42)
    ).toFixed(1)
  );
  const pm10 = Number((pm25 * 1.45).toFixed(1));
  const usAqi = computeUsAqiFromPm25(pm25);

  return {
    fetchedAt: new Date().toISOString(),
    source: 'fallback',
    weather: {
      available: true,
      isFallback: true,
      conditionText: isNorthPlains ? 'Haze / Fair' : 'Clear sky',
      weatherCode: isNorthPlains ? 45 : 1,
      temperatureC,
      feelsLikeC,
      relativeHumidity,
      windSpeedKmh,
      windCardinal: 'NW',
    },
    airQuality: {
      available: true,
      isFallback: true,
      dateTime: new Date().toISOString(),
      indexes: [
        {
          code: 'usa_epa',
          displayName: 'US AQI (Fallback)',
          aqi: usAqi,
          category: getUsAqiCategory(usAqi),
          dominantPollutant: 'pm25',
        },
      ],
      pollutants: [
        {
          code: 'pm25',
          displayName: 'PM2.5',
          concentration: { value: pm25, units: 'µg/m³' },
        },
        {
          code: 'pm10',
          displayName: 'PM10',
          concentration: { value: pm10, units: 'µg/m³' },
        },
      ],
    },
  };
}

/**
 * Combines Open-Meteo Weather & Air Quality `current` responses cleanly, seamlessly
 * merging calibrated regional fallback values if either Open-Meteo endpoint is unreachable.
 */
export function normalizeOpenMeteoPayload(params: {
  weatherCurrent?: OpenMeteoWeatherCurrent | null;
  aqCurrent?: OpenMeteoAirQualityCurrent | null;
  fallbackHint: FallbackZoneHint;
}): LiveEnvironmentData {
  const { weatherCurrent, aqCurrent, fallbackHint } = params;
  const fallback = buildFallbackEnvironment(fallbackHint);

  const hasWeather =
    weatherCurrent != null &&
    typeof weatherCurrent.temperature_2m === 'number' &&
    Number.isFinite(weatherCurrent.temperature_2m);

  const hasAq =
    aqCurrent != null &&
    (typeof aqCurrent.pm2_5 === 'number' || typeof aqCurrent.us_aqi === 'number');

  const weather = hasWeather
    ? {
        available: true,
        isFallback: false,
        conditionText: wmoWeatherCodeToText(weatherCurrent!.weather_code),
        weatherCode: weatherCurrent!.weather_code ?? null,
        temperatureC: Number(weatherCurrent!.temperature_2m!.toFixed(1)),
        feelsLikeC:
          typeof weatherCurrent!.apparent_temperature === 'number'
            ? Number(weatherCurrent!.apparent_temperature.toFixed(1))
            : Number(weatherCurrent!.temperature_2m!.toFixed(1)),
        relativeHumidity:
          typeof weatherCurrent!.relative_humidity_2m === 'number'
            ? Math.round(weatherCurrent!.relative_humidity_2m)
            : null,
        windSpeedKmh:
          typeof weatherCurrent!.wind_speed_10m === 'number'
            ? Number(weatherCurrent!.wind_speed_10m.toFixed(1))
            : null,
        windCardinal: degreesToCardinal(weatherCurrent!.wind_direction_10m),
      }
    : fallback.weather;

  let airQuality = fallback.airQuality;
  if (hasAq) {
    const pm25Val =
      typeof aqCurrent!.pm2_5 === 'number' && Number.isFinite(aqCurrent!.pm2_5)
        ? Number(aqCurrent!.pm2_5.toFixed(1))
        : null;
    const pm10Val =
      typeof aqCurrent!.pm10 === 'number' && Number.isFinite(aqCurrent!.pm10)
        ? Number(aqCurrent!.pm10.toFixed(1))
        : null;
    const usAqi =
      typeof aqCurrent!.us_aqi === 'number' && Number.isFinite(aqCurrent!.us_aqi)
        ? Math.round(aqCurrent!.us_aqi)
        : pm25Val != null
          ? computeUsAqiFromPm25(pm25Val)
          : 50;

    const indexes = [
      {
        code: 'usa_epa',
        displayName: 'US AQI (Open-Meteo)',
        aqi: usAqi,
        category: getUsAqiCategory(usAqi),
        dominantPollutant: 'pm25',
      },
    ];

    if (
      typeof aqCurrent!.european_aqi === 'number' &&
      Number.isFinite(aqCurrent!.european_aqi)
    ) {
      indexes.push({
        code: 'eaqi',
        displayName: 'European AQI',
        aqi: Math.round(aqCurrent!.european_aqi),
        category: 'EU AQI',
        dominantPollutant: 'pm25',
      });
    }

    const pollutants: NonNullable<LiveEnvironmentData['airQuality']['pollutants']> = [];
    if (pm25Val != null) {
      pollutants.push({
        code: 'pm25',
        displayName: 'PM2.5',
        concentration: { value: pm25Val, units: 'µg/m³' },
      });
    }
    if (pm10Val != null) {
      pollutants.push({
        code: 'pm10',
        displayName: 'PM10',
        concentration: { value: pm10Val, units: 'µg/m³' },
      });
    }
    if (
      typeof aqCurrent!.nitrogen_dioxide === 'number' &&
      Number.isFinite(aqCurrent!.nitrogen_dioxide)
    ) {
      pollutants.push({
        code: 'no2',
        displayName: 'NO₂',
        concentration: {
          value: Number(aqCurrent!.nitrogen_dioxide.toFixed(1)),
          units: 'µg/m³',
        },
      });
    }

    airQuality = {
      available: true,
      isFallback: false,
      dateTime: aqCurrent!.time ?? new Date().toISOString(),
      indexes,
      pollutants,
    };
  }

  return {
    fetchedAt: new Date().toISOString(),
    source: hasWeather || hasAq ? 'open-meteo' : 'fallback',
    weather,
    airQuality,
  };
}
