import type { ChatMessage, Place } from '../types/place';

const BACKEND_URL =
  (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '') ||
  'http://localhost:8081';

const BACKEND_SECRET = (process.env.EXPO_PUBLIC_BACKEND_SECRET || '').trim();

type ChatRequestBody = {
  question: string;
  history: Array<{ role: 'user' | 'assistant'; content: string }>;
  preferred_categories: string[];
  saved_place_ids: string[];
  user_location?: { label?: string; city?: string; country?: string; airport?: string };
  traveller_profile?: Record<string, unknown>;
};

type ChatReplyBody = { reply: string };

export async function askTravelAgent(
  question: string,
  history: ChatMessage[],
  dbPlaces: Place[],
  notePlaces: Place[],
  userLocation?: { label?: string; city?: string; country?: string; airport?: string } | null,
  travellerProfile?: Record<string, unknown> | null
): Promise<string> {
  const body: ChatRequestBody = {
    question,
    history: history.map((m) => ({ role: m.role, content: m.content })),
    preferred_categories: Array.from(
      new Set(dbPlaces.map((p) => p.category).filter(Boolean))
    ),
    saved_place_ids: notePlaces.map((p) => p.id).filter(Boolean),
    user_location: userLocation
      ? {
          label: userLocation.label,
          city: userLocation.city,
          country: userLocation.country,
          airport: userLocation.airport,
        }
      : undefined,
    traveller_profile: travellerProfile ?? undefined,
  };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (BACKEND_SECRET) {
    headers.Authorization = `Bearer ${BACKEND_SECRET}`;
  }

  try {
    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return (
        networkHint(res.status) +
        `\n\n(backend returned ${res.status}${[401, 403].includes(res.status) ? ' - check EXPO_PUBLIC_BACKEND_SECRET' : ''})`
      );
    }
    const data = (await res.json()) as ChatReplyBody;
    return (data.reply || '').trim() || networkHint(-1);
  } catch (e: any) {
    return networkHint(-1) + `\n\n(network error: ${e?.message || 'unknown'})`;
  }
}

function networkHint(status: number): string {
  return [
    'chat backend unreachable.',
    '1) make sure the python server is running: cd backend && uvicorn main:app',
    '2) confirm EXPO_PUBLIC_BACKEND_URL points to it (default http://localhost:8000).',
    '3) the backend owns the place database; the expo client only sees what comes back.',
  ].join('\n');
}
