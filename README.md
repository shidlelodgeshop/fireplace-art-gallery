# Fireplace Art Gallery

A museum art picker for a 1920 × 1080 television. Search the Metropolitan Museum of Art, Art Institute of Chicago, Cleveland Museum of Art and National Gallery of Art; save favorites and send a painting to the paired TV.

- Gallery: https://shidlelodgeshop.github.io/fireplace-art-gallery/
- [Controller setup](SETUP.md)
- Check and build: `npm ci && npm test && npm run build`
- Local backend: `npm run dev`. Missing authentication settings intentionally return HTTP 401.

The phone prepares one JPEG for AbleSign. It does not need to mirror the screen or remain connected after submission. Whole-painting framing with a neutral Stone mat is the default; full-screen cropping is optional. Valid portrait and square paintings can use a mat without distortion. Art brightness changes image pixels, rather than the television's backlight. The bundled NGA catalog contains 604 landscape paintings; museum searches provide additional works. Museum attribution and source links remain visible.

## Optional Fire TV companion

The personal TV companion can read the last confirmed selection through `GET /device/state` using a separately provisioned `TV_VIEW_TOKEN` bearer credential. The endpoint returns only artwork metadata, presentation settings and submission time. It cannot upload, select a different painting, inspect AbleSign credentials or authorize any `/api/*` controller operation. The controller password and AbleSign key remain server secrets.

The companion retrieves the original museum image from an allowlist of HTTPS image hosts, caches it privately on the TV, and renders its own Art brightness, mat and fit/fill settings. A new phone submission supplies fresh presentation defaults. The TV's local adjustments apply only to the companion; the AbleSign playlist remains the original fallback. Pairing credentials are not embedded in the APK or source archive.

The TV connection refreshes at most once a minute while Art is open, and on Home entry subject to the same throttle. Cached Art survives network outages. No image rendering runs in the Worker for this connection. Existing authenticated phone controls and the public gallery keep their original routes.

For production updates, use `npm run build` then `npx wrangler deploy --keep-vars` to preserve dashboard variables. Provision `TV_VIEW_TOKEN` through Wrangler's secret input; never commit its value. Rotating it requires updating the paired TV's private credential as well.

GitHub Actions tests and publishes the public frontend. Worker deployment is separate. The old `artwork.csv` is retained as historical content and is unused.
