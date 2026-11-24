import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildHexFootprint,
  computeIndiaSummary,
  computeLinearRegression,
  computeVulnerabilityIndex,
  filterSectors,
  formatDiurnalCurve,
  getLayerMetricValue,
  getSectorFillColor,
  interpolateSequentialColor,
  LAYER_SCALES,
  LiveEnvironmentData,
  resolveIndianAqi,
  resolveUsAqi,
  sortSectors,
} from './uhiModel';
import {
  buildFallbackEnvironment,
  computeUsAqiFromPm25,
  normalizeOpenMeteoPayload,
  wmoWeatherCodeToText,
} from './openMeteo';
import { INDIA_UHI_ZONES } from '../data/indiaUhiZones';
import {
  loadEnvironmentCache,
  loadLastViewedState,
  saveEnvironmentCache,
  saveLastViewedState,
  StorageLike,
} from './offlineCache';
import {
  INDIA_NATIONAL_BOUNDARY,
  INDIA_STATES_BOUNDARY,
  buildIndiaExteriorMask,
  computeGeoJsonBounds,
  getIndiaBorderLayerStyles,
} from './indiaBorders';
import { getLegendSpec, LEGEND_TAB_ORDER } from './legendSpecs';
import {
  computeNeighborhoodComparison,
  pickDefaultComparisonPartner,
} from './comparisonMetrics';

test('dataset covers 30+ Indian cities/rural zones across all 6 macro-regions and all 4 tiers with valid coordinates', () => {
  const regions = new Set(INDIA_UHI_ZONES.map((z) => z.subRegion));
  assert.deepEqual(
    Array.from(regions).sort(),
    ['Central', 'East', 'North & NCR', 'Northeast', 'South', 'West'].sort()
  );

  const uniqueCities = new Set(INDIA_UHI_ZONES.map((z) => z.city));
  assert.ok(
    uniqueCities.size >= 30,
    `Expected at least 30 distinct cities/rural areas, got ${uniqueCities.size}`
  );

  const tiers = new Set(INDIA_UHI_ZONES.map((z) => z.tier));
  assert.deepEqual(
    Array.from(tiers).sort(),
    ['Rural', 'Tier 1', 'Tier 2', 'Tier 3'].sort()
  );

  for (const z of INDIA_UHI_ZONES) {
    assert.ok(z.lat >= 6 && z.lat <= 37, `Invalid India latitude for ${z.id}: ${z.lat}`);
    assert.ok(z.lng >= 68 && z.lng <= 98, `Invalid India longitude for ${z.id}: ${z.lng}`);
  }
});

test('Open-Meteo normalizer computes CPCB NAQI (IN) + US AQI and supports resilient fallback', () => {
  const normalized = normalizeOpenMeteoPayload({
    weatherCurrent: {
      temperature_2m: 24.6,
      relative_humidity_2m: 62,
      apparent_temperature: 25.8,
      weather_code: 2,
      wind_speed_10m: 8.4,
      wind_direction_10m: 270,
    },
    aqCurrent: {
      time: '2026-11-15T04:00',
      us_aqi: 158,
      pm2_5: 45.3,
      pm10: 56.0,
    },
    fallbackHint: { lat: 28.63, lng: 77.21 },
  });

  assert.equal(normalized.source, 'open-meteo');
  assert.equal(normalized.weather.temperatureC, 24.6);
  assert.equal(normalized.weather.relativeHumidity, 62);
  assert.equal(normalized.weather.conditionText, 'Partly cloudy');
  assert.equal(resolveUsAqi(normalized), 158);

  const indianAqi = resolveIndianAqi(normalized);
  assert.ok(indianAqi);
  assert.equal(indianAqi.source, 'cpcb_calculated');
  assert.ok(indianAqi.aqi >= 70 && indianAqi.aqi <= 90);

  // Fallback when both Open-Meteo endpoints time out
  const fallbackOnly = normalizeOpenMeteoPayload({
    weatherCurrent: null,
    aqCurrent: null,
    fallbackHint: {
      lat: 28.63,
      lng: 77.21,
      subRegion: 'North & NCR',
      avgSurfaceTempC: 41.6,
      greenCanopyPct: 11.4,
    },
  });
  assert.equal(fallbackOnly.source, 'fallback');
  assert.equal(fallbackOnly.weather.available, true);
  assert.equal(fallbackOnly.airQuality.available, true);
  assert.ok(resolveIndianAqi(fallbackOnly) !== null);
  assert.ok(resolveUsAqi(fallbackOnly) !== null);

  assert.equal(wmoWeatherCodeToText(0), 'Clear sky');
  assert.ok(computeUsAqiFromPm25(45.3) > 100);
  const directFallback = buildFallbackEnvironment({ lat: 12.97, lng: 77.59 });
  assert.equal(directFallback.weather.isFallback, true);
});

