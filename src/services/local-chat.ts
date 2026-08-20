import type { Place, TravellerProfile } from '../types/place';
import { detectUserCurrency, formatCostPerDay } from './currency';
import { personalizeGettingThere } from '../utils/place-details';
import { foodUnsafeForAllergies } from '../utils/allergies';
import { titleCase } from '../utils/text';

export async function askLocalDesk(
  question: string,
  dbplaces: Place[],
  notesplaces: Place[],
  originAirport?: string,
  userCountry?: string,
  travellerProfile?: TravellerProfile | null
): Promise<string> {
  return localReply(question, dbplaces, notesplaces, originAirport, userCountry, travellerProfile);
}

function costLine(p: Place, userCountry?: string): string {
  if (!p.costPerDay) return '';
  const cost = formatCostPerDay(p.costPerDay, p.country, detectUserCurrency({ country: userCountry }));
  return cost ? `${cost} per day (1 person)` : '';
}

function norm(value: string | undefined | null): string {
  return (value ?? '').toString().trim();
}

function lower(value: string | undefined | null): string {
  return norm(value).toLowerCase();
}

function tokenize(text: string): string[] {
  return lower(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1);
}

type ScoredPlace = { p: Place; score: number };

function scorePlace(query: string, p: Place): number {
  const qlow = lower(query);
  const qtokens = new Set(tokenize(query));
  const candidates = [lower(p.location), lower(p.country), lower(p.category)];
  let score = 0;
  for (const cand of candidates) {
    if (!cand) continue;
    if (qtokens.has(cand)) {
      score += 100;
      continue;
    }
    const ctok = cand.split(/[^a-z0-9]+/).filter((w) => w.length > 1);
    for (const t of ctok) {
      if (qtokens.has(t)) score += 60;
    }
    if (cand.length > 2 && qlow.includes(cand)) score += 40;
  }
  return score;
}

