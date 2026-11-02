import { mkdir, cp } from 'node:fs/promises';
await mkdir('dist/src', { recursive: true });
for (const file of ['catalog.json', 'index.html', 'style.css', 'src/app.js', 'src/museums.js']) await cp(file, `dist/${file}`);
