import type { FlightInfo, FlightReply } from '../types/place';

const BACKEND_URL =
  (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '') ||
  'http://localhost:8081';

const BACKEND_SECRET = (process.env.EXPO_PUBLIC_BACKEND_SECRET || '').trim();

// Route airlines keyed by destination airport; flight durations vary by origin
const ROUTE_DURATIONS: Record<string, { airline: string; code: string; baseMin: number }[]> = {
  DPS: [
    { airline: 'singapore airlines', code: 'SQ', baseMin: 150 },
    { airline: 'scoot', code: 'TR', baseMin: 160 },
    { airline: 'garuda indonesia', code: 'GA', baseMin: 155 },
  ],
  CGK: [
    { airline: 'singapore airlines', code: 'SQ', baseMin: 105 },
    { airline: 'garuda indonesia', code: 'GA', baseMin: 110 },
    { airline: 'batik air', code: 'ID', baseMin: 115 },
  ],
  SUB: [
    { airline: 'scoot', code: 'TR', baseMin: 150 },
    { airline: 'singapore airlines', code: 'SQ', baseMin: 145 },
  ],
  UPG: [{ airline: 'singapore airlines', code: 'SQ', baseMin: 210 }],
  KNO: [
    { airline: 'scoot', code: 'TR', baseMin: 90 },
    { airline: 'singapore airlines', code: 'SQ', baseMin: 85 },
  ],
  PNH: [
    { airline: 'singapore airlines', code: 'SQ', baseMin: 125 },
    { airline: 'scoot', code: 'TR', baseMin: 130 },
  ],
  REP: [
    { airline: 'singapore airlines', code: 'SQ', baseMin: 135 },
    { airline: 'cambodia airways', code: 'KR', baseMin: 140 },
  ],
  HAN: [
    { airline: 'singapore airlines', code: 'SQ', baseMin: 210 },
    { airline: 'vietnam airlines', code: 'VN', baseMin: 215 },
    { airline: 'scoot', code: 'TR', baseMin: 220 },
  ],
  SGN: [
    { airline: 'singapore airlines', code: 'SQ', baseMin: 125 },
    { airline: 'vietnam airlines', code: 'VN', baseMin: 130 },
    { airline: 'scoot', code: 'TR', baseMin: 135 },
  ],
  DAD: [
    { airline: 'scoot', code: 'TR', baseMin: 165 },
    { airline: 'vietnam airlines', code: 'VN', baseMin: 170 },
  ],
  CXR: [{ airline: 'scoot', code: 'TR', baseMin: 150 }],
  PQC: [{ airline: 'scoot', code: 'TR', baseMin: 140 }],
  VDH: [{ airline: 'vietnam airlines', code: 'VN', baseMin: 200 }],
  LBJ: [{ airline: 'garuda indonesia', code: 'GA', baseMin: 240 }],
  SOQ: [{ airline: 'garuda indonesia', code: 'GA', baseMin: 360 }],
};

const ASEAN_AIRLINES = [
  'singapore airlines', 'scoot', 'garuda indonesia', 'batik air',
  'cambodia airways', 'vietnam airlines', 'malaysia airlines',
  'thai airways', 'bangkok airways', 'airasia', 'cebu pacific',
  'philippine airlines', 'lion air', 'citilink',
];