function matchPlaces(query: string, places: Place[], limit = 4): Place[] {
  return places
    .map((p) => ({ p, score: scorePlace(query, p) }) as ScoredPlace)
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

function hasAny(text: string, words: string[]): boolean {
  for (const w of words) {
    if (new RegExp(`\\b${w}\\b`, 'i').test(text)) return true;
  }
  return false;
}

function line(label: string, value: string | undefined | null): string[] {
  const v = norm(value);
  return v ? [`${label}: ${v}`] : [];
}

function bullets(items: string[]): string {
  return items
    .filter((x) => !!x)
    .map((x, i) => `${i + 1}) ${x}`)
    .join('\n');
}

function placeSnapshot(p: Place): string {
  return `${p.location} (${p.country})`;
}

function placeReply(p: Place, originAirport?: string, userCountry?: string): string {
  const lines: string[] = [];
  lines.push(`${placeSnapshot(p)} — ${p.category || 'highlight'}.`);
  lines.push('');
  lines.push(
    bullets([
      ...line('activities', p.primaryActivities),
      ...line('getting there', personalizeGettingThere(p.howToGetThere, originAirport)),
      ...line('visa', p.visaEntry),
      ...line('etiquette', p.cultureEtiquette),
      ...line('dress code', p.dressCode),
      ...line('getting around', p.navigationTips),
      ...line('cost per day', costLine(p, userCountry)),
    ])
  );
  const fact = p.funFacts?.length ? p.funFacts.find((f) => !!norm(f)) : '';
  if (fact) {
    lines.push('');
    lines.push(`local tip: ${fact}`);
  }
  return lines.join('\n').trim();
}

// Region aliases so "plan a 5 day bali trip" expands to the full Bali area
// (Ubud, Tanah Lot, Kelingking, etc.) from the database.
const REGION_ALIASES: Record<string, string[]> = {
  bali: [
    'bali', 'ubud', 'tanah lot', 'kelingking', 'nusa penida', 'tegalalang',
    'monkey forest', 'batur', 'gunung kawi', 'penglipuran', 'tenganan',
    'sukarara', 'seminyak', 'canggu', 'uluwatu', 'gili trawangan', 'gili air', 'gili meno',
  ],
  'siem reap': [
    'siem reap', 'angkor', 'banteay', 'roluos', 'tonle sap', 'kompong', 'sangkae', 'battambang', 'phnom sampeou',
  ],
  'phnom penh': [
    'phnom penh', 'koh rong', 'koh tang', 'cardamom', 'kampot', 'sihanoukville', 'prey lang',
  ],
  hanoi: [
    'hanoi', 'ha long', 'halong', 'ninh binh', 'van long', 'sapa', 'fansipan', 'ha giang', 'tam coc', 'mai chau',
  ],
  'ho chi minh': [
    'ho chi minh', 'saigon', 'mekong', 'can tho', 'tram chim', 'vung tau', 'cu chi',
  ],
  'da nang': [
    'da nang', 'hoi an', 'hue', 'bach ma', 'cu lao cham', 'my son', 'son tra',
  ],
  'nha trang': ['nha trang', 'hon mun', 'van phong', 'cam ranh', 'doc let'],
  'phu quoc': ['phu quoc', 'con dao', 'duong dong'],
  yogyakarta: [
    'yogyakarta', 'borobudur', 'prambanan', 'dieng', 'kaliurang', 'merapi', 'kotagede', 'taman sari',
  ],
  jakarta: ['jakarta', 'kota tua', 'taman safari', 'ujung kulon', 'bogor', 'puncak', 'kepulauan seribu'],
  komodo: ['komodo', 'labuan bajo', 'rinca', 'kelimutu', 'flores', 'wae rebo', 'bajawa', 'riung', 'maros'],
  'raja ampat': ['raja ampat', 'wayag', 'misool', 'waigeo', 'sorong', 'kri', 'piaynemo'],
  lombok: ['lombok', 'gili trawangan', 'gili air', 'gili meno', 'senggigi', 'rinjani', 'kuta lombok'],
  medan: ['medan', 'lake toba', 'samosir', 'gunung leuser', 'bukit lawang', 'berastagi', 'tangkahan'],
  surabaya: ['surabaya', 'bromo', 'semeru', 'tumpak sewu', 'ijen', 'malang', 'batu'],
  battambang: ['battambang', 'sangkae', 'wat banan', 'phnom sampeou', 'kamping puoy', 'prek toal'],
};

function extractDays(q: string): number {
  const m = q.match(/(\d+)\s*(?:-|–|to)?\s*(day|night)s?\b/i);
  if (m) return Math.max(1, Math.min(parseInt(m[1], 10) || 0, 21));
  if (/\bweek\b/i.test(q)) return 7;
  if (/\b(half|1)\s*day\b/i.test(q)) return 1;
  return 0;
}

function planPicks(q: string, places: Place[], notes: Place[]): Place[] {
  const ql = q.toLowerCase();

  const countries = ['indonesia', 'cambodia', 'vietnam'].filter((c) => ql.includes(c));
  if (countries.length) {
    return places.filter((p) => countries.includes(p.country.toLowerCase()));
  }

  for (const [region, keywords] of Object.entries(REGION_ALIASES)) {
    if (ql.includes(region) || keywords.some((k) => ql.includes(k))) {
      const wanted = keywords.filter((k) => k.length > 2);
      const hits = places.filter((p) => {
        const loc = p.location.toLowerCase();
        return wanted.some((w) => loc === w || loc.startsWith(`${w} `));
      });
      if (hits.length) {
        return hits.sort((a, b) => {
          const la = a.location.toLowerCase();
          const lb = b.location.toLowerCase();
          const ra = ql.includes(la) || ql.startsWith(la) ? 0 : 1;
          const rb = ql.includes(lb) || ql.startsWith(lb) ? 0 : 1;
          return ra - rb;
        });
      }
    }
  }

  const locHits = places.filter((p) => ql.includes(p.location.toLowerCase()));
  if (locHits.length) return locHits;

  const catHits = places.filter((p) => ql.includes(p.category.toLowerCase()));
  if (catHits.length) return catHits;

  return notes.length ? notes : places.slice(0, 12);
}

function buildItinerary(
  q: string,
  picks: Place[],
  originAirport: string | undefined,
  days: number,
  userCountry?: string,
  travellerProfile?: TravellerProfile | null
): string {
  if (!picks.length) {
    return [
      'tell me a country, region, or category you like (e.g. "bali", "vietnam", "temples")',
      'and i will line up a day-by-day plan.',
      'for example: "plan a 5 day bali trip".',
    ].join('\n');
  }
  const profile: Partial<TravellerProfile> = travellerProfile || {};
  const allergies = profile.foodAllergies || '';
  const safe = picks.filter((p) => !foodUnsafeForAllergies(p.food, allergies));
  if (safe.length) picks = safe;

  const origin = (originAirport || 'SIN').toUpperCase();
  const first = picks[0];
  const last = picks[picks.length - 1];
  const airport = first.airport || '?';
  const lastAirport = last.airport || airport;

  const party: string[] = [];
  if (profile.mode === 'group' && profile.groupSize) party.push(`group of ${profile.groupSize}`);
  if (profile.hasElderly) party.push('elderly travellers');
  if (profile.hasChildren) party.push('children');

  const lines: string[] = [`here is your ${days}-day plan:`, ''];
  if (party.length) {
    lines.push(
      `planning for ${party.join(', ')} — days are paced with easy mornings, short walks, and accessible stops.`
    );
    lines.push('');
  }
  if (profile.transportPreference) {
    lines.push(`you prefer getting around by ${profile.transportPreference} — the legs below suit that.`);
    lines.push('');
  }
  lines.push(`Day 1 — Arrive ${titleCase(first.location)}`);
  lines.push(`  • fly ${origin} → ${airport}. settle in, take it slow.`);
  if (first.food && !foodUnsafeForAllergies(first.food, allergies)) {
    lines.push(`  • first evening: ${first.food}`);
  }

  const slotDays = Math.max(1, days - 2);
  for (let i = 0; i < slotDays; i++) {
    const p = picks[i % picks.length];
    const dayNum = i + 2;
    if (dayNum > days) break;
    if (i >= slotDays - 1 && days > 2) {
      lines.push('');
      lines.push(`Day ${days} — Depart`);
      lines.push(`  • fly ${lastAirport} → ${origin}. leave with a full memory card.`);
      break;
    }
    lines.push('');
    lines.push(`Day ${dayNum} — ${titleCase(p.location)} (${titleCase(p.country)})`);
    lines.push(`  • ${p.primaryActivities || 'a traveller favourite — explore at your own pace.'}`);
    if (p.gettingAround || p.navigationTips) {
      lines.push(`  • getting around: ${p.gettingAround || p.navigationTips}`);
    }
    if (p.food && !foodUnsafeForAllergies(p.food, allergies)) {
      lines.push(`  • eat: ${p.food}`);
    }
    if (p.costPerDay) {
      const cost = costLine(p, userCountry);
      if (profile.mode === 'group' && profile.groupSize) {
        lines.push(`  • budget: ${cost} per day per person (group of ${profile.groupSize})`);
      } else {
        lines.push(`  • budget: ${cost}`);
      }
    }
  }

  if (days <= 2) {
    lines.push('');
    lines.push('Day 2 — Depart');
    lines.push(`  • fly ${lastAirport} → ${origin}.`);
  }

  lines.push('');
  lines.push('want more detail? ask about any place above (visa, dress code, how to get there).');
  return lines.join('\n');
}

function visaReply(p: Place): string {
  const body = norm(p.visaEntry) || norm(p.accessNeeded) || 'check the official embassy site before you fly.';
  return [`${placeSnapshot(p)} — entry notes:`, '', body].join('\n');
}

function dressReply(p: Place): string {
  return [
    `${placeSnapshot(p)} — dress + etiquette:`,
    '',
    bullets([...line('dress code', p.dressCode), ...line('etiquette', p.cultureEtiquette)]),
  ].join('\n');
}

function reachReply(p: Place, originAirport?: string): string {
  return [
    `${placeSnapshot(p)} — how to get there:`,
    '',
    bullets([
      ...line('getting there', personalizeGettingThere(p.howToGetThere, originAirport)),
      ...line('nearest airport', p.airport),
      ...line('getting around', p.navigationTips),
    ]),
  ].join('\n');
}

function activitiesReply(p: Place): string {
  const body = norm(p.primaryActivities) || norm(p.funFacts?.join(' ')) || 'great for a slow day of exploring.';
  return [`${placeSnapshot(p)} — what to do:`, '', body].join('\n');
}

function greetingReply(): string {
  return [
    'hey — i am your asean travel desk.',
    'ask about a place (try "bali", "angkor", "halong"), a country ("vietnam", "cambodia", "indonesia"), or a vibe ("temples", "beaches", "jungle").',
    'you can also ask for a day-by-day plan — "plan a 5 day bali trip".',
  ].join('\n');
}

function noMatchHint(query: string): string {
  return [
    `i don't have a specific match for "${norm(query) || 'that'}" in my notes.`,
    'try a place (bali, angkor, halong), a country (vietnam, cambodia, indonesia), or a category (temples, beaches, jungle).',
    'or ask for a day-by-day plan — "plan a 5 day bali trip", for example.',
  ].join('\n');
}

function localReply(
  question: string,
  dbplaces: Place[],
  notesplaces: Place[],
  originAirport?: string,
  userCountry?: string,
  travellerProfile?: TravellerProfile | null
): string {
  const q = norm(question);
  if (!q) return greetingReply();

  const days = extractDays(q);
  const isitinerary =
    /\b(plan|itinerary|trip|route)\b/i.test(q) || /(\d+)\s*(day|night)s?\b/i.test(q);
  const isvisa = hasAny(q, ['visa', 'passport', 'entry']);
  const isdress = hasAny(q, ['wear', 'dress', 'attire', 'clothes', 'etiquette', 'custom']);
  const isreach = hasAny(q, ['reach', 'get there', 'getting there', 'transport', 'fly to', 'flight to', 'how to get']);
  const isactivities = hasAny(q, ['things to do', 'activities', 'to do', 'experience', 'highlights']);
  const iswhen = hasAny(q, ['best time', 'when to go', 'season', 'weather', 'climate']);

  if (isitinerary) {
    const picks = planPicks(q, dbplaces, notesplaces);
    return buildItinerary(q, picks, originAirport, days || 3, userCountry, travellerProfile);
  }

  const hits = matchPlaces(q, dbplaces, 4);
  const singleHit = hits[0];

  if (singleHit) {
    if (isvisa) return visaReply(singleHit);
    if (isdress) return dressReply(singleHit);
    if (isreach) return reachReply(singleHit, originAirport);
    if (isactivities) return activitiesReply(singleHit);
    if (iswhen) {
      return [
        `${placeSnapshot(singleHit)} — usually pairs with the dry season for outdoor stops;`,
        'rainy months can limit mountain and river activities.',
        '',
        norm(singleHit.accessNeeded) || 'check access notes closer to your travel date.',
      ].join('\n');
    }
    return placeReply(singleHit, originAirport, userCountry);
  }

  if (hits.length > 1) {
    return [
      `${hits.length} matches found — pick one for the full rundown, or ask for any of these:`,
      '',
      bullets(hits.map((p) => placeSnapshot(p))),
    ].join('\n');
  }

  if (iswhen) {
    return [
      'in this part of southeast asia, dry season (roughly nov–april) is usually easier for islands and temples.',
      'mountain and rainforest stops are best in the shoulder months;',
      'confirm the timing for the specific place you have in mind.',
    ].join('\n');
  }

  return noMatchHint(q);
}
