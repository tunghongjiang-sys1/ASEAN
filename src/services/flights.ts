import type { FlightInfo } from '../types/place';

const SIN = 'SIN';

const ROUTE_AIRLINES: Record<string, { airline: string; code: string; durationMin: number }[]> = {
  DPS: [
    { airline: 'singapore airlines', code: 'SQ', durationMin: 150 },
    { airline: 'scoot', code: 'TR', durationMin: 160 },
    { airline: 'garuda indonesia', code: 'GA', durationMin: 155 },
  ],
  CGK: [
    { airline: 'singapore airlines', code: 'SQ', durationMin: 105 },
    { airline: 'garuda indonesia', code: 'GA', durationMin: 110 },
    { airline: 'batik air', code: 'ID', durationMin: 115 },
  ],
  SUB: [
    { airline: 'scoot', code: 'TR', durationMin: 150 },
    { airline: 'singapore airlines', code: 'SQ', durationMin: 145 },
  ],
  UPG: [{ airline: 'singapore airlines', code: 'SQ', durationMin: 210 }],
  KNO: [
    { airline: 'scoot', code: 'TR', durationMin: 90 },
    { airline: 'singapore airlines', code: 'SQ', durationMin: 85 },
  ],
  PNH: [
    { airline: 'singapore airlines', code: 'SQ', durationMin: 125 },
    { airline: 'scoot', code: 'TR', durationMin: 130 },
  ],
  REP: [
    { airline: 'singapore airlines', code: 'SQ', durationMin: 135 },
    { airline: 'cambodia airways', code: 'KR', durationMin: 140 },
  ],
  HAN: [
    { airline: 'singapore airlines', code: 'SQ', durationMin: 210 },
    { airline: 'vietnam airlines', code: 'VN', durationMin: 215 },
    { airline: 'scoot', code: 'TR', durationMin: 220 },
  ],
  SGN: [
    { airline: 'singapore airlines', code: 'SQ', durationMin: 125 },
    { airline: 'vietnam airlines', code: 'VN', durationMin: 130 },
    { airline: 'scoot', code: 'TR', durationMin: 135 },
  ],
  DAD: [
    { airline: 'scoot', code: 'TR', durationMin: 165 },
    { airline: 'vietnam airlines', code: 'VN', durationMin: 170 },
  ],
  CXR: [{ airline: 'scoot', code: 'TR', durationMin: 150 }],
  PQC: [{ airline: 'scoot', code: 'TR', durationMin: 140 }],
  VDH: [{ airline: 'vietnam airlines', code: 'VN', durationMin: 200 }],
  LBJ: [{ airline: 'garuda indonesia', code: 'GA', durationMin: 240 }],
  SOQ: [{ airline: 'garuda indonesia', code: 'GA', durationMin: 360 }],
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatLocal(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addMinutes(d: Date, m: number) {
  return new Date(d.getTime() + m * 60000);
}

function syntheticFlights(to: string, count = 6): FlightInfo[] {
  const routes = ROUTE_AIRLINES[to] || [
    { airline: 'regional carrier', code: 'XX', durationMin: 180 },
  ];
  const now = new Date();
  const out: FlightInfo[] = [];
  for (let i = 0; i < count; i++) {
    const meta = routes[i % routes.length];
    const dep = addMinutes(now, 45 + i * 95 + (i % 3) * 20);
    const arr = addMinutes(dep, meta.durationMin);
    const num = `${meta.code}${940 + i * 7 + (to.charCodeAt(0) % 40)}`;
    out.push({
      flightNumber: num,
      airline: meta.airline,
      from: SIN,
      to,
      departure: dep.toISOString(),
      arrival: arr.toISOString(),
      status: i === 0 ? 'boarding soon' : i < 2 ? 'on time' : 'scheduled',
      terminal: i % 2 === 0 ? 'T3' : 'T2',
    });
  }
  return out;
}

async function aviationStackFlights(to: string): Promise<FlightInfo[] | null> {
  const key = process.env.EXPO_PUBLIC_AVIATIONSTACK_API_KEY;
  if (!key) return null;
  try {
    const url = `https://api.aviationstack.com/v1/flights?access_key=${key}&dep_iata=${SIN}&arr_iata=${to}&limit=8`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data?.data) || data.data.length === 0) return null;
    return data.data.map((f: any) => ({
      flightNumber: f?.flight?.iata || f?.flight?.icao || '—',
      airline: (f?.airline?.name || 'airline').toLowerCase(),
      from: f?.departure?.iata || SIN,
      to: f?.arrival?.iata || to,
      departure: f?.departure?.scheduled || new Date().toISOString(),
      arrival: f?.arrival?.scheduled || new Date().toISOString(),
      status: (f?.flight_status || 'scheduled').toLowerCase(),
      terminal: f?.departure?.terminal || undefined,
    }));
  } catch {
    return null;
  }
}

export async function getFlightsTo(airport: string): Promise<FlightInfo[]> {
  const to = (airport || 'DPS').toUpperCase();
  const live = await aviationStackFlights(to);
  if (live && live.length) return live;
  return syntheticFlights(to);
}

export function formatFlightTime(iso: string) {
  try {
    return formatLocal(new Date(iso));
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