test('resolveIndianAqi strictly uses ind_cpcb NAQI (IN) when present and CPCB PM2.5/PM10 sub-index otherwise', () => {
  const delhiPayload: LiveEnvironmentData = {
    fetchedAt: '2026-11-14T20:00:00Z',
    weather: { available: true, temperatureC: 20.8 },
    airQuality: {
      available: true,
      dateTime: '2026-11-14T20:00:00Z',
      indexes: [
        {
          code: 'uaqi',
          displayName: 'Universal AQI',
          aqi: 14,
          category: 'Poor air quality',
          dominantPollutant: 'pm25',
        },
        {
          code: 'ind_cpcb',
          displayName: 'NAQI (IN)',
          aqi: 399,
          category: 'Very poor air quality',
          dominantPollutant: 'pm25',
        },
      ],
      pollutants: [
        { code: 'pm25', concentration: { value: 226.26 } },
        { code: 'pm10', concentration: { value: 270.66 } },
      ],
    },
  };

  const reading = resolveIndianAqi(delhiPayload);
  assert.ok(reading);
  assert.equal(reading.aqi, 399);
  assert.equal(reading.source, 'ind_cpcb');
  assert.equal(reading.category, 'Very poor air quality');

  const lehPayload: LiveEnvironmentData = {
    fetchedAt: '2026-11-14T20:00:00Z',
    weather: { available: true, temperatureC: -7.3 },
    airQuality: {
      available: true,
      dateTime: '2026-11-14T20:00:00Z',
      indexes: [
        {
          code: 'usa_epa',
          displayName: 'AQI (US)',
          aqi: 45,
          category: 'Good air quality',
        },
      ],
      pollutants: [
        { code: 'pm25', concentration: { value: 7.15 } },
        { code: 'pm10', concentration: { value: 10.83 } },
      ],
    },
  };

  const lehReading = resolveIndianAqi(lehPayload);
  assert.ok(lehReading);
  assert.equal(lehReading.source, 'cpcb_calculated');
  assert.equal(lehReading.aqi, 12);
  assert.equal(lehReading.category, 'Good air quality');
});

test('sortSectors differentiates places High->Low and Low->High by AQI and Temperature', () => {
  const sample = INDIA_UHI_ZONES.slice(0, 4);
  const makeEnv = (aqi: number, tempC: number): LiveEnvironmentData => ({
    fetchedAt: '2026-11-14T20:00:00Z',
    weather: { available: true, temperatureC: tempC },
    airQuality: {
      available: true,
      indexes: [{ code: 'ind_cpcb', aqi, category: 'Test' }],
      pollutants: [],
    },
  });

  const envMap: Record<string, LiveEnvironmentData> = {
    'dl-01': makeEnv(399, 20.8),
    'dl-03': makeEnv(240, 19.5),
    'dl-07': makeEnv(430, 21.4),
  };

  const aqiHighToLow = sortSectors(sample, 'aqi-desc', envMap);
  assert.deepEqual(
    aqiHighToLow.map((s) => s.id),
    ['dl-07', 'dl-01', 'dl-03', 'gg-01']
  );

  const aqiLowToHigh = sortSectors(sample, 'aqi-asc', envMap);
  assert.deepEqual(
    aqiLowToHigh.map((s) => s.id),
    ['dl-03', 'dl-01', 'dl-07', 'gg-01']
  );

  const lstHighToLow = sortSectors(sample, 'temp-desc', envMap);
  assert.deepEqual(
    lstHighToLow.map((s) => s.id),
    ['dl-07', 'dl-01', 'gg-01', 'dl-03']
  );

  const lstLowToHigh = sortSectors(sample, 'temp-asc', envMap);
  assert.deepEqual(
    lstLowToHigh.map((s) => s.id),
    ['dl-03', 'gg-01', 'dl-01', 'dl-07']
  );

  const airLowToHigh = sortSectors(sample, 'air-temp-asc', envMap);
  assert.deepEqual(
    airLowToHigh.map((s) => s.id),
    ['dl-03', 'dl-01', 'dl-07', 'gg-01']
  );
});

