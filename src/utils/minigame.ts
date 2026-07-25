import { minigames } from '../../data/minigames';
import type { Minigame, MinigameType, Place } from '../types/place';

const CATEGORY_PLAY: Record<string, { type: MinigameType; verb: string; rules: string }> = {
  'coastline/islands': {
    type: 'explore',
    verb: 'shore explorer',
    rules: 'tap shoreline spots in order. each tap unlocks one simple fact. visit all spots to finish.',
  },
  'underwater worlds': {
    type: 'dive',
    verb: 'reef discover',
    rules: 'tap reef tiles one by one. each tile unlocks a sea fact. clear the reef to finish.',
  },
  'river and wetlands': {
    type: 'navigate',
    verb: 'river path',
    rules: 'tap river stops in order. each stop unlocks a water fact. reach the end to finish.',
  },
  'mountain and wetlands': {
    type: 'climb',
    verb: 'ridge climb',
    rules: 'tap trail steps from bottom to top. each step unlocks a mountain fact.',
  },
  'caves and underground': {
    type: 'explore',
    verb: 'cave lantern',
    rules: 'tap chamber lights in order. each light unlocks a cave fact. light them all to finish.',
  },
  'volcanoes and craters': {
    type: 'explore',
    verb: 'crater walk',
    rules: 'tap crater points carefully. each point unlocks a volcano fact. finish the loop to win.',
  },
  'rock formation': {
    type: 'puzzle',
    verb: 'rock puzzle',
    rules: 'tap rock pieces in matching order. each fit unlocks a geology fact.',
  },
  'rock formations': {
    type: 'puzzle',
    verb: 'rock puzzle',
    rules: 'tap rock pieces in matching order. each fit unlocks a geology fact.',
  },
  'forest and jungles': {
    type: 'protect',
    verb: 'canopy guardian',
    rules: 'tap forest spots to explore. each spot unlocks a jungle fact. visit all to finish.',
  },
  'wildlife sanctuaries': {
    type: 'guide',
    verb: 'wildlife watch',
    rules: 'tap animals gently in order. each sighting unlocks a wildlife fact.',
  },
  'ancient ruins': {
    type: 'restore',
    verb: 'ruin restore',
    rules: 'tap stone pieces in build order. each restore unlocks a history fact.',
  },
  'historical sites': {
    type: 'explore',
    verb: 'history walk',
    rules: 'tap timeline stops in order. each stop unlocks a history fact.',
  },
  'rural countryside': {
    type: 'terrace',
    verb: 'field day',
    rules: 'tap field rows in order. each row unlocks a farming fact.',
  },
  'water communities – water housing': {
    type: 'float',
    verb: 'floating day',
    rules: 'tap floating homes in order. each home unlocks a community fact.',
  },
  'water communities - water housing': {
    type: 'float',
    verb: 'floating day',
    rules: 'tap floating homes in order. each home unlocks a community fact.',
  },
  'cultural villages': {
    type: 'layout',
    verb: 'village map',
    rules: 'tap village spots in order. each spot unlocks a culture fact.',
  },
  'artisan towns': {
    type: 'pattern',
    verb: 'craft bench',
    rules: 'tap craft steps in order. each step unlocks an artisan fact.',
  },
};

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function playForCategory(category: string) {
  const key = category.toLowerCase().trim();
  return (
    CATEGORY_PLAY[key] || {
      type: 'explore' as MinigameType,
      verb: 'place explorer',
      rules: 'tap tiles one by one. each tap unlocks a simple fact about this place. finish all tiles to win.',
    }
  );
}

export function generateMinigameForPlace(place: Place): Minigame {
  const play = playForCategory(place.category);
  const short = place.location.split(',')[0].trim().toLowerCase();
  const facts =
    place.funFacts?.length >= 2
      ? place.funFacts.slice(0, 4)
      : [
          `${place.location} is a standout ${place.category.toLowerCase()} stop in ${place.country}.`,
          `travellers come here for: ${place.primaryActivities.toLowerCase()}.`,
          `getting there usually means: ${place.howToGetThere.split(';')[0].toLowerCase()}.`,
          `local tip: ${place.navigationTips.toLowerCase()}.`,
        ];

  return {
    id: 1000 + Math.abs(hash(place.id) % 9000),
    placeHints: [short],
    country: place.country,
    title: `${short} ${play.verb}`,
    category: place.category,
    type: play.type,
    description: `a tiny game that explains ${place.location} in its own way — ${play.verb} through the story of this place.`,
    rules: play.rules,
    facts,
  };
}

export function findMinigameForPlace(place: Place): Minigame {
  const loc = place.location.toLowerCase();
  const id = place.id.toLowerCase();
  const country = place.country.toLowerCase();

  const scored = (minigames as Minigame[])
    .filter((g) => g.country.toLowerCase() === country)
    .map((g) => {
      const score = g.placeHints.reduce((acc, hint) => {
        const h = hint.toLowerCase();
        if (loc.includes(h) || id.includes(h.replace(/\s+/g, ''))) return acc + 2;
        if (h.split(' ').some((w) => w.length > 3 && loc.includes(w))) return acc + 1;
        return acc;
      }, 0);
      return { g, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  
  if (scored[0] && scored[0].score >= 2) return scored[0].g;

  
  return generateMinigameForPlace(place);
}

export function getMinigameById(id: number, place?: Place | null): Minigame | null {
  const catalog = (minigames as Minigame[]).find((g) => g.id === id);
  if (catalog) return catalog;
  if (place) {
    const generated = generateMinigameForPlace(place);
    if (generated.id === id) return generated;
  }
  return null;
}
