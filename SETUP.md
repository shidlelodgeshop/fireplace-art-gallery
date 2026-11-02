# Connect the television

The gallery runs on GitHub Pages. TV operations run on your authenticated Cloudflare Worker. Your iPhone formats and submits one JPEG while the controller page is open. The Fire Stick then downloads the finished JPEG from AbleSign; the iPhone can be locked after submission. Neither application changes the Fire TV launcher.

## One-time setup

The backend has been deployed at `https://fireplace-art-controller.fireplace-art-gallery.workers.dev`. It stays locked until these secrets exist. No Cloudflare Zero Trust subscription or card is required for this login method.

1. Choose a **32–128 character random ASCII password** in your password manager. This is a new controller password, separate from your AbleSign key. Username: **fireplace**. Spaces and non-ASCII characters are not accepted. The backend refuses weak/short configured passwords. Use a randomly generated password, not a sentence or reused password.
2. Enter these through Cloudflare's Worker → Settings → Variables and Secrets, type **Secret**. Alternatively run `npx wrangler secret put NAME` in a terminal; it hides your input and avoids command-line arguments:

   - `CONTROLLER_PASSWORD`: the random password above.
   - `ABLESIGN_API_KEY`: your existing Read/Write AbleSign key.
   - Optional `ABLESIGN_WORKSPACE_ID` if you use a nondefault workspace.

   Never paste keys into chat, source, browser JavaScript or the gallery Connect TV dialog. HTTP Basic authentication is handled by Safari's native login prompt over HTTPS, not by the gallery JavaScript. It may ask you to sign in again after a browser restart. Use the password manager to retain the controller password. Secrets are absent from the tracked Wrangler configuration so deploying code preserves them.
3. Open `https://fireplace-art-controller.fireplace-art-gallery.workers.dev/api/screens`. Sign in as **fireplace** with the controller password. Identify the paired Fire Stick by title. Set `ABLESIGN_SCREEN_ID` as another server secret to its numeric ID. Grouped screens are refused to avoid unexpected group behavior.
4. Open the GitHub gallery, search/select a painting, choose fit/fill, surround, and brightness, then Display on TV. The deployed controller address is already configured. This opens the controller as a top-level page, avoiding Safari third-party-cookie restrictions. Confirm with Display on TV after signing in. Keep that page open during the one-time JPEG preparation/upload; once confirmed, you can lock the phone. This replaces that screen's existing AbleSign playlist with the selected image only.

For another account/clone: `npm ci`, `npx wrangler login`, `npm run build`, `npx wrangler deploy`; update the frontend controller address and enter the server secrets. The Worker fails closed until configured. An alternative Cloudflare Access JWT path remains supported if `CONTROLLER_PASSWORD` is absent and `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD` and `OWNER_EMAIL` are all set. Do not activate Access unless you independently accept its plan's billing terms; the dashboard asked for billing and overage authorization even for its $0 plan during setup.

The authenticated controller also has the complete live museum search. GitHub Pages tries direct API search and falls back to the labelled saved starter collection when museum CORS or availability prevents a browser search. Favorites and last preview are local to each origin/device. The controller stores the last submitted artwork independently on the server. A lost or locked phone does not interrupt playback.

## Cost and capacity

GitHub Pages is appropriate for this public repository. The backend targets Cloudflare Workers Free with SQLite-backed Durable Objects and native browser password authentication. Image rendering runs once in the phone's canvas, so the Worker does not decode or resize museum images and does not need an image-processing subscription. No paid service has been enabled. Keep the controller open until submission finishes; afterward the phone is unnecessary. Free service limits still apply and must be checked in the deployed account. The @cf-wasm/photon dependency is used only for local reference-rendering tests and is excluded from the production Worker bundle.

Generated JPEG variants accumulate in AbleSign (a unique variant for each artwork/settings combination) and are reused. This avoids destructive cleanup of your library but eventually consumes storage. Delete old `fireplace-…` files through AbleSign during occasional maintenance. Cached records of deleted files currently need controller storage maintenance before that variant can be used again. No automatic deletion of existing account media is performed.

## Verification with your account and Fire Stick

Verified November 2, 2026: authenticated screen discovery, native Safari controller sign-in, server-proxied museum image retrieval, one-time browser JPEG formatting, AbleSign upload, single-image playlist replacement, and playlist read-back. These succeeded using the owner account. Physical display, phone-disconnected playback, restart recovery, and iPhone-specific behavior remain pending.

- Confirm `GET /api/screens`, a JPEG upload, and playlist write succeed using your existing free AbleSign account. Its official API guide specifies an API key and no separate paid prerequisite, but actual account entitlement remains unverified until these calls succeed.
- The controller shows **playlist confirmed**, never **display confirmed**. Heartbeat is a connectivity report, not proof that the image is on the TV. There is no invented force-sync endpoint: AbleSign documents automatic downloads within a few minutes.
- Test landscape and portrait paintings in Fit, then Fill; check all four edges and confirm no stretching. Try 30% and 100% brightness with the same TV backlight setting.
- After the playlist is confirmed, lock/turn off the phone. Wait at least ten minutes and confirm the painting stays displayed without overlays or transitions.
- Turn the TV off with its remote, then on; separately restart the Fire Stick and test brief Wi-Fi loss. Check whether cached artwork resumes. These are physical-device tests, not yet verified here.
- Press Home on the Fire remote, use a streaming app, then reopen AbleSign to resume Art Mode. Do not enable kiosk/launcher replacement.
- If a request times out, tap Check TV status before retrying. A playlist write may have succeeded even when the response was lost.

## GitHub Pages

The workflow builds `dist`, runs automated tests and validates the Worker bundle before deploying Pages. If the enablement step is refused by the repository's default Actions token, open repository Settings → Pages → Build and deployment → Source: **GitHub Actions**, then rerun “Test and deploy gallery”. Intended URL: https://shidlelodgeshop.github.io/fireplace-art-gallery/ .

## Official references checked November 2, 2026

- https://apidocs.ablesign.tv/ — API version 1.1.0, beta; screen, media upload, playlist and limits.
- https://www.ablesign.tv/digital-signage/ablesign-api-howto/ — upload → playlist → automatic download.
- https://www.ablesign.tv/digital-signage/why-is-ablesign-free/ — free service with optional extra storage.
- https://metmuseum.github.io/ — v1.1 paginated search; v1 object detail; image rights.
- https://api.artic.edu/docs/ — public-domain filter, painting type and IIIF derivatives.
- https://openaccess-api.clevelandart.org/ — CC0 image rights, search and image records.
- https://developers.cloudflare.com/workers/platform/limits/ — CPU, memory and request limits.
- https://developers.cloudflare.com/workers/platform/pricing/ — free request allowance; no paid subscription selected.
- https://developers.cloudflare.com/durable-objects/platform/pricing/ — SQLite-backed Durable Objects on Workers Free.
- https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/ — JWT signature, issuer and audience validation.
