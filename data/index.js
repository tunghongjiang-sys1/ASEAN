import { indonesiaData } from './indonesia';
import { cambodiaData } from './cambodia';
import { vietnamData } from './vietnam';
import { enrichment } from './enrichment';

function merge(list) {
  return list.map((p) => {
    const e = enrichment[p.id] || {
      lat: 0, lng: 0, airport: 'SIN',
      image: `https://picsum.photos/seed/${p.id}/800/600`,
      amenities: ['cafe', 'restroom', 'parking', 'local guide'],
      funFacts: ['this place is known across southeast asia.', 'travellers often visit during dry season.', 'local guides help with navigation.'],
    };
    return { ...p, ...e };
  });
}

export const places = [
  ...merge(indonesiaData),
  ...merge(cambodiaData),
  ...merge(vietnamData),
];

export const categories = [...new Set(places.map((p) => p.category))].sort();

export function getPlaceById(id) {
  return places.find((p) => p.id === id);
}

export function filterPlacesByCategories(selected) {
  if (!selected || selected.length === 0) return places;
  const set = new Set(selected.map((s) => s.toLowerCase()));
  return places.filter((p) => set.has(p.category.toLowerCase()));
}
