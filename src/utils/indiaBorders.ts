import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson';
import type { PathOptions } from 'leaflet';
import { INDIA_NATIONAL_BOUNDARY } from '../data/indiaNationalBoundary';
import { INDIA_STATES_BOUNDARY } from '../data/indiaStatesBoundary';

export type IndiaBasemapStyle = 'street' | 'satellite' | 'minimal';

export { INDIA_NATIONAL_BOUNDARY, INDIA_STATES_BOUNDARY };

function ringSpanDegrees(ring: Position[]): number {
  let minLng = 180;
  let maxLng = -180;
  let minLat = 90;
  let maxLat = -90;
  for (const pt of ring) {
    if (pt[0] < minLng) minLng = pt[0];
    if (pt[0] > maxLng) maxLng = pt[0];
    if (pt[1] < minLat) minLat = pt[1];
    if (pt[1] > maxLat) maxLat = pt[1];
  }
  return Math.max(maxLng - minLng, maxLat - minLat);
}

/**
 * Builds an inverse world mask with India's true Survey of India mainland and
 * major islands punched out as holes so external regions and stray disputed
 * tile lines visually recede while India's silhouette stands out cleanly.
 */
export function buildIndiaExteriorMask(
  nationalBoundary: FeatureCollection<MultiPolygon, { name: string }> = INDIA_NATIONAL_BOUNDARY
): Feature<Polygon> {
  const worldOuterRing: Position[] = [
    [-180, -85],
    [180, -85],
    [180, 85],
    [-180, 85],
    [-180, -85],
  ];

  const holes: Position[][] = [];
  for (const feature of nationalBoundary.features) {
    for (const poly of feature.geometry.coordinates) {
      const exteriorRing = poly[0];
      if (!exteriorRing || exteriorRing.length < 4) continue;
      if (ringSpanDegrees(exteriorRing) >= 0.12) {
        holes.push(exteriorRing);
      }
    }
  }

  return {
    type: 'Feature',
    properties: { role: 'india-exterior-mask' },
    geometry: {
      type: 'Polygon',
      coordinates: [worldOuterRing, ...holes],
    },
  };
}

export interface IndiaBorderLayerStyles {
  exteriorMask: PathOptions;
  stateBorders: PathOptions;
  nationalHalo: PathOptions;
  nationalOutline: PathOptions;
}

export function getIndiaBorderLayerStyles(
  isDark: boolean,
  basemap: IndiaBasemapStyle
): IndiaBorderLayerStyles {
  if (isDark) {
    return {
      exteriorMask: {
        stroke: false,
        fillColor: '#000000',
        fillOpacity: basemap === 'satellite' ? 0.34 : 0.44,
        fillRule: 'evenodd',
      },
      stateBorders: {
        color: basemap === 'satellite' ? '#facc15' : '#eab308',
        weight: 1.05,
        opacity: basemap === 'satellite' ? 0.65 : 0.55,
        dashArray: '3 3',
        fillColor: '#000000',
        fillOpacity: basemap === 'street' ? 0.08 : 0.02,
      },
      nationalHalo: {
        color: '#000000',
        weight: 5,
        opacity: 0.88,
        lineJoin: 'round',
        lineCap: 'round',
        fill: false,
      },
      nationalOutline: {
        color: '#facc15',
        weight: 2.3,
        opacity: 0.98,
        lineJoin: 'round',
        lineCap: 'round',
        fill: false,
      },
    };
  }

  if (basemap === 'satellite') {
    return {
      exteriorMask: {
        stroke: false,
        fillColor: '#090d16',
        fillOpacity: 0.36,
        fillRule: 'evenodd',
      },
      stateBorders: {
        color: '#e2e8f0',
        weight: 1.05,
        opacity: 0.65,
        dashArray: '3 3',
        fill: false,
      },
      nationalHalo: {
        color: '#0f172a',
        weight: 4.8,
        opacity: 0.78,
        lineJoin: 'round',
        lineCap: 'round',
        fill: false,
      },
      nationalOutline: {
        color: '#ffffff',
        weight: 2.2,
        opacity: 0.98,
        lineJoin: 'round',
        lineCap: 'round',
        fill: false,
      },
    };
  }

  return {
    exteriorMask: {
      stroke: false,
      fillColor: '#cbd5e1',
      fillOpacity: basemap === 'minimal' ? 0.28 : 0.34,
      fillRule: 'evenodd',
    },
    stateBorders: {
      color: '#475569',
      weight: 1.05,
      opacity: basemap === 'minimal' ? 0.6 : 0.52,
      dashArray: '3 3',
      fillColor: '#ffffff',
      fillOpacity: basemap === 'street' ? 0.1 : 0.03,
    },
    nationalHalo: {
      color: '#ffffff',
      weight: 4.8,
      opacity: 0.9,
      lineJoin: 'round',
      lineCap: 'round',
      fill: false,
    },
    nationalOutline: {
      color: '#0f172a',
      weight: 2.2,
      opacity: 0.96,
      lineJoin: 'round',
      lineCap: 'round',
      fill: false,
    },
  };
}

export function computeGeoJsonBounds(
  collection: FeatureCollection
): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  const walk = (coords: unknown): void => {
    if (!Array.isArray(coords) || coords.length === 0) return;
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const lng = coords[0];
      const lat = coords[1];
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      return;
    }
    for (const child of coords) walk(child);
  };

  for (const feature of collection.features) {
    if (feature.geometry && 'coordinates' in feature.geometry) {
      walk(feature.geometry.coordinates);
    }
  }

  return { minLat, maxLat, minLng, maxLng };
}
