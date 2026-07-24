import type { Place } from '../types/place';
import type { ChatMessage } from '../types/place';

const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

function buildContext(places: Place[], notes: Place[]) {
  const compact = places.slice(0, 80).map((p) => ({
    id: p.id,
    country: p.country,
    category: p.category,
    location: p.location,
    activities: p.primaryActivities,
    how: p.howToGetThere,
    visa: p.visaEntry,
    dress: p.dressCode,
    culture: p.cultureEtiquette,
    payment: p.paymentMethods,
    access: p.accessNeeded,
    tips: p.navigationTips,
    airport: p.airport,
  }));
  const saved = notes.map((p) => p.location);
  return JSON.stringify({ places: compact, savedPlaces: saved });
}

export async function askTravelAgent(
  question: string,
  history: ChatMessage[],
  places: Place[],
  notes: Place[]
): Promise<string> {
  const key = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY;
  const model = process.env.EXPO_PUBLIC_OPENROUTER_MODEL || 'openai/gpt-4o-mini';

  if (!key) {
    return localFallback(question, places, notes);
  }

  const system = `you are a calm southeast asian travel agent for indonesia, cambodia, and vietnam. answer only from the provided database. keep replies concise, lowercase except proper nouns and airport codes. help with itineraries, etiquette, flights from singapore, dress codes, and practical tips. if unknown, say you do not have that in the database. database: ${buildContext(places, notes)}`;

  const messages = [
    { role: 'system', content: system },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: question },
  ];

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://asean-travel.app',
      'X-Title': 'asean travel',
    },
    body: JSON.stringify({ model, messages, temperature: 0.4 }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'openrouter request failed');
  }

  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.trim() || localFallback(question, places, notes);
}

function localFallback(question: string, places: Place[], notes: Place[]): string {
  const q = question.toLowerCase();
  const hit = places.find(
    (p) =>
      q.includes(p.location.toLowerCase()) ||
      q.includes(p.country.toLowerCase()) ||
      q.includes(p.category.toLowerCase())
  );

  if (q.includes('itinerary') || q.includes('plan')) {
    const picks = (notes.length ? notes : places).slice(0, 3);
    return `here is a simple plan from your database:\n${picks
      .map(
        (p, i) =>
          `${i + 1}. ${p.location} (${p.country}) — ${p.primaryActivities}. fly via ${p.airport}.`
      )
      .join('\n')}\nadd an openrouter api key in .env for richer planning.`;
  }

  if (hit) {
    return `${hit.location} is a ${hit.category.toLowerCase()} stop in ${hit.country}. activities: ${hit.primaryActivities}. getting there: ${hit.howToGetThere}. visa: ${hit.visaEntry}. etiquette: ${hit.cultureEtiquette}.`;
  }

  return 'i can help using the indonesia, cambodia, and vietnam place database. ask about a place, category, itinerary, visa, or dress code. add EXPO_PUBLIC_OPENROUTER_API_KEY for live ai answers.';
}
