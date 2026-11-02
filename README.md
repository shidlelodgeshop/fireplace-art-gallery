# Fireplace Art Gallery

A mobile museum art picker for a 1920 × 1080 television using AbleSign on Fire TV. Fit/fill, neutral surrounds, digital brightness, local favorites and last selection. The phone formats one JPEG, then AbleSign handles independent playback. No mirroring or continuous phone connection.

- Public gallery: https://shidlelodgeshop.github.io/fireplace-art-gallery/
- [Connect the private controller and test the TV](SETUP.md)
- `npm ci && npm test && npm run build`
- `npm run dev` starts the Cloudflare emulator. Missing identity settings intentionally produce HTTP 401. For public gallery preview: `python3 -m http.server 4173 --directory dist`.
- `node scripts/catalog.mjs` refreshes the explicitly labelled fallback starter collection from official museum APIs. This is not the complete museum catalog.

**Status:** Frontend and authenticated free-tier backend deployed. Screen discovery, JPEG upload, and a single-image playlist write/read-back have succeeded with the owner account. Actual television playback, phone-disconnected persistence, power-cycle recovery, and iPhone Safari behavior still require physical-device verification. GitHub Actions tests and deploys the public frontend. Server secrets never belong in frontend code.

The old `artwork.csv` is retained only as historical repository content and is unused.

## Widescreen collection update
The gallery now includes 604 open-access landscape-format paintings indexed from the National Gallery of Art official open data (https://github.com/NationalGalleryOfArt/opendata), filtered using primary-image dimensions and openaccess=1. Museum-provided metadata and images remain credited and linked. Search Wide paintings to browse this collection. Public searches use the cached, read-only /public/search backend route, avoiding museum browser CORS failures; TV controls remain authenticated. Fill screen is the default and only offered composition mode; images outside 1.34–2.37 width/height are removed and rejected during JPEG preparation. Up to about 25% of a suitable painting may be cropped, preserving proportions. Borders already photographed into museum images may require individual curation.
