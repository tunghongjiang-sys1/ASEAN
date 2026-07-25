import type { Place } from '../types/place';

export async function askLocalDesk(
  question: string,
  dbplaces: Place[],
  notesplaces: Place[]
): Promise<string> {
  return localReply(question, dbplaces, notesplaces);
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

function placeReply(p: Place): string {
  const lines: string[] = [];
  lines.push(`${placeSnapshot(p)} — ${p.category || 'highlight'}.`);
  lines.push('');
  lines.push(
    bullets([
      ...line('activities', p.primaryActivities),
      ...line('getting there', p.howToGetThere),
      ...line('visa', p.visaEntry),
      ...line('etiquette', p.cultureEtiquette),
      ...line('dress code', p.dressCode),
      ...line('getting around', p.navigationTips),
    ])
  );
  const fact = p.funFacts?.length ? p.funFacts.find((f) => !!norm(f)) : '';
  if (fact) {
    lines.push('');
    lines.push(`local tip: ${fact}`);
  }
  return lines.join('\n').trim();
}

function itineraryReply(question: string, choices: Place[]): string {
  const picks = choices.slice(0, 3);
  if (!picks.length) {
    return [
      'tell me a country or a category you like and i will line up a short plan.',
      'for example: "plan 3 days in bali" or "a relaxed itinerary for cambodia".',
    ].join('\n');
  }
  const items = picks.map(
    (p) =>
      `${placeSnapshot(p)} — fly via ${p.airport || 'SIN'}. ${norm(p.primaryActivities) || 'a traveller favourite.'}`
  );
  return ['here is a simple plan:', bullets(items), '', 'tap a suggestion above or ask about a specific place for more detail.'].join('\n');
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

function reachReply(p: Place): string {
  return [
    `${placeSnapshot(p)} — how to get there:`,
    '',
    bullets([
      ...line('getting there', p.howToGetThere),
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
    'you can also ask for a quick plan ("3 days in bali"), what to wear at temples, or how to reach somewhere.',
  ].join('\n');
}

function noMatchHint(query: string): string {
  return [
    `i don't have a specific match for "${norm(query) || 'that'}" in my notes.`,
    'try a place (bali, angkor, halong), a country (vietnam, cambodia, indonesia), or a category (temples, beaches, jungle).',
    'or ask for a quick plan — "3 days in bali", for example.',
  ].join('\n');
}

function localReply(question: string, dbplaces: Place[], notesplaces: Place[]): string {
  const q = norm(question);
  if (!q) return greetingReply();

  const isitinerary = /\b(plan|itinerary|days?\s+in|trip|route)\b/i.test(q) || /\b\d+\s*day\b/i.test(q);
  const isvisa = hasAny(q, ['visa', 'passport', 'entry']);
  const isdress = hasAny(q, ['wear', 'dress', 'attire', 'clothes', 'etiquette', 'custom']);
  const isreach = hasAny(q, ['reach', 'get there', 'getting there', 'transport', 'fly to', 'flight to', 'how to get']);
  const isactivities = hasAny(q, ['things to do', 'activities', 'to do', 'experience', 'highlights']);
  const iswhen = hasAny(q, ['best time', 'when to go', 'season', 'weather', 'climate']);

  const hits = matchPlaces(q, dbplaces, 4);
  const singleHit = hits[0];

  if (isitinerary) {
    const chosen =
      notesplaces.length > 0
        ? notesplaces.slice(0, 3)
        : hits.length > 0
        ? hits.slice(0, 3)
        : dbplaces.slice(0, 3);
    return itineraryReply(q, chosen);
  }

  if (singleHit) {
    if (isvisa) return visaReply(singleHit);
    if (isdress) return dressReply(singleHit);
    if (isreach) return reachReply(singleHit);
    if (isactivities) return activitiesReply(singleHit);
    if (iswhen) {
      return [
        `${placeSnapshot(singleHit)} — usually pairs with the dry season for outdoor stops;`,
        'rainy months can limit mountain and river activities.',
        '',
        norm(singleHit.accessNeeded) || 'check access notes closer to your travel date.',
      ].join('\n');
    }
    return placeReply(singleHit);
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
