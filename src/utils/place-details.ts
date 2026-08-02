import type { Place } from '../types/place';

export type TransportLeg = {
  mode: 'flight' | 'boat' | 'ferry' | 'road' | 'rail' | 'walk' | 'other';
  label: string;
  detail: string;
};

export type PlaceLink = {
  label: string;
  url: string;
};

// City name → IATA airport code mapping
const CITY_AIRPORT_MAP: Record<string, string> = {
  'singapore': 'SIN',
  'kuala lumpur': 'KUL',
  'bangkok': 'BKK',
  'hong kong': 'HKG',
  'tokyo': 'NRT',
  'osaka': 'KIX',
  'seoul': 'ICN',
  'shanghai': 'PVG',
  'beijing': 'PEK',
  'delhi': 'DEL',
  'mumbai': 'BOM',
  'dubai': 'DXB',
  'abu dhabi': 'AUH',
  'doha': 'DOH',
  'london': 'LHR',
  'paris': 'CDG',
  'amsterdam': 'AMS',
  'frankfurt': 'FRA',
  'berlin': 'BER',
  'munich': 'MUC',
  'zurich': 'ZRH',
  'vienna': 'VIE',
  'new york': 'JFK',
  'los angeles': 'LAX',
  'san francisco': 'SFO',
  'chicago': 'ORD',
  'toronto': 'YYZ',
  'vancouver': 'YVR',
  'sydney': 'SYD',
  'melbourne': 'MEL',
  'perth': 'PER',
  'auckland': 'AKL',
  'jakarta': 'CGK',
  'bali': 'DPS',
  'denpasar': 'DPS',
  'surabaya': 'SUB',
  'yogyakarta': 'JOG',
  'medan': 'KNO',
  'manila': 'MNL',
  'ho chi minh': 'SGN',
  'hanoi': 'HAN',
  'da nang': 'DAD',
  'phnom penh': 'PNH',
  'siem reap': 'REP',
  'yangon': 'RGN',
  'vientiane': 'VTE',
  'bandar seri begawan': 'BWN',
  'taipei': 'TPE',
  'istanbul': 'IST',
  'moscow': 'SVO',
  'milan': 'MXP',
  'rome': 'FCO',
  'madrid': 'MAD',
  'barcelona': 'BCN',
  'warsaw': 'WAW',
  'prague': 'PRG',
  'budapest': 'BUD',
  'stockholm': 'ARN',
  'copenhagen': 'CPH',
  'helsinki': 'HEL',
  'dublin': 'DUB',
  'lisbon': 'LIS',
  'athens': 'ATH',
};

// strips " · 5km soft circle" style suffixes and country parts from a label
export function cleanCityLabel(label: string | null | undefined): string {
  const trimmed = (label || '').trim();
  if (!trimmed) return '';
  return trimmed
    .replace(/\s*\u00b7.*$/i, '') // everything after "·"
    .replace(/\s*-\s*(\d+)km.*$/i, '')
    .split(',')[0]
    .trim();
}

export function getAirportCodeForCity(cityName: string): string | null {
  const cleaned = cleanCityLabel(cityName).toLowerCase();
  if (!cleaned || cleaned.includes('near you')) return null;
  // Direct match
  if (CITY_AIRPORT_MAP[cleaned]) return CITY_AIRPORT_MAP[cleaned];
  // Partial match (multi-word, e.g. "ho chi minh city")
  for (const [key, code] of Object.entries(CITY_AIRPORT_MAP)) {
    if (cleaned.includes(key) || key.includes(cleaned)) return code;
  }
  // Default: take first 3 letters uppercase (best effort)
  const alpha = cleaned.replace(/[^a-zA-Z]/g, '');
  return alpha.length >= 3 ? alpha.slice(0, 3).toUpperCase() : null;
}

