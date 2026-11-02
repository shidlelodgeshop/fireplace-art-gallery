// Optional refresh of the small, explicitly labelled fallback collection.
// Live search in the authenticated controller remains the complete search path.
import { searchAll } from '../src/museums.js';
import { writeFile } from 'node:fs/promises';
const artworks = new Map(); const warnings = [];
for (const query of ['Claude Monet', 'Van Gogh', 'Winter landscapes', 'Christmas paintings', 'Autumn', 'Impressionism', 'Renaissance portraits']) {
  const result = await searchAll(query);
  warnings.push(...result.warnings);
  for (const artwork of result.artworks) {
    const key = `${artwork.source}:${artwork.id}`;
    const old = artworks.get(key); artworks.set(key, { ...artwork, topics: [...new Set([...(old?.topics || []), query.toLowerCase()])] });
  }
}
if (artworks.size < 12) throw new Error('Museum services unavailable; keep the existing fallback collection.');
await writeFile('catalog.json', JSON.stringify({ generatedAt: new Date().toISOString(), scope: 'Starter selection; not the complete museum collections', artworks: [...artworks.values()] }));
console.log(`Saved ${artworks.size} open-access paintings. ${warnings.length} service warnings.`);
