import { writeFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ASSETS = resolve(ROOT, 'assets');

const { indonesiaData } = await import('../data/indonesia.js');
const { cambodiaData } = await import('../data/cambodia.js');
const { vietnamData } = await import('../data/vietnam.js');

const COUNTRIES = [
  { folder: 'Indonesia', list: indonesiaData, prefix: 'indonesia_', mode: 'number' },
  { folder: 'Cambodia', list: cambodiaData, prefix: 'cambodia_', mode: 'number' },
  { folder: 'Vietnam', list: vietnamData, prefix: 'vietnam_', mode: 'order' },
];

function numericName(file) {
  const m = file.match(/_(\d+)\./);
  return m ? parseInt(m[1], 10) : Infinity;
}

function mtimeMs(file, dir) {
  try {
    return statSync(resolve(dir, file)).mtimeMs;
  } catch {
    return 0;
  }
}

const photoExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const placeLines = [];
const poolLines = [];
const missing = [];

for (const { folder, list, prefix, mode } of COUNTRIES) {
  const dir = resolve(ASSETS, folder);
  let files = readdirSync(dir).filter(
    (f) => photoExts.has(extname(f).toLowerCase()) && f.startsWith(prefix)
  );

  if (mode === 'order') {
    files.sort((a, b) => mtimeMs(a, dir) - mtimeMs(b, dir));
  } else {
    files.sort((a, b) => numericName(a) - numericName(b));
  }

  const byNumber = new Map(files.map((f) => [numericName(f), f]));

  files.forEach((file) => {
    poolLines.push(`  require('../../assets/${folder}/${file}'),`);
  });

  list.forEach((place, i) => {
    const file = mode === 'order' ? files[i] : byNumber.get(i + 1);
    if (file) {
      placeLines.push(`  '${place.id}': require('../../assets/${folder}/${file}'),`);
    } else {
      missing.push({ country: folder, place: place.location, note: `missing ${prefix}${i + 1}` });
    }
  });
}

const output = `export const localPlaceImages: Record<string, number> = {
${placeLines.join('\n')}
};

export const homepagePhotos: number[] = [
${poolLines.join('\n')}
];

export function getLocalPlaceImage(placeId: string): number | undefined {
  return localPlaceImages[placeId];
}
`;

writeFileSync(resolve(ROOT, 'src', 'data', 'place-images.ts'), output);

console.log(`generated src/data/place-images.ts`);
console.log(`  mapped places: ${placeLines.length}`);
console.log(`  homepage pool: ${poolLines.length}`);
console.log('--- gaps / extras ---');
for (const m of missing) {
  console.log(`  [${m.country}] ${m.note || ''}${m.place ? ' -> ' + m.place : ''}`);
}