function findReferencedPlace(ref: string, places: Place[], current: Place): Place | undefined {
  const cleaned = ref
    .replace(/^(same as|similar to)\s+/i, '')
    .replace(/\s*;.*$/, '')
    .replace(/\s+in\s+(rivers|mountains|historical|underwater).*$/i, '')
    .replace(/\s+above$/i, '')
    .trim()
    .toLowerCase();

  if (!cleaned || cleaned === 'above') {
    const idx = places.findIndex((p) => p.id === current.id);
    if (idx > 0) return places[idx - 1];
    return undefined;
  }

  const scored = places
    .filter((p) => p.id !== current.id)
    .map((p) => {
      const loc = p.location.toLowerCase();
      let score = 0;
      if (loc === cleaned) score = 100;
      else if (loc.includes(cleaned) || cleaned.includes(loc)) score = 80;
      else {
        const words = cleaned.split(/\s+/).filter((w) => w.length > 2);
        score = words.filter((w) => loc.includes(w)).length * 20;
      }
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.p;
}

function expandField(value: string, field: keyof Place, place: Place, places: Place[], depth = 0): string {
  if (!value || depth > 4) return value;
  if (!/^(same as|similar to)/i.test(value.trim())) return value;

  const ref = findReferencedPlace(value, places, place);
  if (!ref) return value;

  const suffix = value.includes(';') ? value.slice(value.indexOf(';') + 1).trim() : '';
  const base = expandField(String(ref[field] || ''), field, ref, places, depth + 1);
  return suffix ? `${base}; ${suffix}` : base;
}

export function expandPlace(place: Place, places: Place[]): Place {
  const fields: (keyof Place)[] = [
    'howToGetThere',
    'paymentMethods',
    'visaEntry',
    'cultureEtiquette',
    'dressCode',
    'accessNeeded',
    'navigationTips',
    'primaryActivities',
  ];

  const next: Place = { ...place };
  for (const field of fields) {
    const raw = String(place[field] || '');
    (next as any)[field] = expandField(raw, field, place, places);
  }
  return next;
}

function detectMode(chunk: string): TransportLeg['mode'] {
  const t = chunk.toLowerCase();
  if (/\bfly\b|\bflight\b|\bairport\b|\bsin\b|\b→\b.*\([A-Z]{3}\)/i.test(t) || /\([A-Z]{3}\)/.test(chunk))
    return 'flight';
  if (/\bferry\b/.test(t)) return 'ferry';
  if (/\bboat\b|\bliveaboard\b|\bspeedboat\b|\bklotok\b|\bcanoe\b|\bcruise\b/.test(t)) return 'boat';
  if (/\btrain\b|\brail\b/.test(t)) return 'rail';
  if (/\bwalk\b|\btrek\b|\bhike\b|\bclimb\b/.test(t)) return 'walk';
  if (/\broad\b|\bdrive\b|\bjeep\b|\bgrab\b|\bgojek\b|\bscooter\b|\bbus\b|\boverland\b|\bcar\b/.test(t))
    return 'road';
  return 'other';
}

const MODE_LABEL: Record<TransportLeg['mode'], string> = {
  flight: 'flight',
  boat: 'boat',
  ferry: 'ferry',
  road: 'road / land',
  rail: 'rail',
  walk: 'on foot',
  other: 'transfer',
};

export function parseTransports(howToGetThere: string): TransportLeg[] {
  const text = (howToGetThere || '').trim();
  if (!text) return [];

  const parts = text
    .split(/\s*;\s*|\s+then\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);

  const legs = parts.map((detail) => {
    const mode = detectMode(detail);
    return { mode, label: MODE_LABEL[mode], detail };
  });

  return legs.length ? legs : [{ mode: 'other', label: 'transfer', detail: text }];
}

export function getPlaceLinks(place: Place): PlaceLink[] {
  const q = encodeURIComponent(place.location);
  const country = encodeURIComponent(place.country);
  return [
    {
      label: 'wikipedia',
      url: `https://en.wikipedia.org/wiki/Special:Search?search=${q}`,
    },
    {
      label: 'wikivoyage',
      url: `https://en.wikivoyage.org/w/index.php?search=${q}`,
    },
    {
      label: 'google maps',
      url: `https://www.google.com/maps/search/?api=1&query=${place.lat}%2C${place.lng}`,
    },
    {
      label: 'unesco / heritage search',
      url: `https://www.google.com/search?q=${q}+${country}+UNESCO`,
    },
    {
      label: 'official tourism search',
      url: `https://www.google.com/search?q=${q}+${country}+official+tourism`,
    },
  ];
}

// rewrite "Fly SIN -> X" style data text to use the traveller's real origin airport
export function personalizeGettingThere(text: string | null | undefined, originAirport?: string): string {
  const from = (originAirport || 'SIN').toUpperCase();
  return (text || '').toString().replace(/\bSIN\b/g, from);
}

function cleanIata(code: string): string {
  return (code || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
}

export function getFlightSearchLinks(
  airport: string,
  from = 'SIN',
  originCityName?: string
): PlaceLink[] {
  const to = cleanIata(airport) || 'DPS';
  const fromCode = cleanIata(from) || 'SIN';
  const fromCity = (cleanCityLabel(originCityName) || fromCode).trim();
  const toCity = to;
  const routeQuery = encodeURIComponent(`${fromCity} to ${toCity} flights`);

  return [
    {
      label: 'google flights',
      url: `https://www.google.com/travel/flights?q=${encodeURIComponent(
        `Flights from ${fromCity} ${fromCode} to ${toCity} ${to}`
      )}`,
    },
    {
      label: 'skyscanner',
      url: `https://www.skyscanner.com/transport/flights/${fromCode.toLowerCase()}/${to.toLowerCase()}/`,
    },
    {
      label: 'kayak',
      url: `https://www.kayak.com/flights/${fromCode}-${to}/`,
    },
    {
      label: 'google search',
      url: `https://www.google.com/search?q=${routeQuery}`,
    },
  ];
}

// deep link for ONE flight: embeds the route + date so the booking site
// (google flights) opens pre-filled for that specific departure.
export function getFlightDetailLink(
  from: string,
  to: string,
  departureIso?: string
): string {
  const f = cleanIata(from) || 'SIN';
  const t = cleanIata(to) || 'DPS';
  let q = `Flights from ${f} to ${t}`;
  if (departureIso) {
    try {
      const d = new Date(departureIso);
      if (!Number.isNaN(d.getTime())) {
        q += ` on ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
          d.getDate()
        ).padStart(2, '0')}`;
      }
    } catch {}
  }
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
}

const COUNTRY_TOURISM_URLS: Record<string, { label: string; url: string }> = {
  Indonesia: {
    label: 'Wonderful Indonesia · Indonesia.travel',
    url: 'https://www.indonesia.travel/',
  },
  Cambodia: {
    label: 'Tourism Cambodia · tourismcambodia.com',
    url: 'https://www.tourismcambodia.com/',
  },
  Vietnam: {
    label: 'Vietnam National Administration of Tourism · vietnam.travel',
    url: 'https://vietnam.travel/',
  },
};

export function getOfficialTourismUrl(country: string): { label: string; url: string } | null {
  for (const [key, val] of Object.entries(COUNTRY_TOURISM_URLS)) {
    if (country.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return null;
}
