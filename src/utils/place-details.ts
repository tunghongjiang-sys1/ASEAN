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

  // Always keep every leg — including boats — even when several modes are needed
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

export function getFlightSearchLinks(airport: string, from = 'SIN'): PlaceLink[] {
  const to = (airport || 'DPS').toUpperCase();
  const fromCode = from.toUpperCase();
  return [
    {
      label: 'google flights',
      url: `https://www.google.com/travel/flights?q=Flights%20to%20${to}%20from%20${fromCode}`,
    },
    {
      label: 'skyscanner',
      url: `https://www.skyscanner.com/transport/flights/${fromCode.toLowerCase()}/${to.toLowerCase()}/`,
    },
    {
      label: 'kayak',
      url: `https://www.kayak.com/flights/${fromCode}-${to}/`,
    },
  ];
}
