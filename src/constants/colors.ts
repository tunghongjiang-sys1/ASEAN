export const colors = {
  forestGreen: '#06250E',
  forestGreenSoft: '#0D3B22',
  deepNavy: '#000080',
  midnightNavy: '#403F6F',
  pureWhite: '#FFFFFF',
  softCream: '#FFFDD0',
  cream: '#FFFED1',
  warmCream: '#FDFBD4',
  babyBlue: '#82D1F1',
  subtleBlue: '#D1E5F4',
  silentBlue: '#BEE1EE',
  aseanBlue: '#0032A0',
  aseanRed: '#EF3340',
  aseanYellow: '#F8E600',
  ink: '#1A1A3A',
  muted: '#6B6B8A',
  mist: '#F4F8FB',
  paper: '#FBFBF7',
  line: '#D8E6EF',
  success: '#2F9E7F',
  warning: '#E6A700',
};

export const categoryColors: Record<string, string> = {
  'coastline/islands': '#82D1F1',
  'underwater worlds': '#0032A0',
  'river and wetlands': '#2F9E7F',
  'mountain and wetlands': '#403F6F',
  'caves and underground': '#6B5B95',
  'volcanoes and craters': '#EF3340',
  'rock formation': '#B07D4F',
  'rock formations': '#B07D4F',
  'forest and jungles': '#1F7A4D',
  'wildlife sanctuaries': '#E6A700',
  'ancient ruins': '#C9A227',
  'historical sites': '#8B4513',
  'rural countryside': '#7CB342',
  'water communities – water housing': '#4FC3F7',
  'water communities - water housing': '#4FC3F7',
  'cultural villages': '#F8E600',
  'artisan towns': '#EF3340',
};

export function getCategoryColor(category: string): string {
  const key = category.toLowerCase().trim();
  return categoryColors[key] || colors.babyBlue;
}