test('vulnerability index ranks Anand Vihar / Naroda higher than Shillong / Sanjay Van', () => {
  const shillong = INDIA_UHI_ZONES.find((s) => s.id === 'ml-01');
  const anandVihar = INDIA_UHI_ZONES.find((s) => s.id === 'dl-07');
  assert.ok(shillong);
  assert.ok(anandVihar);

  const parkVuln = computeVulnerabilityIndex(shillong);
  const transitVuln = computeVulnerabilityIndex(anandVihar);

  assert.equal(parkVuln.tier, 'Low');
  assert.equal(transitVuln.tier, 'Severe');
  assert.ok(transitVuln.score > parkVuln.score + 55);
});

test('linear regression confirms strong canopy cooling slope across all-India zones', () => {
  const points = INDIA_UHI_ZONES.map((s) => ({
    x: s.greenCanopyPct,
    y: s.tempAnomalyC,
  }));
  const regression = computeLinearRegression(points);

  assert.ok(regression.slope < -0.09, `Expected slope < -0.09, got ${regression.slope}`);
  assert.ok(regression.rSquared > 0.80, `Expected R^2 > 0.80, got ${regression.rSquared}`);
});

test('filterSectors filters by Indian region, tier, city, and land-use classification', () => {
  const south = filterSectors(INDIA_UHI_ZONES, '', 'All', 'South');
  assert.ok(south.length >= 8);

  const rural = filterSectors(INDIA_UHI_ZONES, '', 'All', 'All India', 'Rural');
  assert.ok(rural.length >= 6);

  const tier3 = filterSectors(INDIA_UHI_ZONES, '', 'All', 'All India', 'Tier 3');
  assert.ok(tier3.length >= 7);

  const mumbai = filterSectors(INDIA_UHI_ZONES, 'Mumbai');
  assert.equal(mumbai.length, 2);

  const empty = filterSectors(INDIA_UHI_ZONES, 'nonexistent-indian-locality');
  assert.equal(empty.length, 0);
});

test('layer metric formatting and color interpolation work across all 4 UHI & NAQI layers', () => {
  const cp = INDIA_UHI_ZONES.find((s) => s.id === 'dl-01')!;
  assert.equal(getLayerMetricValue(cp, 'temperature').formatted, '+5.1 °C');
  assert.equal(getLayerMetricValue(cp, 'landcover').formatted, '11.4% canopy');
  assert.equal(getLayerMetricValue(cp, 'albedo').formatted, '0.17 α');

  const delhiEnv: LiveEnvironmentData = {
    fetchedAt: '2026-11-14T20:00:00Z',
    weather: { available: true, temperatureC: 20.8 },
    airQuality: {
      available: true,
      indexes: [{ code: 'ind_cpcb', aqi: 399, category: 'Very poor air quality' }],
      pollutants: [],
    },
  };
  assert.equal(getLayerMetricValue(cp, 'aqi', delhiEnv).shortFormatted, '399');

  const minColor = interpolateSequentialColor(
    -99,
    LAYER_SCALES.temperature.min,
    LAYER_SCALES.temperature.max,
    LAYER_SCALES.temperature.stops
  );
  assert.equal(minColor, 'rgb(59, 110, 140)');

  const fill = getSectorFillColor(cp, 'albedo');
  assert.match(fill, /^rgb\(\d+, \d+, \d+\)$/);
});

test('buildHexFootprint produces valid 6-vertex closed-loop ring coordinates', () => {
  const center = { lat: 19.076, lng: 72.8777 };
  const hex = buildHexFootprint(center, {
    north: 19.09,
    south: 19.06,
    east: 72.89,
    west: 72.86,
  });
  assert.equal(hex.length, 6);
  for (const pt of hex) {
    assert.ok(Math.abs(pt.lat - center.lat) < 0.08);
    assert.ok(Math.abs(pt.lng - center.lng) < 0.08);
  }
});

