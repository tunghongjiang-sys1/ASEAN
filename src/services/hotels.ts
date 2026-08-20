import type { HotelItem, HotelsReply } from '../types/place';

const BACKEND_URL =
  (process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/+$/, '') ||
  'http://localhost:8081';

const BACKEND_SECRET = (process.env.EXPO_PUBLIC_BACKEND_SECRET || '').trim();

type HotelsResponse = {
  hotels: Array<{
    name: string;
    description: string;
    price: string;
    priceValue: number | null;
    rating: number | null;
    reviews: number | null;
    hotelClass: number | null;
    link: string;
    thumbnail: string;
  }>;
  live: boolean;
  checkin: string;
  checkout: string;
};

/**
 * Bookable hotels & homestays near a place via the backend, which uses the
 * SerpAPI google_hotels engine with the traveller's selected dates.
 */
export async function getHotelsNear(
  place: string,
  checkin: string,
  checkout: string
): Promise<HotelsReply | null> {
  if (!place) return null;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (BACKEND_SECRET) headers.Authorization = `Bearer ${BACKEND_SECRET}`;
  try {
    const params = new URLSearchParams({ place });
    if (checkin) params.set('checkin', checkin);
    if (checkout) params.set('checkout', checkout);
    const res = await fetch(`${BACKEND_URL}/hotels?${params.toString()}`, { headers });
    if (!res.ok) return null;
    const data = (await res.json()) as HotelsResponse;
    if (!Array.isArray(data.hotels) || !data.hotels.length) return null;
    const hotels: HotelItem[] = data.hotels
      .filter((h) => h.name)
      .slice(0, 8)
      .map((h) => ({
        name: h.name,
        description: h.description || '',
        price: h.price || '',
        priceValue: h.priceValue,
        rating: h.rating,
        reviews: h.reviews,
        hotelClass: h.hotelClass,
        link: h.link || '',
        thumbnail: h.thumbnail || '',
      }));
    if (!hotels.length) return null;
    return { hotels, live: !!data.live, checkin: data.checkin, checkout: data.checkout };
  } catch {
    return null;
  }
}
