import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataUrl = resolve(__dirname, '..', 'data', 'index.js');
const outPath = resolve(__dirname, '..', 'data', 'places.json');

const mod = await import(dataUrl);
const places = mod.places ?? [];
const categories = mod.categories ?? [];

writeFileSync(outPath, JSON.stringify({ places, categories }, null, 2));
console.log(
  `dumped ${places.length} places + ${categories.length} categories -> ${outPath.replace(process.cwd() + '/', '')}`
);
