export type Language = 'en' | 'hi' | 'te';
export type VehicleType = 'bike' | 'bicycle';

export interface RiderProfile {
  riderId: string;
  lang: Language;
  vehicle: VehicleType;
  city: string;
  createdAt: string;
}

export type HeatBand = 'green' | 'yellow' | 'red';

export interface GridCell {
  cellId: string;
  lat: number;
  lon: number;
  tempC: number;
  rh: number;
  windMs: number;
  swRad: number;
  wbgtC: number;
  band: HeatBand;
  hour: string;
  source: string;
}

export interface RestPoint {
  id: string;
  cellId: string;
  lat: number;
  lon: number;
  name: string;
  kind: 'water' | 'shade' | 'fuel' | 'rest';
  source: 'osm' | 'rider';
  verified: boolean;
  verifiedByCount: number;
  notes?: string;
  addedBy?: string;
}

export interface ShiftPing {
  shiftId: string;
  ts: number;
  lat: number;
  lon: number;
  speedKmh: number;
  heading: number;
  accuracyM: number;
  wbgtC: number;
  band: HeatBand;
  dose: number;
}

export interface ShiftState {
  riderId: string;
  shiftId: string;
  status: 'idle' | 'active' | 'ended';
  startTime: number;
  endTime?: number;
  dose: number;
  redMin: number;
  yellowMin: number;
  greenMin: number;
  breakCount: number;
  lastPing?: ShiftPing;
  stationarySince?: number;
  lastNudgeTime?: number;
  lastNudgeType?: string;
  replayMode: boolean;
  replayDate: string;
  pings: ShiftPing[];
  hottestStretch?: {
    lat: number;
    lon: number;
    wbgtC: number;
    time: string;
  };
}

export type NudgeType = 'idle' | 'on-route' | 'critical' | 'break-logged' | 'shift-start' | 'unwell';

export interface VoiceNudge {
  id: string;
  type: NudgeType;
  title: string;
  titleHi: string;
  messageEn: string;
  messageHi: string;
  pointId?: string;
  pointName?: string;
  distanceM?: number;
  bearing?: number;
  timestamp: number;
  severity: 'info' | 'warning' | 'critical' | 'success';
}

export interface CityConfig {
  id: string;
  name: string;
  nameHi: string;
  center: [number, number];
  bounds: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  liveWeather: {
    tempC: number;
    rh: number;
    windMs: number;
    condition: string;
  };
  replayWeather: {
    date: string;
    description: string;
    tempC: number;
    rh: number;
    windMs: number;
  };
}
