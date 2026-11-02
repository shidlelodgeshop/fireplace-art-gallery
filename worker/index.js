import { authorized, sameOrigin } from './auth.js';
import { detail, searchAll } from '../src/museums.js';
import { options, jpegDimensions } from '../src/display.js';
import { able, upload, playlistBody, ServiceError } from './ablesign.js';
const reply = (data, status = 200, extra = {}) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
export default {
  async fetch(request, env) {
    // Fail closed even if the Access edge application was accidentally removed.
    if (!await authorized(request, env)) return reply({ error: 'Sign in to your private art controller. If no login is offered, the server login secret has not been configured.' }, 401, env.CONTROLLER_PASSWORD ? { 'WWW-Authenticate': 'Basic realm="Fireplace Art Controller", charset="UTF-8"' } : {});
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (!['GET', 'POST'].includes(request.method)) return reply({ error: 'Method not allowed.' }, 405);
    if (request.method === 'POST' && !sameOrigin(request)) return reply({ error: 'Same-origin JSON requests required.' }, 403);
    try {
      if (url.pathname === '/api/artwork' && request.method === 'GET') return reply(await detail(url.searchParams.get('source'), url.searchParams.get('id')));
      if (url.pathname === '/api/search' && request.method === 'GET') return reply(await searchAll(url.searchParams.get('q'), Math.min(100, Math.max(1, Number(url.searchParams.get('page')) || 1))));
      const id = env.TV.idFromName('fireplace');
      return await env.TV.get(id).fetch(request);
    } catch { return reply({ error: 'Service unavailable. Try again shortly.' }, 503); }
  }
};
export class TVController {
  constructor(ctx, env) { this.ctx = ctx; this.env = env; this.queue = Promise.resolve(); }
  fetch(request) {
    // Serialize selection, upload and playlist writes across every phone/tab.
    const next = this.queue.then(() => this.handle(request));
    this.queue = next.catch(() => {});
    return next;
  }
  async handle(request) {
    const env = this.env, store = this.ctx.storage, path = new URL(request.url).pathname;
    if (!env.ABLESIGN_API_KEY) return reply({ error: 'AbleSign server secret has not been configured.' }, 503);
    try {
      if (path === '/api/screens' && request.method === 'GET') {
        const screens = [];
        for (let offset = 0; offset < 1000; offset += 200) {
          const batch = await able(env, `/screens?limit=200&offset=${offset}`);
          screens.push(...batch.map(s => ({ id: s.id, title: s.title, groupId: s.screenGroupId })));
          if (batch.length < 200) break;
        }
        return reply({ screens, configuredScreen: env.ABLESIGN_SCREEN_ID || null });
      }
      if (path === '/api/image' && request.method === 'GET') {
        const query = new URL(request.url).searchParams;
        const artwork = await detail(query.get('source'), query.get('id'));
        let imageURL = artwork.image;
        if (artwork.source === 'met') imageURL = imageURL.replace('/original/', '/web-large/');
        const imageHost = new URL(imageURL);
        if (imageHost.protocol !== 'https:' || !['images.metmuseum.org', 'www.artic.edu', 'openaccess-cdn.clevelandart.org'].includes(imageHost.hostname)) throw new ServiceError('Museum returned an unsupported image host.');
        const r = await fetch(imageURL, { redirect: 'error', signal: AbortSignal.timeout(20000) });
        if (!r.ok || Number(r.headers.get('content-length')) > 12000000) throw new ServiceError('Museum image is unavailable or too large.');
        return new Response(r.body, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=3600', 'X-Content-Type-Options': 'nosniff' } });
      }
      if (!/^[0-9]+$/.test(env.ABLESIGN_SCREEN_ID || '')) return reply({ error: 'Select your Fire Stick screen during backend setup.' }, 503);
      const target = `/screens/${env.ABLESIGN_SCREEN_ID}`;
      if (path === '/api/status' && request.method === 'GET') {
        const cached = await store.get('status');
        if (cached && Date.now() - cached.checkedAt < 30000) return reply(cached);
        const [screen, playlist] = await Promise.all([able(env, target), able(env, `${target}/playlist`)]);
        let last = await store.get('last');
        const pending = await store.get('pending');
        if (pending && playlist.items?.length === 1 && String(playlist.items[0].mediafileId) === String(pending.mediaId)) { last = pending; await store.put('last', last); await store.delete('pending'); }
        const result = { checkedAt: Date.now(), last: last || null, heartbeatTime: screen.heartbeatTime, playlistMatches: !!last && playlist.items?.length === 1 && String(playlist.items[0].mediafileId) === String(last.mediaId), displayConfirmed: false, message: 'Playlist and player heartbeat are server reports; verify the picture on your TV. Updates may take a few minutes.' };
        await store.put('status', result);
        return reply(result);
      }
      if (path !== '/api/display' || request.method !== 'POST') return reply({ error: 'Not found.' }, 404);
      if (Number(request.headers.get('content-length')) > 2200000) return reply({ error: 'Image request is too large.' }, 413);
      let input, suppliedImage;
      try {
        if (request.headers.get('content-type')?.startsWith('multipart/form-data')) {
          const form = await request.formData();
          input = JSON.parse(form.get('settings'));
          suppliedImage = form.get('image');
          if (!(suppliedImage instanceof File) || suppliedImage.size > 2000000 || suppliedImage.type !== 'image/jpeg') throw new Error();
        } else input = await request.json();
        options(input);
        if (!['met', 'artic', 'cleveland'].includes(input.source) || !/^[0-9]{1,12}$/.test(String(input.id))) throw new Error();
      } catch { return reply({ error: 'Invalid artwork, JPEG or display settings.' }, 400); }
      const settings = options(input);
      const fingerprint = `${input.source}-${input.id}-${settings.mode}-${settings.brightness}-${settings.background}`;
      const last = await store.get('last');
      // A repeated submission still checks the remote playlist; external edits cannot silently win.
      const current = await able(env, `${target}/playlist`);
      if (last?.fingerprint === fingerprint && current.items?.length === 1 && String(current.items[0].mediafileId) === String(last.mediaId)) return reply({ state: 'playlist-confirmed', last, message: 'This painting is already assigned. Actual TV playback still needs visual confirmation.' });
      const now = Date.now(), recent = (await store.get('writes') || []).filter(t => now - t < 3600000);
      if (recent.length >= 25 || recent.some(t => now - t < 10000)) return reply({ error: 'Please wait before changing the TV again. Changes are limited to protect AbleSign service limits.' }, 429, { 'Retry-After': '60' });
      // Reserve before remote work; failures also consume a local attempt budget.
      await store.put('writes', [...recent, now]);
      const screen = await able(env, target);
      if (screen.screenGroupId) return reply({ error: 'This screen belongs to a group. Remove it from that group in AbleSign before using its individual art playlist.' }, 409);
      const artwork = await detail(input.source, input.id);
      let mediaId = await store.get(`media:${fingerprint}`);
      if (mediaId) {
        try { await able(env, `/media_files/${mediaId}`); } catch (e) { throw new ServiceError('Cached artwork could not be checked. Try later; if you deleted it in AbleSign, clear the controller cache during maintenance.'); }
      } else {
        if (!suppliedImage) return reply({ error: 'The controller must prepare the TV image before submitting it.' }, 400);
        const jpeg = new Uint8Array(await suppliedImage.arrayBuffer());
        const dimensions = jpegDimensions(jpeg);
        if (dimensions.width !== 1920 || dimensions.height !== 1080) return reply({ error: 'The TV image must be a 1920 × 1080 JPEG.' }, 400);
        const media = await upload(env, jpeg, `fireplace-${fingerprint.replace('#', '')}.jpg`);
        mediaId = media.id;
        // Persist before playlist mutation so timeout/retry cannot duplicate uploads.
        await store.put(`media:${fingerprint}`, mediaId);
      }
      const pending = { fingerprint, mediaId, artwork, settings, submittedAt: new Date().toISOString() };
      await store.put('pending', pending);
      await able(env, `${target}/playlist`, 'PUT', playlistBody(mediaId));
      // Save the submission before confirmation; status remains useful if the GET fails.
      await store.put('last', pending); await store.delete('status');
      const playlist = await able(env, `${target}/playlist`);
      if (playlist.items?.length !== 1 || String(playlist.items[0].mediafileId) !== String(mediaId)) throw new ServiceError('Submitted, but playlist confirmation did not match. Check status before retrying.');
      await store.delete('pending');
      return reply({ state: 'playlist-confirmed', last: pending, message: 'AbleSign playlist confirmed. Your Fire Stick downloads independently; allow a few minutes and check the TV.' });
    } catch (e) {
      // Never return upstream bodies, signed URLs, headers or credentials.
      return reply({ error: e instanceof ServiceError ? e.message : 'Unable to prepare this painting. Try another artwork or check status before retrying.' }, e.status || 502, e.retryAfter ? { 'Retry-After': e.retryAfter } : {});
    }
  }
}
