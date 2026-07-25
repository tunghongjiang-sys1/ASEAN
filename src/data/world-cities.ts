export type WorldCity = {
  name: string;
  country: string;
  lat: number;
  lng: number;
};

 
export const WORLD_CITIES: WorldCity[] = [
  { name: 'Singapore', country: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { name: 'Jakarta', country: 'Indonesia', lat: -6.2088, lng: 106.8456 },
  { name: 'Bali', country: 'Indonesia', lat: -8.3405, lng: 115.092 },
  { name: 'Denpasar', country: 'Indonesia', lat: -8.6705, lng: 115.2126 },
  { name: 'Surabaya', country: 'Indonesia', lat: -7.2575, lng: 112.7521 },
  { name: 'Bandung', country: 'Indonesia', lat: -6.9175, lng: 107.6191 },
  { name: 'Yogyakarta', country: 'Indonesia', lat: -7.7956, lng: 110.3695 },
  { name: 'Medan', country: 'Indonesia', lat: 3.5952, lng: 98.6722 },
  { name: 'Makassar', country: 'Indonesia', lat: -5.1477, lng: 119.4327 },
  { name: 'Labuan Bajo', country: 'Indonesia', lat: -8.4962, lng: 119.8877 },
  { name: 'Phnom Penh', country: 'Cambodia', lat: 11.5564, lng: 104.9282 },
  { name: 'Siem Reap', country: 'Cambodia', lat: 13.3633, lng: 103.8564 },
  { name: 'Sihanoukville', country: 'Cambodia', lat: 10.6271, lng: 103.5221 },
  { name: 'Battambang', country: 'Cambodia', lat: 13.0957, lng: 103.2022 },
  { name: 'Hanoi', country: 'Vietnam', lat: 21.0278, lng: 105.8342 },
  { name: 'Ho Chi Minh City', country: 'Vietnam', lat: 10.8231, lng: 106.6297 },
  { name: 'Da Nang', country: 'Vietnam', lat: 16.0544, lng: 108.2022 },
  { name: 'Hue', country: 'Vietnam', lat: 16.4637, lng: 107.5909 },
  { name: 'Hoi An', country: 'Vietnam', lat: 15.8801, lng: 108.338 },
  { name: 'Nha Trang', country: 'Vietnam', lat: 12.2388, lng: 109.1967 },
  { name: 'New York', country: 'United States', lat: 40.7128, lng: -74.006 },
  { name: 'New Jersey', country: 'United States', lat: 40.0583, lng: -74.4057 },
  { name: 'Newark', country: 'United States', lat: 40.7357, lng: -74.1724 },
  { name: 'New Orleans', country: 'United States', lat: 29.9511, lng: -90.0715 },
  { name: 'New Haven', country: 'United States', lat: 41.3083, lng: -72.9279 },
  { name: 'Newport', country: 'United States', lat: 41.4901, lng: -71.3128 },
  { name: 'Newport Beach', country: 'United States', lat: 33.6189, lng: -117.9298 },
  { name: 'New Delhi', country: 'India', lat: 28.6139, lng: 77.209 },
  { name: 'New Plymouth', country: 'New Zealand', lat: -39.0556, lng: 174.0752 },
  { name: 'Newcastle', country: 'United Kingdom', lat: 54.9783, lng: -1.6178 },
  { name: 'Newcastle', country: 'Australia', lat: -32.9283, lng: 151.7817 },
  { name: 'New Taipei', country: 'Taiwan', lat: 25.0169, lng: 121.4628 },
  { name: 'New Canaan', country: 'United States', lat: 41.1468, lng: -73.4948 },
  { name: 'Newfoundland', country: 'Canada', lat: 53.1355, lng: -57.6604 },
  { name: 'Newton', country: 'United States', lat: 42.337, lng: -71.2092 },
  { name: 'Los Angeles', country: 'United States', lat: 34.0522, lng: -118.2437 },
  { name: 'San Francisco', country: 'United States', lat: 37.7749, lng: -122.4194 },
  { name: 'Chicago', country: 'United States', lat: 41.8781, lng: -87.6298 },
  { name: 'Miami', country: 'United States', lat: 25.7617, lng: -80.1918 },
  { name: 'Boston', country: 'United States', lat: 42.3601, lng: -71.0589 },
  { name: 'Seattle', country: 'United States', lat: 47.6062, lng: -122.3321 },
  { name: 'Washington', country: 'United States', lat: 38.9072, lng: -77.0369 },
  { name: 'Toronto', country: 'Canada', lat: 43.6532, lng: -79.3832 },
  { name: 'Vancouver', country: 'Canada', lat: 49.2827, lng: -123.1207 },
  { name: 'Montreal', country: 'Canada', lat: 45.5017, lng: -73.5673 },
  { name: 'Mexico City', country: 'Mexico', lat: 19.4326, lng: -99.1332 },
  { name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278 },
  { name: 'Manchester', country: 'United Kingdom', lat: 53.4808, lng: -2.2426 },
  { name: 'Edinburgh', country: 'United Kingdom', lat: 55.9533, lng: -3.1883 },
  { name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522 },
  { name: 'Lyon', country: 'France', lat: 45.764, lng: 4.8357 },
  { name: 'Marseille', country: 'France', lat: 43.2965, lng: 5.3698 },
  { name: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405 },
  { name: 'Munich', country: 'Germany', lat: 48.1351, lng: 11.582 },
  { name: 'Hamburg', country: 'Germany', lat: 53.5511, lng: 9.9937 },
  { name: 'Amsterdam', country: 'Netherlands', lat: 52.3676, lng: 4.9041 },
  { name: 'Rotterdam', country: 'Netherlands', lat: 51.9244, lng: 4.4777 },
  { name: 'Brussels', country: 'Belgium', lat: 50.8503, lng: 4.3517 },
  { name: 'Madrid', country: 'Spain', lat: 40.4168, lng: -3.7038 },
  { name: 'Barcelona', country: 'Spain', lat: 41.3851, lng: 2.1734 },
  { name: 'Lisbon', country: 'Portugal', lat: 38.7223, lng: -9.1393 },
  { name: 'Rome', country: 'Italy', lat: 41.9028, lng: 12.4964 },
  { name: 'Milan', country: 'Italy', lat: 45.4642, lng: 9.19 },
  { name: 'Venice', country: 'Italy', lat: 45.4408, lng: 12.3155 },
  { name: 'Vienna', country: 'Austria', lat: 48.2082, lng: 16.3738 },
  { name: 'Zurich', country: 'Switzerland', lat: 47.3769, lng: 8.5417 },
  { name: 'Geneva', country: 'Switzerland', lat: 46.2044, lng: 6.1432 },
  { name: 'Stockholm', country: 'Sweden', lat: 59.3293, lng: 18.0686 },
  { name: 'Oslo', country: 'Norway', lat: 59.9139, lng: 10.7522 },
  { name: 'Copenhagen', country: 'Denmark', lat: 55.6761, lng: 12.5683 },
  { name: 'Helsinki', country: 'Finland', lat: 60.1699, lng: 24.9384 },
  { name: 'Dublin', country: 'Ireland', lat: 53.3498, lng: -6.2603 },
  { name: 'Athens', country: 'Greece', lat: 37.9838, lng: 23.7275 },
  { name: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784 },
  { name: 'Ankara', country: 'Turkey', lat: 39.9334, lng: 32.8597 },
  { name: 'Dubai', country: 'United Arab Emirates', lat: 25.2048, lng: 55.2708 },
  { name: 'Abu Dhabi', country: 'United Arab Emirates', lat: 24.4539, lng: 54.3773 },
  { name: 'Doha', country: 'Qatar', lat: 25.2854, lng: 51.531 },
  { name: 'Riyadh', country: 'Saudi Arabia', lat: 24.7136, lng: 46.6753 },
  { name: 'Cairo', country: 'Egypt', lat: 30.0444, lng: 31.2357 },
  { name: 'Casablanca', country: 'Morocco', lat: 33.5731, lng: -7.5898 },
  { name: 'Lagos', country: 'Nigeria', lat: 6.5244, lng: 3.3792 },
  { name: 'Nairobi', country: 'Kenya', lat: -1.2921, lng: 36.8219 },
  { name: 'Johannesburg', country: 'South Africa', lat: -26.2041, lng: 28.0473 },
  { name: 'Cape Town', country: 'South Africa', lat: -33.9249, lng: 18.4241 },
  { name: 'Mumbai', country: 'India', lat: 19.076, lng: 72.8777 },
  { name: 'Bangalore', country: 'India', lat: 12.9716, lng: 77.5946 },
  { name: 'Chennai', country: 'India', lat: 13.0827, lng: 80.2707 },
  { name: 'Kolkata', country: 'India', lat: 22.5726, lng: 88.3639 },
  { name: 'Hyderabad', country: 'India', lat: 17.385, lng: 78.4867 },
  { name: 'Karachi', country: 'Pakistan', lat: 24.8607, lng: 67.0011 },
  { name: 'Lahore', country: 'Pakistan', lat: 31.5204, lng: 74.3587 },
  { name: 'Dhaka', country: 'Bangladesh', lat: 23.8103, lng: 90.4125 },
  { name: 'Colombo', country: 'Sri Lanka', lat: 6.9271, lng: 79.8612 },
  { name: 'Kathmandu', country: 'Nepal', lat: 27.7172, lng: 85.324 },
  { name: 'Bangkok', country: 'Thailand', lat: 13.7563, lng: 100.5018 },
  { name: 'Chiang Mai', country: 'Thailand', lat: 18.7883, lng: 98.9853 },
  { name: 'Phuket', country: 'Thailand', lat: 7.8804, lng: 98.3923 },
  { name: 'Kuala Lumpur', country: 'Malaysia', lat: 3.139, lng: 101.6869 },
  { name: 'Penang', country: 'Malaysia', lat: 5.4141, lng: 100.3288 },
  { name: 'Manila', country: 'Philippines', lat: 14.5995, lng: 120.9842 },
  { name: 'Cebu', country: 'Philippines', lat: 10.3157, lng: 123.8854 },
  { name: 'Yangon', country: 'Myanmar', lat: 16.8661, lng: 96.1951 },
  { name: 'Vientiane', country: 'Laos', lat: 17.9757, lng: 102.6331 },
  { name: 'Luang Prabang', country: 'Laos', lat: 19.886, lng: 102.135 },
  { name: 'Hong Kong', country: 'China', lat: 22.3193, lng: 114.1694 },
  { name: 'Macau', country: 'China', lat: 22.1987, lng: 113.5439 },
  { name: 'Beijing', country: 'China', lat: 39.9042, lng: 116.4074 },
  { name: 'Shanghai', country: 'China', lat: 31.2304, lng: 121.4737 },
  { name: 'Guangzhou', country: 'China', lat: 23.1291, lng: 113.2644 },
  { name: 'Shenzhen', country: 'China', lat: 22.5431, lng: 114.0579 },
  { name: 'Taipei', country: 'Taiwan', lat: 25.033, lng: 121.5654 },
  { name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503 },
  { name: 'Osaka', country: 'Japan', lat: 34.6937, lng: 135.5023 },
  { name: 'Kyoto', country: 'Japan', lat: 35.0116, lng: 135.7681 },
  { name: 'Seoul', country: 'South Korea', lat: 37.5665, lng: 126.978 },
  { name: 'Busan', country: 'South Korea', lat: 35.1796, lng: 129.0756 },
  { name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093 },
  { name: 'Melbourne', country: 'Australia', lat: -37.8136, lng: 144.9631 },
  { name: 'Brisbane', country: 'Australia', lat: -27.4698, lng: 153.0251 },
  { name: 'Perth', country: 'Australia', lat: -31.9505, lng: 115.8605 },
  { name: 'Auckland', country: 'New Zealand', lat: -36.8485, lng: 174.7633 },
  { name: 'Wellington', country: 'New Zealand', lat: -41.2865, lng: 174.7762 },
  { name: 'Sao Paulo', country: 'Brazil', lat: -23.5505, lng: -46.6333 },
  { name: 'Rio de Janeiro', country: 'Brazil', lat: -22.9068, lng: -43.1729 },
  { name: 'Buenos Aires', country: 'Argentina', lat: -34.6037, lng: -58.3816 },
  { name: 'Santiago', country: 'Chile', lat: -33.4489, lng: -70.6693 },
  { name: 'Lima', country: 'Peru', lat: -12.0464, lng: -77.0428 },
  { name: 'Bogota', country: 'Colombia', lat: 4.711, lng: -74.0721 },
  { name: 'Moscow', country: 'Russia', lat: 55.7558, lng: 37.6173 },
  { name: 'Saint Petersburg', country: 'Russia', lat: 59.9311, lng: 30.3609 },
  { name: 'Warsaw', country: 'Poland', lat: 52.2297, lng: 21.0122 },
  { name: 'Prague', country: 'Czech Republic', lat: 50.0755, lng: 14.4378 },
  { name: 'Budapest', country: 'Hungary', lat: 47.4979, lng: 19.0402 },
  { name: 'Bucharest', country: 'Romania', lat: 44.4268, lng: 26.1025 },
  { name: 'Sofia', country: 'Bulgaria', lat: 42.6977, lng: 23.3219 },
  { name: 'Belgrade', country: 'Serbia', lat: 44.7866, lng: 20.4489 },
  { name: 'Zagreb', country: 'Croatia', lat: 45.815, lng: 15.9819 },
  { name: 'Reykjavik', country: 'Iceland', lat: 64.1466, lng: -21.9426 },
  { name: 'Anchorage', country: 'United States', lat: 61.2181, lng: -149.9003 },
  { name: 'Honolulu', country: 'United States', lat: 21.3069, lng: -157.8583 },
  { name: 'Port Moresby', country: 'Papua New Guinea', lat: -9.4438, lng: 147.1803 },
  { name: 'Suva', country: 'Fiji', lat: -18.1248, lng: 178.4501 },
  { name: 'Apia', country: 'Samoa', lat: -13.8333, lng: -171.7667 },
];

export function searchLocalCities(query: string, limit = 8): WorldCity[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = WORLD_CITIES.map((c) => {
    const name = c.name.toLowerCase();
    const country = c.country.toLowerCase();
    let score = 0;
    if (name === q) score = 100;
    else if (name.startsWith(q)) score = 80;
    else if (name.includes(q)) score = 60;
    else if (country.startsWith(q)) score = 40;
    else if (`${name}, ${country}`.includes(q)) score = 50;
    return { c, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.c.name.localeCompare(b.c.name));
  return scored.slice(0, limit).map((x) => x.c);
}

export async function searchWorldCities(query: string, limit = 8): Promise<WorldCity[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const local = searchLocalCities(q, limit);
  if (local.length >= limit) return local;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=${limit}&featuretype=city&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'asean-travel-app/1.0' },
    });
    if (!res.ok) return local;
    const data = await res.json();
    if (!Array.isArray(data)) return local;

    const remote: WorldCity[] = data
      .map((row: any) => {
        const name =
          row?.address?.city ||
          row?.address?.town ||
          row?.address?.village ||
          row?.address?.state ||
          row?.name ||
          String(row?.display_name || '').split(',')[0];
        const country = row?.address?.country || '';
        const lat = Number(row?.lat);
        const lng = Number(row?.lon);
        if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { name, country, lat, lng } as WorldCity;
      })
      .filter(Boolean) as WorldCity[];

    const seen = new Set(local.map((c) => `${c.name.toLowerCase()}|${c.country.toLowerCase()}`));
    const merged = [...local];
    for (const c of remote) {
      const key = `${c.name.toLowerCase()}|${c.country.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(c);
      if (merged.length >= limit) break;
    }
    return merged;
  } catch {
    return local;
  }
}
