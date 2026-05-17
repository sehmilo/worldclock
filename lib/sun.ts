/**
 * Solar terminator math.
 *
 * Computes the day/night boundary on Earth for any given UTC instant and
 * returns a GeoJSON polygon covering the night side. Also exposes a helper
 * to check whether the sun is above the horizon at a given point.
 */

import type { Feature, FeatureCollection, LineString, Point, Polygon } from 'geojson';

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

function solarDeclination(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start) / 86_400_000);
  return 23.45 * Math.sin(((2 * Math.PI) / 365) * (dayOfYear - 81));
}

function subsolarLongitude(date: Date): number {
  const hoursUTC =
    date.getUTCHours() +
    date.getUTCMinutes() / 60 +
    date.getUTCSeconds() / 3600;
  let lng = -((hoursUTC - 12) * 15);
  if (lng > 180) lng -= 360;
  if (lng < -180) lng += 360;
  return lng;
}

export function buildNightPolygon(date: Date): Feature<Polygon> {
  let dec = solarDeclination(date);
  if (Math.abs(dec) < 0.01) dec = dec >= 0 ? 0.01 : -0.01;

  const subLng = subsolarLongitude(date);
  const tanDec = Math.tan(dec * DEG);

  const terminator: [number, number][] = [];
  for (let lng = -180; lng <= 180; lng += 1) {
    const ha = (lng - subLng) * DEG;
    const lat = Math.atan(-Math.cos(ha) / tanDec) * RAD;
    terminator.push([lng, lat]);
  }

  const darkPole = dec > 0 ? -90 : 90;

  const coords: [number, number][] = [
    ...terminator,
    [180, darkPole],
    [-180, darkPole],
    terminator[0],
  ];

  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coords] },
  };
}

/**
 * Build vertical meridian lines and label points at fixed UTC-offset
 * intervals. Default = every 4 hours of longitude (60° spacing).
 * The user asked for spacing greater than 3 hours, so 4 hours = 7 lines
 * across the globe (−12, −8, −4, GMT, +4, +8, +12).
 */
export function buildMeridianFeatures(): {
  lines: FeatureCollection<LineString>;
  labels: FeatureCollection<Point>;
} {
  const lineFeatures: Feature<LineString>[] = [];
  const labelFeatures: Feature<Point>[] = [];

  for (let h = -12; h <= 12; h += 4) {
    const lng = h * 15; // 15° per hour
    const isGMT = h === 0;
    const isDateLine = Math.abs(h) === 12;

    lineFeatures.push({
      type: 'Feature',
      properties: { hours: h, isGMT, isDateLine },
      geometry: { type: 'LineString', coordinates: [[lng, -82], [lng, 82]] },
    });

    let label: string;
    if (isGMT) label = 'GMT';
    else if (isDateLine) label = '±12';
    else label = h > 0 ? `+${h}h` : `${h}h`;

    labelFeatures.push({
      type: 'Feature',
      properties: { label, isGMT, isDateLine },
      geometry: { type: 'Point', coordinates: [lng, 72] },
    });
  }

  return {
    lines: { type: 'FeatureCollection', features: lineFeatures },
    labels: { type: 'FeatureCollection', features: labelFeatures },
  };
}

/** True if the sun is above the horizon at (lat, lng) at the given UTC instant. */
export function isDaytime(lat: number, lng: number, date: Date): boolean {
  const dec = solarDeclination(date);
  const subLng = subsolarLongitude(date);
  const ha = (lng - subLng) * DEG;
  const cosZenith =
    Math.sin(lat * DEG) * Math.sin(dec * DEG) +
    Math.cos(lat * DEG) * Math.cos(dec * DEG) * Math.cos(ha);
  return cosZenith > 0;
}
