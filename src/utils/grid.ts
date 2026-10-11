import { CityConfig, GridCell, HeatBand } from '../types';
import { calculateWBGT, computeCellId, getHeatBand } from './wbgt';

/**
 * Generates the WBGT grid cells across the bounding box of a city at 0.02° increments (~2km resolution).
 * Matches AWS Lambda `buildGrid` logic.
 */
export function generateCityHeatGrid(
  city: CityConfig,
  isReplayMode: boolean,
  currentHourOffset: number = 0 // 0 = now, 1 = +1h, 2 = +2h, etc.
): GridCell[] {
  const { bounds, liveWeather, replayWeather } = city;
  const baseWeather = isReplayMode ? replayWeather : liveWeather;

  // Temperature variation over hours (peak heat in early-mid afternoon)
  const hourTempModifier = currentHourOffset === 0 ? 0 : currentHourOffset === 1 ? 0.8 : -0.5;

  const cells: GridCell[] = [];
  const latStep = 0.02;
  const lonStep = 0.02;

  // Use deterministic spatial variations based on coordinates (urban heat island effect: dense downtown is hotter than green outskirts)
  for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += latStep) {
    for (let lon = bounds.minLon; lon <= bounds.maxLon; lon += lonStep) {
      const centerDist = Math.hypot(lat - city.center[0], lon - city.center[1]);
      // Urban core is ~1.5°C warmer (Urban Heat Island effect common in Indian metros)
      const uhiDelta = Math.max(0, (0.08 - centerDist) * 12);
      // Small spatial noise
      const pseudoNoise = (Math.sin(lat * 80) * Math.cos(lon * 80)) * 0.9;

      const cellTemp = baseWeather.tempC + uhiDelta + pseudoNoise + hourTempModifier;
      const cellRh = Math.max(20, Math.min(90, baseWeather.rh - uhiDelta * 1.5 - (pseudoNoise * 2)));
      const cellWind = Math.max(0.5, baseWeather.windMs + (Math.sin(lon * 50) * 0.8));
      const cellWbgt = calculateWBGT(cellTemp, cellRh);
      const band: HeatBand = getHeatBand(cellWbgt);

      const cellId = computeCellId(lat, lon);
      cells.push({
        cellId,
        lat: Number(lat.toFixed(4)),
        lon: Number(lon.toFixed(4)),
        tempC: Number(cellTemp.toFixed(1)),
        rh: Math.round(cellRh),
        windMs: Number(cellWind.toFixed(1)),
        swRad: isReplayMode ? 850 : 620,
        wbgtC: cellWbgt,
        band,
        hour: new Date(Date.now() + currentHourOffset * 3600000).toISOString().slice(0, 13),
        source: isReplayMode ? `replay:${replayWeather.date}` : 'open-meteo-forecast',
      });
    }
  }

  return cells;
}

export interface ForecastHour {
  hourLabel: string;
  hourTime: string;
  tempC: number;
  wbgtC: number;
  band: HeatBand;
  summary: string;
}

export function getThreeHourForecast(city: CityConfig, isReplayMode: boolean): ForecastHour[] {
  const baseWeather = isReplayMode ? city.replayWeather : city.liveWeather;
  const now = new Date();

  return [0, 1, 2, 3].map(offset => {
    const d = new Date(now.getTime() + offset * 3600000);
    const hourLabel = offset === 0 ? 'Now' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const tempModifier = offset === 0 ? 0 : offset === 1 ? 1.1 : offset === 2 ? 0.4 : -1.2;
    const temp = Number((baseWeather.tempC + tempModifier).toFixed(1));
    const rh = Math.max(20, Math.min(85, baseWeather.rh - tempModifier * 2));
    const wbgt = calculateWBGT(temp, rh);
    const band = getHeatBand(wbgt);

    let summary = 'Safe outdoor riding';
    if (band === 'yellow') summary = 'Caution · Water stops recommended';
    if (band === 'red') summary = 'EXTREME HEAT · High risk of heat strain';

    return {
      hourLabel,
      hourTime: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tempC: temp,
      wbgtC: wbgt,
      band,
      summary,
    };
  });
}
