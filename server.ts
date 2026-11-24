import dns from 'node:dns';
dns.setDefaultResultOrder('ipv4first');

import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { INDIA_UHI_ZONES } from './src/data/indiaUhiZones';
import {
  FallbackZoneHint,
  OPEN_METEO_AIR_QUALITY_URL,
  OPEN_METEO_FORECAST_URL,
  OPEN_METEO_GEOCODING_URL,
  OpenMeteoAirQualityCurrent,
  OpenMeteoWeatherCurrent,
  buildFallbackEnvironment,
  normalizeOpenMeteoPayload,
} from './src/utils/openMeteo';
import { LiveEnvironmentData } from './src/utils/uhiModel';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const CACHE_TTL_MS = 15 * 60 * 1000;
const UPSTREAM_TIMEOUT_MS = 2800;

interface CachedEnvPayload {
  expiresAt: number;
  data: LiveEnvironmentData;
}

const environmentCache: Record<string, CachedEnvPayload> = {};
let weatherSkipUntil = 0;
let cartoWatermarkedUntil = 0;

interface CachedTile {
  contentType: string;
  body: Buffer;
}

const tileCache = new Map<string, CachedTile>();
// 1x1 transparent PNG
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function fetchJsonWithTimeout(
  url: string,
  timeoutMs: number = UPSTREAM_TIMEOUT_MS
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBinaryWithTimeout(
  url: string,
  timeoutMs: number = 3500
): Promise<{ status: number; etag: string; contentType: string; body: Buffer } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'UHI-India-Atlas/1.0' },
    });
    if (!resp.ok) return null;
    const arr = await resp.arrayBuffer();
    return {
      status: resp.status,
      etag: resp.headers.get('etag') || '',
      contentType: resp.headers.get('content-type') || 'image/png',
      body: Buffer.from(arr),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function findZoneHint(lat: number, lng: number, id?: string): FallbackZoneHint {
  if (id) {
    const match = INDIA_UHI_ZONES.find((z) => z.id === id);
    if (match) {
      return {
        id: match.id,
        lat: match.lat,
        lng: match.lng,
        subRegion: match.subRegion,
        tier: match.tier,
        avgSurfaceTempC: match.avgSurfaceTempC,
        greenCanopyPct: match.greenCanopyPct,
      };
    }
  }
  return { lat, lng };
}

function parseOpenMeteoList<T>(raw: unknown, expectedCount: number): Array<T | null> {
  if (!raw) return Array(expectedCount).fill(null);
  if (Array.isArray(raw)) {
    return Array.from({ length: expectedCount }, (_, idx) => {
      const item = raw[idx] as { current?: T } | undefined;
      return item?.current ?? null;
    });
  }
  const single = raw as { current?: T };
  if (expectedCount === 1 && single?.current) {
    return [single.current];
  }
  return Array(expectedCount).fill(null);
}

async function fetchOpenMeteoEnvironmentBatch(
  points: Array<{ id: string; lat: number; lng: number }>
): Promise<Record<string, LiveEnvironmentData>> {
  const output: Record<string, LiveEnvironmentData> = {};
  const missing: Array<{ id: string; lat: number; lng: number; cacheKey: string }> = [];
  const now = Date.now();

  for (const pt of points) {
    const cacheKey = `${pt.lat.toFixed(2)},${pt.lng.toFixed(2)}`;
    const cached = environmentCache[cacheKey];
    if (cached && cached.expiresAt > now) {
      output[pt.id] = cached.data;
    } else {
      missing.push({ ...pt, cacheKey });
    }
  }

  if (missing.length === 0) return output;

  // Open-Meteo supports multi-coordinate arrays; run chunks in parallel for sub-3s Pan-India sync
  const chunks: Array<Array<{ id: string; lat: number; lng: number; cacheKey: string }>> = [];
  for (let i = 0; i < missing.length; i += 25) {
    chunks.push(missing.slice(i, i + 25));
  }

  const skipWeatherNow = Date.now() < weatherSkipUntil;

  await Promise.all(
    chunks.map(async (chunk) => {
      const lats = chunk.map((p) => p.lat.toFixed(4)).join(',');
      const lngs = chunk.map((p) => p.lng.toFixed(4)).join(',');

      const weatherUrl = new URL(OPEN_METEO_FORECAST_URL);
      weatherUrl.searchParams.set('latitude', lats);
      weatherUrl.searchParams.set('longitude', lngs);
      weatherUrl.searchParams.set(
        'current',
        'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m'
      );
      weatherUrl.searchParams.set('timezone', 'Asia/Kolkata');

      const aqUrl = new URL(OPEN_METEO_AIR_QUALITY_URL);
      aqUrl.searchParams.set('latitude', lats);
      aqUrl.searchParams.set('longitude', lngs);
      aqUrl.searchParams.set(
        'current',
        'us_aqi,european_aqi,pm2_5,pm10,nitrogen_dioxide,ozone'
      );
      aqUrl.searchParams.set('timezone', 'Asia/Kolkata');

      const [weatherResult, aqResult] = await Promise.allSettled([
        skipWeatherNow ? Promise.resolve(null) : fetchJsonWithTimeout(weatherUrl.toString()),
        fetchJsonWithTimeout(aqUrl.toString()),
      ]);

      const weatherRaw = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
      if (!skipWeatherNow && weatherRaw === null) {
        weatherSkipUntil = Date.now() + 3 * 60 * 1000;
      }

      const weatherItems = parseOpenMeteoList<OpenMeteoWeatherCurrent>(
        weatherRaw,
        chunk.length
      );
      const aqItems = parseOpenMeteoList<OpenMeteoAirQualityCurrent>(
        aqResult.status === 'fulfilled' ? aqResult.value : null,
        chunk.length
      );

      for (let j = 0; j < chunk.length; j++) {
        const pt = chunk[j];
        const hint = findZoneHint(pt.lat, pt.lng, pt.id);
        const normalized = normalizeOpenMeteoPayload({
          weatherCurrent: weatherItems[j],
          aqCurrent: aqItems[j],
          fallbackHint: hint,
        });

        const cacheTtl = normalized.source === 'open-meteo' ? CACHE_TTL_MS : 60 * 1000;
        environmentCache[pt.cacheKey] = {
          expiresAt: Date.now() + cacheTtl,
          data: normalized,
        };
        output[pt.id] = normalized;
      }
    })
  );

  return output;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, region: 'India', provider: 'Open-Meteo + CartoDB Positron' });
  });

  // Live weather & air quality endpoint backed by free Open-Meteo APIs + calibrated fallback
  app.get('/api/environment', async (req, res) => {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const id = typeof req.query.id === 'string' ? req.query.id : 'single-point';

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res
        .status(400)
        .json({ error: 'Valid lat and lng query parameters are required.' });
    }

    try {
      const batch = await fetchOpenMeteoEnvironmentBatch([{ id, lat, lng }]);
      return res.json(
        batch[id] ?? buildFallbackEnvironment(findZoneHint(lat, lng, id))
      );
    } catch {
      return res.json(buildFallbackEnvironment(findZoneHint(lat, lng, id)));
    }
  });

  // Batched Open-Meteo weather & AQI telemetry for all India study sectors
  app.post('/api/environment/batch', async (req, res) => {
    const rawPoints = Array.isArray(req.body?.points) ? req.body.points : [];
    const points = rawPoints
      .filter(
        (p: { id?: unknown; lat?: unknown; lng?: unknown }) =>
          typeof p?.id === 'string' &&
          Number.isFinite(Number(p.lat)) &&
          Number.isFinite(Number(p.lng))
      )
      .slice(0, 60) as Array<{ id: string; lat: number; lng: number }>;

    if (points.length === 0) {
      return res.json({ results: {} });
    }

    try {
      const results = await fetchOpenMeteoEnvironmentBatch(
        points.map((p) => ({
          id: p.id,
          lat: Number(p.lat),
          lng: Number(p.lng),
        }))
      );
      return res.json({ results });
    } catch {
      const fallbackMap: Record<string, LiveEnvironmentData> = {};
      for (const p of points) {
        fallbackMap[p.id] = buildFallbackEnvironment(
          findZoneHint(Number(p.lat), Number(p.lng), p.id)
        );
      }
      return res.json({ results: fallbackMap });
    }
  });

  // India place search via free Open-Meteo Geocoding API
  app.get('/api/geocode', async (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (q.length < 2) {
      return res.json({ results: [] });
    }

    try {
      const url = new URL(OPEN_METEO_GEOCODING_URL);
      url.searchParams.set('name', q);
      url.searchParams.set('count', '6');
      url.searchParams.set('countryCode', 'IN');
      url.searchParams.set('language', 'en');
      url.searchParams.set('format', 'json');

      const data = (await fetchJsonWithTimeout(url.toString(), 4000)) as {
        results?: Array<{
          id: number;
          name: string;
          latitude: number;
          longitude: number;
          admin1?: string;
          admin2?: string;
          country?: string;
        }>;
      } | null;

      return res.json({ results: Array.isArray(data?.results) ? data.results : [] });
    } catch {
      return res.json({ results: [] });
    }
  });

  // Desaturated scientific tile proxy: uses CartoDB Positron / Dark Matter directly when unwatermarked,
  // and cleanly substitutes Esri World Light/Dark Gray Canvas + labels if CartoDB serves an API-key watermark.
  app.get('/api/tiles/:style/:z/:x/:y.png', async (req, res) => {
    const { style, z, x, y } = req.params;
    const zNum = Number(z);
    const xNum = Number(x);
    const yNum = Number(y);
    if (
      !Number.isInteger(zNum) ||
      !Number.isInteger(xNum) ||
      !Number.isInteger(yNum) ||
      zNum < 0 ||
      zNum > 19
    ) {
      return res.status(400).end();
    }

    const cacheKey = `${style}:${zNum}:${xNum}:${yNum}`;
    const cached = tileCache.get(cacheKey);
    if (cached) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(cached.body);
    }

    const saveTile = (contentType: string, body: Buffer) => {
      if (tileCache.size >= 1000) {
        const oldestKey = tileCache.keys().next().value;
        if (oldestKey) tileCache.delete(oldestKey);
      }
      tileCache.set(cacheKey, { contentType, body });
    };

    // Detailed Google-Maps-style Street & Topographic Outlines
    if (style === 'street') {
      const streetUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${zNum}/${yNum}/${xNum}`;
      const streetTile = await fetchBinaryWithTimeout(streetUrl, 3800);
      if (streetTile) {
        saveTile(streetTile.contentType, streetTile.body);
        res.setHeader('Content-Type', streetTile.contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(streetTile.body);
      }
      return res.status(502).end();
    }

    // Realistic Satellite Imagery
    if (style === 'satellite') {
      const satUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zNum}/${yNum}/${xNum}`;
      const satTile = await fetchBinaryWithTimeout(satUrl, 3800);
      if (satTile) {
        saveTile(satTile.contentType, satTile.body);
        res.setHeader('Content-Type', satTile.contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(satTile.body);
      }
      return res.status(502).end();
    }

    // Crisp Country/State/District Outlines & Place Labels Overlay
    if (style === 'satellite_labels' || style === 'borders') {
      const refUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${zNum}/${yNum}/${xNum}`;
      const refTile = await fetchBinaryWithTimeout(refUrl, 3500);
      if (refTile) {
        saveTile(refTile.contentType, refTile.body);
        res.setHeader('Content-Type', refTile.contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(refTile.body);
      }
      res.setHeader('Content-Type', 'image/png');
      return res.send(TRANSPARENT_PNG);
    }

    const cartoBlocked = Date.now() < cartoWatermarkedUntil;

    if (style === 'positron_labels' || style === 'dark_matter_labels') {
      if (!cartoBlocked) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.send(TRANSPARENT_PNG);
      }
      const refLayer =
        style === 'dark_matter_labels'
          ? 'World_Dark_Gray_Reference'
          : 'World_Light_Gray_Reference';
      const refUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${refLayer}/MapServer/tile/${zNum}/${yNum}/${xNum}`;
      const refTile = await fetchBinaryWithTimeout(refUrl, 3500);
      if (refTile) {
        saveTile(refTile.contentType, refTile.body);
        res.setHeader('Content-Type', refTile.contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(refTile.body);
      }
      res.setHeader('Content-Type', 'image/png');
      return res.send(TRANSPARENT_PNG);
    }

    const isDarkTile = style === 'dark_matter';
    if (!cartoBlocked) {
      const sub = ['a', 'b', 'c', 'd'][(xNum + yNum) % 4];
      const cartoPath = isDarkTile ? 'dark_all' : 'light_all';
      const cartoUrl = `https://${sub}.basemaps.cartocdn.com/${cartoPath}/${zNum}/${xNum}/${yNum}.png`;
      const cartoTile = await fetchBinaryWithTimeout(cartoUrl, 2500);
      const isWatermarked =
        !cartoTile ||
        cartoTile.etag.includes('wm-') ||
        cartoTile.body.byteLength <= 2500;
      if (cartoTile && !isWatermarked) {
        saveTile(cartoTile.contentType, cartoTile.body);
        res.setHeader('Content-Type', cartoTile.contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(cartoTile.body);
      }
      cartoWatermarkedUntil = Date.now() + 15 * 60 * 1000;
    }

    const esriLayer = isDarkTile ? 'World_Dark_Gray_Base' : 'World_Light_Gray_Base';
    const esriUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/${esriLayer}/MapServer/tile/${zNum}/${yNum}/${xNum}`;
    const esriTile = await fetchBinaryWithTimeout(esriUrl, 3500);
    if (esriTile) {
      saveTile(esriTile.contentType, esriTile.body);
      res.setHeader('Content-Type', esriTile.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(esriTile.body);
    }

    return res.status(502).end();
  });

  // Server-side Gemini AI chat endpoint grounded in India UHI map areas & live Open-Meteo telemetry
  app.post('/api/chat', async (req, res) => {
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server.',
      });
    }

    const { messages, selectedSector, liveEnvironment, allSectorsSummary, activeLayer } =
      req.body ?? {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const systemInstruction = `You are THERMA, the THERMALLABS India Climate & Voice Analyst, an expert environmental science and urban microclimate assistant embedded inside the Urban Heat Island (UHI) Visualizer & Analytics web application for India.

Your role:
- Answer user queries accurately about any Indian region, city, Tier 1/2/3 town, or rural area included on the Leaflet CartoDB Positron map (North & NCR, West, South, East, Central, Northeast India), as well as the currently selected sector or custom pinned place.
- CRITICAL AQI ACCURACY RULE: Cite both the Indian National Air Quality Index (NAQI / CPCB 0–500 scale: 0–50 Good, 51–100 Satisfactory, 101–200 Moderate, 201–300 Poor, 301–400 Very Poor, 401–500 Severe) calculated from live PM2.5/PM10 and Open-Meteo US AQI when provided—keep answers clear and grounded in real sensor readings.
- Cite concrete metrics from the provided study dataset and Open-Meteo Weather/AQI telemetry when relevant (Land Surface Temperature LST, Temperature Anomaly vs. 36.5°C India rural baseline, Green Canopy %, Impervious Surface %, Albedo α, NDVI, Vulnerability Index, Settlement Tier, and live Air Temp/RH/NAQI/US AQI/PM2.5).
- Explain microclimate mechanisms clearly (evapotranspiration, urban canyon geometry, albedo reflectance, nocturnal thermal inertia, winter boundary-layer particulate trapping) and recommend practical cooling interventions.
- Keep answers concise, clear for both reading and voice playback, and strictly grounded in the map context provided below. Do not fabricate sensor measurements you were not given.
- Format responses cleanly using short paragraphs and plain "- " bullet lines. Do NOT output Markdown heading hashes (such as "###" or "##") or "**" asterisks.

Active Map Context:
- Active Map Layer: ${String(activeLayer ?? 'temperature')}
- Selected Sector: ${JSON.stringify(selectedSector ?? null)}
- Live Open-Meteo Weather & AQI for Selected Sector: ${JSON.stringify(liveEnvironment ?? null)}
- All India Sectors Currently on Map (with live NAQI & air temp when loaded): ${JSON.stringify(allSectorsSummary ?? [])}`;

    const recentMessages = messages.slice(-10).map((m: { role?: string; content?: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content ?? '') }],
    }));

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: recentMessages,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const replyText = response.text?.trim();
      if (!replyText) {
        return res.status(502).json({ error: 'Empty response returned by AI model.' });
      }

      return res.json({ reply: replyText });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to generate AI response.';
      const status = message.includes('429') || message.includes('RESOURCE_EXHAUSTED')
        ? 429
        : 500;
      return res.status(status).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
