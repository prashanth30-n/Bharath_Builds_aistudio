import { CityConfig, RestPoint } from '../types';

export const SUPPORTED_CITIES: CityConfig[] = [
  {
    id: 'hyderabad',
    name: 'Hyderabad (Cyberabad)',
    nameHi: 'हैदराबाद (साइबराबाद)',
    center: [17.4435, 78.3772], // Hitec City / Madhapur
    bounds: {
      minLat: 17.3600,
      maxLat: 17.5100,
      minLon: 78.3000,
      maxLon: 78.5200,
    },
    liveWeather: {
      tempC: 31.8,
      rh: 54,
      windMs: 3.2,
      condition: 'Partly Sunny · Moderate Heat',
    },
    replayWeather: {
      date: '2025-05-17',
      description: 'May 17 Severe Heatwave (IMD Red Alert · 43.4°C)',
      tempC: 43.4,
      rh: 42,
      windMs: 2.1,
    },
  },
  {
    id: 'delhi',
    name: 'Delhi NCR (Central & South)',
    nameHi: 'दिल्ली एनसीआर',
    center: [28.6280, 77.2180], // Connaught Place / Barakhamba
    bounds: {
      minLat: 28.5200,
      maxLat: 28.7200,
      minLon: 77.1000,
      maxLon: 77.3200,
    },
    liveWeather: {
      tempC: 32.5,
      rh: 48,
      windMs: 2.8,
      condition: 'Sunny · Dry Heat',
    },
    replayWeather: {
      date: '2025-05-24',
      description: 'May 24 Loo Windwave (45.8°C Extreme Warning)',
      tempC: 45.8,
      rh: 28,
      windMs: 4.2,
    },
  },
  {
    id: 'bengaluru',
    name: 'Bengaluru (Koramangala / HSR)',
    nameHi: 'बेंगलुरु (कोरमंगला / एचएसआर)',
    center: [12.9352, 77.6245], // Koramangala
    bounds: {
      minLat: 12.8700,
      maxLat: 13.0200,
      minLon: 77.5400,
      maxLon: 77.7200,
    },
    liveWeather: {
      tempC: 28.6,
      rh: 62,
      windMs: 4.0,
      condition: 'Pleasant · Mild Heat',
    },
    replayWeather: {
      date: '2025-04-30',
      description: 'Record April Heatwave (38.5°C WBGT High)',
      tempC: 38.5,
      rh: 58,
      windMs: 2.0,
    },
  },
  {
    id: 'mumbai',
    name: 'Mumbai (BKC / Andheri)',
    nameHi: 'मुंबई (बीकेसी / अंधेरी)',
    center: [19.0657, 72.8687], // BKC
    bounds: {
      minLat: 18.9800,
      maxLat: 19.1800,
      minLon: 72.8000,
      maxLon: 72.9500,
    },
    liveWeather: {
      tempC: 33.2,
      rh: 74,
      windMs: 3.5,
      condition: 'High Humidity · Severe Heat Index',
    },
    replayWeather: {
      date: '2025-05-12',
      description: 'May Coastal Sultry Heatwave (37.2°C @ 78% RH)',
      tempC: 37.2,
      rh: 78,
      windMs: 1.8,
    },
  },
];