test('diurnal curve and India summary calculate peak profiles accurately', () => {
  const summary = computeIndiaSummary(INDIA_UHI_ZONES);
  assert.equal(summary.maxAnomalyC, 6.8);
  assert.equal(summary.minAnomalyC, -4.0);

  const naroda = INDIA_UHI_ZONES.find((s) => s.id === 'gj-01')!;
  const curve = formatDiurnalCurve(naroda, summary.ruralBaselineC);
  assert.equal(curve.length, 8);
  const afternoon = curve.find((p) => p.hour === '15:00')!;
  const dawn = curve.find((p) => p.hour === '06:00')!;
  assert.ok(afternoon.sectorTempC > dawn.sectorTempC);
});

test('offlineCache persists and restores last viewed neighborhood and expired cache when offline', () => {
  const store = new Map<string, string>();
  const mockStorage: StorageLike = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v);
    },
  };

  saveLastViewedState(
    {
      selectedSectorId: 'ka-01',
      activeLayer: 'aqi',
      customPins: [],
      savedAt: '2026-11-15T00:00:00Z',
    },
    mockStorage
  );

  const restored = loadLastViewedState(mockStorage);
  assert.ok(restored);
  assert.equal(restored.selectedSectorId, 'ka-01');
  assert.equal(restored.activeLayer, 'aqi');

  const staleEnv = buildFallbackEnvironment({
    id: 'ka-01',
    lat: 12.97,
    lng: 77.59,
    subRegion: 'South',
  });
  staleEnv.fetchedAt = '2026-01-01T00:00:00Z';
  saveEnvironmentCache({ 'ka-01': staleEnv }, mockStorage);

  // Online mode skips expired entries
  const onlineLoaded = loadEnvironmentCache(
    { ignoreExpiry: false, nowMs: Date.parse('2026-11-15T00:00:00Z') },
    mockStorage
  );
  assert.equal(Object.keys(onlineLoaded).length, 0);

  // Offline mode preserves last viewed telemetry regardless of TTL
  const offlineLoaded = loadEnvironmentCache(
    { ignoreExpiry: true },
    mockStorage
  );
  assert.ok(offlineLoaded['ka-01']);
  assert.equal(offlineLoaded['ka-01'].weather.temperatureC, staleEnv.weather.temperatureC);
});

test('indiaBorders includes full official India boundary (J&K + Ladakh), all 37 states/UTs, and exterior mask', () => {
  const natBounds = computeGeoJsonBounds(INDIA_NATIONAL_BOUNDARY);
  assert.ok(natBounds.maxLat > 37.0, `Expected northernmost India > 37.0°N, got ${natBounds.maxLat}`);
  assert.ok(natBounds.minLat < 7.0, `Expected southernmost India < 7.0°N, got ${natBounds.minLat}`);
  assert.ok(natBounds.minLng < 68.5, `Expected westernmost India < 68.5°E, got ${natBounds.minLng}`);
  assert.ok(natBounds.maxLng > 97.3, `Expected easternmost India > 97.3°E, got ${natBounds.maxLng}`);

  assert.equal(INDIA_STATES_BOUNDARY.features.length, 37);
  const ids = new Set(INDIA_STATES_BOUNDARY.features.map((f) => f.properties.id));
  assert.ok(ids.has('IN-LA'));
  assert.ok(ids.has('IN-JK'));
  assert.ok(ids.has('IN-TG'));
  assert.ok(ids.has('IN-AR'));
  assert.ok(ids.has('IN-AN'));

  const mask = buildIndiaExteriorMask(INDIA_NATIONAL_BOUNDARY);
  assert.equal(mask.geometry.type, 'Polygon');
  assert.ok(mask.geometry.coordinates.length >= 10);

  const lightStreet = getIndiaBorderLayerStyles(false, 'street');
  const darkStreet = getIndiaBorderLayerStyles(true, 'street');
  assert.equal(darkStreet.nationalOutline.color, '#facc15');
  assert.equal(lightStreet.nationalOutline.color, '#0f172a');
});

