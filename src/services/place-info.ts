import type { PlaceInfo, PlaceReview } from '../types/place';

const BACKEND_URL =
  (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '') ||
  'http://localhost:8081';

const BACKEND_SECRET = (process.env.EXPO_PUBLIC_BACKEND_SECRET || '').trim();

export async function getVisaInfo(
  nationality: string,
  destination: string
): Promise<{ answer: string; live: boolean } | null> {
  if (!nationality || !destination) return null;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (BACKEND_SECRET) headers.Authorization = `Bearer ${BACKEND_SECRET}`;
  try {
    const res = await fetch(
      `${BACKEND_URL}/visa?nationality=${encodeURIComponent(nationality)}&destination=${encodeURIComponent(
        destination
      )}`,
      { headers }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { answer?: string; live?: boolean };
    if (!data || !data.answer) return null;
    return { answer: data.answer, live: !!data.live };
  } catch {
    return null;
  }
}

export async function getPlaceInfo(query: string): Promise<PlaceInfo | null> {
  if (!query) return null;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (BACKEND_SECRET) headers.Authorization = `Bearer ${BACKEND_SECRET}`;
  try {
    const res = await fetch(
      `${BACKEND_URL}/place-info?query=${encodeURIComponent(query)}`,
      { headers }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as PlaceInfo;
    if (!data || !data.name) return null;
    if (!data.mapsUrl && !data.website && !data.rating && !data.photoUrl) return null;
    return data;
  } catch {
    return null;
  }
}

type PlaceReviewsReply = {
  reviews: Array<{
    author: string;
    rating: number | null;
    text: string;
    date: string;
    sourceUrl: string;
    sourceName: string;
  }>;
  live: boolean;
  placeName: string;
  mapsUrl: string;
};

const NEGATIVE_WORDS = [
  'disappoint', 'not worth', 'overrated', 'waste', 'avoid', 'terrible', 'awful',
  'worst', 'rude', 'dirty', 'sketchy', 'scam', "don't bother", 'do not bother',
  'bad experience', 'would not return', "wouldn't return", 'nothing special',
  'boring', 'poor', 'unhygienic', 'unsafe', 'tourist trap', 'rip off', 'cheat',
];

function isPositiveReview(text: string): boolean {
  const t = text.toLowerCase();
  return !NEGATIVE_WORDS.some((w) => t.includes(w));
}

/**
 * Fetches real, positive (4★+) reviews for a place from the backend, which
 * pulls them via the SerpAPI Google Maps reviews engine. Anything with
 * negative language is filtered out so only glowing reviews are shown.
 */
export async function getPlaceReviews(query: string): Promise<{
  reviews: PlaceReview[];
  placeName?: string;
  mapsUrl?: string;
} | null> {
  if (!query) return null;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (BACKEND_SECRET) headers.Authorization = `Bearer ${BACKEND_SECRET}`;
  try {
    const res = await fetch(
      `${BACKEND_URL}/place-reviews?query=${encodeURIComponent(query)}`,
      { headers }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as PlaceReviewsReply;
    if (!data || !Array.isArray(data.reviews)) return null;
    const reviews: PlaceReview[] = data.reviews
      .filter((r) => r.text && r.rating != null && r.rating >= 4 && isPositiveReview(r.text))
      .slice(0, 6)
      .map((r) => ({
        author: r.author || 'google maps user',
        source: 'google' as const,
        rating: Math.min(5, Math.max(1, Math.round(r.rating ?? 5))),
        text: r.text,
        date: r.date || '',
        url: r.sourceUrl || undefined,
      }));
    if (!reviews.length) return null;
    return { reviews, placeName: data.placeName || undefined, mapsUrl: data.mapsUrl || undefined };
  } catch {
    return null;
  }
}
