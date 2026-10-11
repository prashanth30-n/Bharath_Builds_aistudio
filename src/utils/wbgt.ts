import { HeatBand } from '../types';

/**
 * Australian Bureau of Meteorology shade approximation for WBGT:
 * e = (RH / 100) * 6.105 * exp(17.27 * T / (237.7 + T))
 * WBGT = 0.567 * T + 0.393 * e + 3.94
 *
 * Bands:
 * Green: < 28 °C
 * Yellow: 28 to 31 °C
 * Red: >= 31 °C
 */
export function calculateWBGT(tempC: number, rh: number): number {
  const e = (rh / 100) * 6.105 * Math.exp((17.27 * tempC) / (237.7 + tempC));
  const wbgt = 0.567 * tempC + 0.393 * e + 3.94;
  return Number(wbgt.toFixed(1));
}

export function getHeatBand(wbgtC: number): HeatBand {
  if (wbgtC < 28.0) return 'green';
  if (wbgtC < 31.0) return 'yellow';
  return 'red';
}

export function getBandWeight(band: HeatBand): number {
  switch (band) {
    case 'green': return 0;
    case 'yellow': return 1;
    case 'red': return 2;
  }
}

export function computeCellId(lat: number, lon: number): string {
  const latIdx = Math.round(lat / 0.02);
  const lonIdx = Math.round(lon / 0.02);
  return `${latIdx}_${lonIdx}`;
}

/**
 * Calculates Haversine distance in meters between two coordinates.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Computes bearing (heading in degrees 0-360) from point 1 to point 2.
 */
export function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((bearing + 360) % 360);
}

/**
 * Returns minimum difference in degrees between two angles (-180 to +180).
 */
export function getAngleDiff(angle1: number, angle2: number): number {
  let diff = Math.abs(angle1 - angle2) % 360;
  if (diff > 180) {
    diff = 360 - diff;
  }
  return diff;
}