// Seeded rest, water and shade points around Hyderabad
export const SEED_REST_POINTS: Record<string, RestPoint[]> = {
  hyderabad: [
    {
      id: 'hyd_pt_1',
      cellId: '872_3919',
      lat: 17.4440,
      lon: 78.3755,
      name: 'HPCL Fuel Station Free RO Chilled Water Dispenser',
      kind: 'water',
      source: 'osm',
      verified: true,
      verifiedByCount: 14,
      notes: 'Clean cold water 24x7, shaded tyre pressure bay',
    },
    {
      id: 'hyd_pt_2',
      cellId: '872_3919',
      lat: 17.4485,
      lon: 78.3798,
      name: 'Hitec City Metro Station Shaded Concourse & Water Pi-ao',
      kind: 'shade',
      source: 'osm',
      verified: true,
      verifiedByCount: 22,
      notes: 'Ample cool shade under viaduct, stone seating for riders',
    },
    {
      id: 'hyd_pt_3',
      cellId: '872_3919',
      lat: 17.4412,
      lon: 78.3845,
      name: 'Community Matka (Earthen Clay Pot) & Tree Canopy',
      kind: 'water',
      source: 'rider',
      verified: true,
      verifiedByCount: 9,
      notes: 'Deep neem tree shade, 4 clay pots filled daily by tea stall',
    },
    {
      id: 'hyd_pt_4',
      cellId: '872_3919',
      lat: 17.4365,
      lon: 78.3720,
      name: 'Inorbit Mall Basement Rider Rest & Hydration Zone',
      kind: 'rest',
      source: 'osm',
      verified: true,
      verifiedByCount: 31,
      notes: 'Designated air-cooled waiting hub with charging points',
    },
    {
      id: 'hyd_pt_5',
      cellId: '872_3919',
      lat: 17.4498,
      lon: 78.3685,
      name: 'Cyber Towers Flyover Shaded Parking Bay',
      kind: 'shade',
      source: 'rider',
      verified: true,
      verifiedByCount: 16,
      notes: 'Breeze corridor under flyover, close to cloud kitchens',
    },
    {
      id: 'hyd_pt_6',
      cellId: '872_3919',
      lat: 17.4520,
      lon: 78.3740,
      name: 'Indian Oil Petrol Pump Shaded Rest Bench',
      kind: 'fuel',
      source: 'osm',
      verified: true,
      verifiedByCount: 18,
      notes: 'Water dispenser & washroom accessible for gig riders',
    },
    {
      id: 'hyd_pt_7',
      cellId: '872_3919',
      lat: 17.4390,
      lon: 78.3910,
      name: 'Durgam Cheruvu Park Perimeter Banyan Shade',
      kind: 'shade',
      source: 'rider',
      verified: true,
      verifiedByCount: 7,
      notes: 'Cool natural lake breeze and drinking fountain',
    },
  ],
  delhi: [
    {
      id: 'del_pt_1',
      cellId: '1431_3861',
      lat: 28.6310,
      lon: 77.2195,
      name: 'Gurudwara Bangla Sahib 24/7 Cold Sweet Water Chhabeel',
      kind: 'water',
      source: 'osm',
      verified: true,
      verifiedByCount: 52,
      notes: 'Free cold filtered water and langar hall shade',
    },
    {
      id: 'del_pt_2',
      cellId: '1431_3861',
      lat: 28.6285,
      lon: 77.2140,
      name: 'Shivaji Stadium Metro Station Underpass Shade',
      kind: 'shade',
      source: 'osm',
      verified: true,
      verifiedByCount: 28,
      notes: 'Large shaded area, drinking water booth',
    },
    {
      id: 'del_pt_3',
      cellId: '1431_3861',
      lat: 28.6345,
      lon: 77.2215,
      name: 'Outer Circle IOCL Free RO Water Fountain',
      kind: 'water',
      source: 'rider',
      verified: true,
      verifiedByCount: 19,
      notes: 'Chilled water dispenser beside air filling bay',
    },
  ],
  bengaluru: [
    {
      id: 'blr_pt_1',
      cellId: '647_3881',
      lat: 12.9340,
      lon: 77.6220,
      name: 'Koramangala 5th Block BBMP Drinking Water Kiosk',
      kind: 'water',
      source: 'osm',
      verified: true,
      verifiedByCount: 24,
      notes: 'RO water dispenser right outside police booth',
    },
    {
      id: 'blr_pt_2',
      cellId: '647_3881',
      lat: 12.9370,
      lon: 77.6275,
      name: 'Sony World Junction Flyover Shaded Rest Hub',
      kind: 'shade',
      source: 'rider',
      verified: true,
      verifiedByCount: 35,
      notes: 'Protected from sun, near Swiggy Instamart hub',
    },
  ],
  mumbai: [
    {
      id: 'mum_pt_1',
      cellId: '953_3643',
      lat: 19.0665,
      lon: 72.8670,
      name: 'BKC Jio World Drive Rider Shade Pavilion',
      kind: 'rest',
      source: 'osm',
      verified: true,
      verifiedByCount: 41,
      notes: 'Designated air-conditioned delivery partner lounge',
    },
    {
      id: 'mum_pt_2',
      cellId: '953_3643',
      lat: 19.0630,
      lon: 72.8710,
      name: 'Bharat Petroleum BKC Cold Water Station',
      kind: 'water',
      source: 'osm',
      verified: true,
      verifiedByCount: 20,
      notes: 'Cold water tap and clean washrooms',
    },
  ],
};