// IATA -> (lat, lng) used for great-circle distance in the offline fallback
const AIRPORT_COORDS: Record<string, [number, number]> = {
  SIN: [1.3644, 103.9915], KUL: [2.7456, 101.7099], BKK: [13.69, 100.7501],
  HKG: [22.308, 113.9185], MNL: [14.5086, 121.0196],
  DPS: [-8.7482, 115.1673], CGK: [-6.1256, 106.6559], SUB: [-7.3798, 112.7869],
  UPG: [-5.0616, 119.554], KNO: [3.6424, 98.8852], JOG: [-7.788, 110.4318],
  LBJ: [-8.4857, 119.8894], SOQ: [-0.894, 131.2877],
  PNH: [11.5466, 104.8441], REP: [13.4107, 103.813],
  HAN: [21.2212, 105.8072], SGN: [10.8188, 106.652], DAD: [16.0439, 108.1994],
  CXR: [11.9981, 109.2194], PQC: [10.1698, 103.9931], VDH: [17.515, 106.5906],
  NRT: [35.772, 140.3929], HND: [35.5494, 139.7798], ICN: [37.4602, 126.4407],
  PVG: [31.1443, 121.8083], PEK: [40.0799, 116.6031], TPE: [25.0777, 121.2328],
  DEL: [28.5562, 77.1], BOM: [19.0896, 72.8656],
  DXB: [25.2532, 55.3657], AUH: [24.433, 54.6511], DOH: [25.2731, 51.6081],
  LHR: [51.47, -0.4543], LGW: [51.1537, -0.1821], CDG: [49.0097, 2.5479],
  AMS: [52.3105, 4.7683], FRA: [50.0379, 8.5622], MUC: [48.3538, 11.7861],
  BER: [52.3667, 13.5033], ZRH: [47.4647, 8.5492], VIE: [48.1103, 16.5697],
  IST: [41.2753, 28.7519], MAD: [40.4983, -3.5676], BCN: [41.2974, 2.0833],
  FCO: [41.8003, 12.2389], MXP: [45.6306, 8.7281], CPH: [55.618, 12.6508],
  ARN: [59.6519, 17.9186], HEL: [60.3183, 24.9497], DUB: [53.4264, -6.2499],
  LIS: [38.7742, -9.1342], ATH: [37.9364, 23.9445], WAW: [52.1657, 20.9671],
  PRG: [50.1008, 14.26], BUD: [47.4298, 19.2611], OSL: [60.1976, 11.1004],
  JFK: [40.6413, -73.7781], EWR: [40.6895, -74.1745], LAX: [33.9416, -118.4085],
  SFO: [37.6213, -122.379], ORD: [41.9742, -87.9073], YYZ: [43.6777, -79.6248],
  YVR: [49.1967, -123.1815], SYD: [-33.9399, 151.1753], MEL: [-37.669, 144.841],
  PER: [-31.9403, 115.9673], AKL: [-37.0082, 174.785],
};

export function isASEANAirline(airline: string): boolean {
  return ASEAN_AIRLINES.some((a) => airline.toLowerCase().includes(a));
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function addMinutes(d: Date, m: number) {
  return new Date(d.getTime() + m * 60000);
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function syntheticFlights(to: string, origin: string, count = 6): FlightInfo[] {
  const routes = ROUTE_DURATIONS[to] || [
    { airline: 'regional carrier', code: 'XX', baseMin: 180 },
  ];
  const a = AIRPORT_COORDS[origin];
  const b = AIRPORT_COORDS[to];
  const distanceMin = a && b ? Math.max(40, Math.round(haversineKm(a, b) / 850 * 60) + 45) : null;
  const now = new Date();
  const out: FlightInfo[] = [];
  for (let i = 0; i < count; i++) {
    const meta = routes[i % routes.length];
    const durationMin = distanceMin ?? Math.round(meta.baseMin);
    const dep = addMinutes(now, 45 + i * 95 + (i % 3) * 20);
    const arr = addMinutes(dep, durationMin);
    const num = `${meta.code}${900 + ((to.length * 7 + i * 7) % 90)}`;
    out.push({
      flightNumber: num,
      airline: meta.airline,
      from: origin,
      to,
      departure: dep.toISOString(),
      arrival: arr.toISOString(),
      status: i === 0 ? 'boarding soon' : i < 2 ? 'on time' : 'scheduled',
      terminal: i % 2 === 0 ? 'T3' : 'T2',
      price: Math.round(60 + durationMin * 1.35 + i * 17),
      currency: 'USD',
    });
  }
  return out;
}

export async function getFlightsTo(
  airport: string,
  origin = 'SIN'
): Promise<FlightReply> {
  const to = (airport || 'DPS').toUpperCase();
  const from = (origin || 'SIN').toUpperCase();

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (BACKEND_SECRET) headers.Authorization = `Bearer ${BACKEND_SECRET}`;

  try {
    const res = await fetch(
      `${BACKEND_URL}/flights?to=${encodeURIComponent(to)}&from=${encodeURIComponent(from)}`,
      {
        method: 'GET',
        headers,
      }
    );
    if (!res.ok) return { flights: syntheticFlights(to, from), live: false };
    const data = (await res.json()) as FlightReply;
    return Array.isArray(data.flights) && data.flights.length
      ? data
      : { flights: syntheticFlights(to, from), live: false };
  } catch {
    return { flights: syntheticFlights(to, from), live: false };
  }
}

export function formatFlightTime(iso: string) {
  try {
    return `${pad(new Date(iso).getHours())}:${pad(new Date(iso).getMinutes())}`;
  } catch {
    return iso;
  }
}

export function formatFlightDate(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  } catch {
    return iso;
  }
}