test('legendSpecs provides scientific color-coding bands and valid RGB swatches for temperature, AQI, land-cover, and albedo', () => {
  assert.deepEqual(LEGEND_TAB_ORDER, ['temperature', 'aqi', 'landcover', 'albedo']);

  const tempSpec = getLegendSpec('temperature');
  assert.equal(tempSpec.bands.length, 5);
  assert.match(tempSpec.methodology, /Landsat|36\.5/i);

  const aqiSpec = getLegendSpec('aqi');
  assert.equal(aqiSpec.bands.length, 6);
  assert.deepEqual(
    aqiSpec.bands.map((b) => b.title),
    ['Good', 'Satisfactory', 'Moderate', 'Poor', 'Very Poor', 'Severe']
  );

  const lcSpec = getLegendSpec('landcover');
  assert.equal(lcSpec.bands.length, 5);
  assert.match(lcSpec.methodology, /NDVI|canopy/i);

  for (const layer of LEGEND_TAB_ORDER) {
    const spec = getLegendSpec(layer);
    assert.ok(spec.gradientCss.startsWith('linear-gradient('));
    for (const band of spec.bands) {
      assert.match(band.color, /^rgb\(\d+, \d+, \d+\)$/);
      assert.ok(band.rangeLabel.length > 0 && band.detail.length > 0);
    }
  }
});

test('comparisonMetrics selects contrasting partner and computes exact 8-row deltas & favored zones', () => {
  const resolved = INDIA_UHI_ZONES.map((z) => ({
    ...z,
    placeId: z.id,
    displayName: z.label,
    formattedAddress: z.formattedAddress ?? `${z.label}, ${z.city}, ${z.state}, India`,
    location: { lat: z.lat, lng: z.lng },
    viewport: null,
    footprintPolygon: buildHexFootprint({ lat: z.lat, lng: z.lng }, null),
  }));

  const cp = resolved.find((s) => s.id === 'dl-01')!;
  const naroda = resolved.find((s) => s.id === 'gj-01')!;
  const cubbon = resolved.find((s) => s.id === 'ka-02')!;

  const defaultPartner = pickDefaultComparisonPartner(resolved, cp.id);
  assert.ok(defaultPartner);
  assert.notEqual(defaultPartner.id, cp.id);
  assert.equal(defaultPartner.city, cp.city);

  const envNaroda: LiveEnvironmentData = {
    fetchedAt: '2026-11-15T00:00:00Z',
    weather: { available: true, temperatureC: 33.4 },
    airQuality: {
      available: true,
      indexes: [{ code: 'ind_cpcb', aqi: 210, category: 'Poor air quality' }],
      pollutants: [],
    },
  };
  const envCubbon: LiveEnvironmentData = {
    fetchedAt: '2026-11-15T00:00:00Z',
    weather: { available: true, temperatureC: 24.8 },
    airQuality: {
      available: true,
      indexes: [{ code: 'ind_cpcb', aqi: 54, category: 'Satisfactory air quality' }],
      pollutants: [],
    },
  };

  const summary = computeNeighborhoodComparison(naroda, cubbon, envNaroda, envCubbon);
  assert.equal(summary.rows.length, 8);

  const expectedDelta = (naroda.avgSurfaceTempC - cubbon.avgSurfaceTempC).toFixed(1);
  const lstRow = summary.rows.find((r) => r.id === 'lst')!;
  assert.equal(lstRow.favored, 'B');
  assert.equal(lstRow.deltaFormatted, `+${expectedDelta} °C`);

  const canopyRow = summary.rows.find((r) => r.id === 'canopy')!;
  assert.equal(canopyRow.favored, 'B');
  assert.ok(canopyRow.deltaFormatted.startsWith('-'));

  const naqiRow = summary.rows.find((r) => r.id === 'naqi')!;
  assert.equal(naqiRow.valueA, '210');
  assert.equal(naqiRow.valueB, '54');
  assert.equal(naqiRow.deltaFormatted, '+156');
  assert.equal(naqiRow.favored, 'B');

  assert.equal(
    summary.headlineSummary,
    `${cubbon.label} is ${expectedDelta} °C cooler than ${naroda.label}`
  );
});



