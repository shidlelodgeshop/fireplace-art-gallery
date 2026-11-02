# Connect the television

The gallery runs on GitHub Pages. TV operations run on your authenticated Cloudflare Worker. Your iPhone formats and submits one JPEG while the controller page is open. The Fire Stick then downloads the finished JPEG from AbleSign; the iPhone can be locked after submission. Neither application changes the Fire TV launcher.

## One-time setup

1. From this repository, run `npm ci`, then `npx wrangler login`. Complete Cloudflare's account authorization yourself.
2. Run `npm run build` and `npx wrangler deploy`. Without identity settings the Worker rejects all requests, including assets. It is safe to deploy in this locked state. Record the workers.dev address.
3. In Cloudflare Zero Trust, create a **self-hosted Access application** protecting the **entire controller hostname**. Enable workers.dev Access protection if your dashboard offers it. Add an Allow policy for **only your own email**, using email one-time PIN or your existing identity provider. Do not create Bypass or Everyone policies. Copy the team domain and application AUD tag.
4. In the Worker's Settings → Variables and Secrets, set these as **secrets** (or use `npx wrangler secret put NAME`, which prompts without putting values in shell arguments):

   - `ABLESIGN_API_KEY`: your existing Read/Write key, entered only into Cloudflare's secret input.
   - `ACCESS_TEAM_DOMAIN`: just the hostname, e.g. `your-team.cloudflareaccess.com`.
   - `ACCESS_AUD`: your Access application's audience tag.
   - `OWNER_EMAIL`: the exact email used to sign in.
   - Optional `ABLESIGN_WORKSPACE_ID` if you use a nondefault workspace.

   Identity settings are deliberately absent from the tracked configuration so deploying code preserves your server secrets. Never commit secret values. No key belongs in the gallery's Connect TV dialog.
5. Visit `https://YOUR-CONTROLLER/api/screens` in the browser, sign in, and identify the paired Fire Stick by title. Set `ABLESIGN_SCREEN_ID` as a server secret to its numeric ID. A screen in a screen group is refused to avoid unexpected group behavior.
6. On the GitHub gallery, tap **Connect TV**, paste **only the controller address**, and Save. Search/select a painting, choose fit/fill, surround, and brightness, then Display on TV. This opens the controller as a top-level page, avoiding Safari's third-party-cookie restrictions. After sign-in, confirm with Display on TV. This replaces that screen's existing playlist with the selected image only.

The authenticated controller also has the complete live museum search. GitHub Pages tries direct API search and falls back to the labelled saved starter collection when museum CORS or availability prevents a browser search. Favorites and last preview are local to each origin/device. The controller stores the last submitted artwork independently on the server. A lost or locked phone does not interrupt playback.

## Cost and capacity

GitHub Pages is appropriate for this public repository. The backend targets Cloudflare Workers Free with SQLite-backed Durable Objects and Cloudflare Access's free allowance. Image rendering runs once in the phone's canvas, so the Worker does not decode or resize museum images and does not need an image-processing subscription. No paid service has been enabled. Keep the controller open until submission finishes; afterward the phone is unnecessary. Free service limits still apply and must be checked in the deployed account. The @cf-wasm/photon dependency is used only for local reference-rendering tests and is excluded from the production Worker bundle.

Generated JPEG variants accumulate in AbleSign (a unique variant for each artwork/settings combination) and are reused. This avoids destructive cleanup of your library but eventually consumes storage. Delete old `fireplace-…` files through AbleSign during occasional maintenance. Cached records of deleted files currently need controller storage maintenance before that variant can be used again. No automatic deletion of existing account media is performed.

## Verification with your account and Fire Stick

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
