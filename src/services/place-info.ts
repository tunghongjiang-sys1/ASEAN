import type { PlaceInfo } from '../types/place';

const BACKEND_URL =
  (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '') ||
  'http://localhost:8081';

const BACKEND_SECRET = (process.env.EXPO_PUBLIC_BACKEND_SECRET || '').trim();

// Google Places-backed destination info (rating, website, maps link).
// Falls back to null if the backend is unreachable or Places isn't configured.
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
    // only treat it as useful if google returned something clickable/rated
    if (!data || !data.name) return null;
    if (!data.mapsUrl && !data.website && !data.rating && !data.photoUrl) return null;
    return data;
  } catch {
    return null;
  }
}