/**
 * Pre-recorded GPS Trace for Hyderabad Replay Demo:
 * Takes a rider along a realistic delivery route from Hitec City / Cyber Towers
 * towards Inorbit Mall & Durgam Cheruvu.
 * Includes:
 * 1. Cruising in heat (heading 140°)
 * 2. On-route water point passed within 250m -> triggers on-route water nudge
 * 3. Waiting 3+ minutes outside restaurant -> triggers idle nudge
 * 4. Resting at shade spot for 10 min -> triggers break logged & dose drops!
 * 5. High-heat stretch -> triggers critical dose / unwell nudge
 */
export interface TracePoint {
  timeSec: number;
  lat: number;
  lon: number;
  speedKmh: number;
  heading: number;
  description: string;
  isStationary?: boolean;
  nearPointId?: string;
}

export const DEMO_TRACE: TracePoint[] = [
  // 0: Start shift outside Cyber Towers
  { timeSec: 0, lat: 17.4502, lon: 78.3805, speedKmh: 0, heading: 180, description: 'Shift start · Cyber Towers pickup' },
  // 10s: Riding south towards Madhapur main road
  { timeSec: 10, lat: 17.4485, lon: 78.3802, speedKmh: 28, heading: 185, description: 'Moving south in intense heat' },
  // 20s: Riding towards HPCL water point
  { timeSec: 20, lat: 17.4468, lon: 78.3795, speedKmh: 32, heading: 190, description: 'Cruising · HPCL water point 220m ahead on route', nearPointId: 'hyd_pt_1' },
  // 30s: Approaching Hitec Metro Station
  { timeSec: 30, lat: 17.4450, lon: 78.3780, speedKmh: 25, heading: 205, description: 'Approaching Hitec Metro corridor' },
  // 40s: Arrived at restaurant for order pickup - Standing still waiting!
  { timeSec: 40, lat: 17.4442, lon: 78.3765, speedKmh: 0, heading: 210, description: 'Waiting for order at cloud kitchen (Idle)', isStationary: true },
  { timeSec: 50, lat: 17.4441, lon: 78.3764, speedKmh: 0, heading: 210, description: 'Still waiting (3 min idle in heat) · Shade 140m away', isStationary: true },
  // 60s: Order picked up, riding towards Inorbit Mall
  { timeSec: 60, lat: 17.4410, lon: 78.3745, speedKmh: 35, heading: 215, description: 'Out for customer delivery' },
  // 70s: Pulled into Inorbit Mall designated rider rest hub
  { timeSec: 70, lat: 17.4365, lon: 78.3720, speedKmh: 0, heading: 220, description: 'Resting in shaded rest hub', isStationary: true, nearPointId: 'hyd_pt_4' },
  // 80s: Continuous rest at rest hub (break logged!)
  { timeSec: 80, lat: 17.4365, lon: 78.3720, speedKmh: 0, heading: 220, description: '10 min rest detected · Break logged!', isStationary: true, nearPointId: 'hyd_pt_4' },
  // 90s: Resuming ride in severe afternoon heat
  { timeSec: 90, lat: 17.4380, lon: 78.3850, speedKmh: 22, heading: 110, description: 'Extreme sun exposure stretch · Peak WBGT 33.4°C' },
  { timeSec: 100, lat: 17.4395, lon: 78.3905, speedKmh: 12, heading: 70, description: 'Critical heat dose threshold reached' },
];
