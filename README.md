# Fireplace Art Gallery

A mobile museum art picker for a 1920 × 1080 television using AbleSign on Fire TV. Fit/fill, neutral surrounds, digital brightness, local favorites and last selection. The phone formats one JPEG, then AbleSign handles independent playback. No mirroring or continuous phone connection.

- Public gallery: https://shidlelodgeshop.github.io/fireplace-art-gallery/
- [Connect the private controller and test the TV](SETUP.md)
- `npm ci && npm test && npm run build`
- `npm run dev` starts the Cloudflare emulator. Missing identity settings intentionally produce HTTP 401. For public gallery preview: `python3 -m http.server 4173 --directory dist`.
- `node scripts/catalog.mjs` refreshes the explicitly labelled fallback starter collection from official museum APIs. This is not the complete museum catalog.

**Status:** Frontend and authenticated free-tier backend deployed. Screen discovery, JPEG upload, and a single-image playlist write/read-back have succeeded with the owner account. Actual television playback, phone-disconnected persistence, power-cycle recovery, and iPhone Safari behavior still require physical-device verification. GitHub Actions tests and deploys the public frontend. Server secrets never belong in frontend code.

The old `artwork.csv` is retained only as historical repository content and is unused.
