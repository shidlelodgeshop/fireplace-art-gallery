import { mkdir, cp } from 'node:fs/promises';
await mkdir('dist/src', { recursive: true });
for (const file of ['catalog.json', 'index.html', 'style.css', 'src/app.js', 'src/museums.js', 'src/display.js', 'src/format.js']) await cp(file, `dist/${file}`);
