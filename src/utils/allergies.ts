// Shared logic for matching a traveller's food allergies against a place's
// signature dishes (the `food` field, e.g. "Fish Amok, Samlor Korkor").

// Each pattern is used two ways:
//   1) detection — does the traveller's allergy text mention one of these words?
//   2) matching — does the dish text contain any of these words?
const ALLERGEN_PATTERNS: Record<string, RegExp> = {
  shellfish:
    /\b(seafood|shellfish|shrimp|prawn|crab|lobster|squid|calamari|oyster|clam|mussel|scallop|crayfish|crustacean|siomay)\b|\b(cha muc|bun cua)\b/i,
  fish: /\b(fish|seafood|ikan|amok|tuna|cakalang|eel|snakehead|urchin)\b|\b(sate tuna|goi ca|ca mai|bun mam|gohu ikan|patin bakar)\b/i,
  nuts: /\b(nut|nuts|peanut|peanuts|cashew|almond|walnut|pecan|pistachio|hazelnut|macadamia|sesame|seed|seeds)\b/i,
  gluten: /\b(wheat|bread|noodle|noodles|gluten|dumpling|dumplings|pastry|roti|crepe|pancake|bakpia|flour)\b|\bbanh mi\b/i,
  soy: /\b(soy|soya|tofu|tempeh|kecap|tauco)\b/i,
  allium: /\b(garlic|onion|onions|shallot|shallots|leek|chive|chives|scallion|scallions|bawang)\b/i,
  spicy: /\b(spicy|chilli|chili|chillies|chilies|sambal|pedas)\b/i,
  dairy: /\b(dairy|milk|cheese|butter|cream|yogurt|yoghurt)\b/i,
  egg: /\b(egg|eggs)\b/i,
};

// Common ingredient aliases (Indonesian/Khmer/Vietnamese dish words) so e.g.
// "pork" also matches "Babi Guling" and "chicken" matches "Ayam Betutu".
const ALIAS_GROUPS: Array<{ keys: string[]; re: RegExp }> = [
  { keys: ['pork', 'babi'], re: /\b(pork|babi)\b/i },
  { keys: ['chicken', 'ayam', 'bebek', 'duck'], re: /\b(chicken|ayam|bebek|duck)\b/i },
  { keys: ['beef', 'sapi', 'daging', 'lok lak', 'rawon', 'konro'], re: /\b(beef|sapi|daging|lok lak|rawon|konro)\b/i },
  { keys: ['goat', 'mutton', 'lamb', 'kambing'], re: /\b(goat|mutton|lamb|kambing)\b/i },
];

const STOPWORDS = new Set([
  'and', 'or', 'the', 'for', 'with', 'but', 'not', 'any', 'all', 'has',
  'have', 'food', 'foods', 'allergy', 'allergies', 'allergic', 'to', 'of',
  'in', 'on', 'no', 'from', 'i', 'am', 'can', 'cannot', 'intolerant',
  'sensitivity', 'sensitive', 'restriction', 'restrictions', 'avoid',
]);

export function foodUnsafeForAllergies(
  food: string | null | undefined,
  allergies: string | null | undefined
): boolean {
  const dish = (food || '').toLowerCase();
  if (!dish) return false;
  const raw = (allergies || '').toLowerCase();
  if (!raw.trim()) return false;

  // 1) Keyword-driven allergen families.
  for (const re of Object.values(ALLERGEN_PATTERNS)) {
    if (re.test(raw) && re.test(dish)) return true;
  }

  // 2) Ingredient aliases (pork→babi, chicken→ayam, ...).
  for (const group of ALIAS_GROUPS) {
    const mentioned = group.keys.some((k) => new RegExp(`\\b${k}\\b`, 'i').test(raw));
    if (mentioned && group.re.test(dish)) return true;
  }

  // 3) Direct token fallback for anything else the traveller typed
  //    (e.g. "pork", "beef", "mango", "coconut").
  const tokens = raw
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  for (const t of tokens) {
    if (dish.includes(t)) return true;
  }

  return false;
}

export function foodSafeForAllergies(
  food: string | null | undefined,
  allergies: string | null | undefined
): boolean {
  return !foodUnsafeForAllergies(food, allergies);
}
