import { indonesiaData } from './indonesia.js';
import { cambodiaData } from './cambodia.js';
import { vietnamData } from './vietnam.js';
import { enrichment } from './enrichment.js';
import { foodSafeForAllergies } from '../src/utils/allergies';

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

export function filterPlacesByProfile(selectedCategories, profile) {
  let list = filterPlacesByCategories(selectedCategories);
  if (!profile) return list;
  // Never suggest a place whose signature dish the traveller is allergic to,
  // even when that place matches the chosen category.
  if (profile.foodAllergies) {
    list = list.filter((p) => foodSafeForAllergies(p.food, profile.foodAllergies));
  }
  const needsAccessible = profile.hasElderly || profile.hasChildren || !!profile.specialNeeds;
  if (needsAccessible) {
    const accessible = list.filter((p) => {
      const text = [p.accessNeeded, p.gettingAround, p.primaryActivities]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return !/(strong fitness|strenuous|rope access|steep climb|climbing|advanced dive|experienced diver|multi-?day trek|isolated wilderness|expedition)/.test(
        text
      );
    });
    if (accessible.length > 0) list = accessible;
  }
  if (profile.transportPreference) {
    const matched = list.filter((p) => {
      const text = [p.gettingAround, p.transport, p.accessNeeded, p.navigationTips]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      switch (profile.transportPreference) {
        case 'car':
          return /(car|taxi|private driver|4wd|jeep|driver)/.test(text);
        case 'scooter':
          return /(scooter|motorbike|motorcycle|tuk-?tuk|moped)/.test(text);
        case 'walk':
          return /(walk|hike|bicycle|pedestrian|cycling)/.test(text);
        case 'public':
          return /(bus|train|ferry|boat|cruise|kayak|grab|ride-?hailing|public|tuk-?tuk|metro|rail)/.test(
            text
          );
        default:
          return true;
      }
    });
    if (matched.length >= Math.max(1, Math.round(list.length * 0.3))) list = matched;
  }
  return list;
}
