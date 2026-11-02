import { prepareJPEG } from './format.js';
import { searchAll, detail, normalizeQuery, screenSuitable } from './museums.js';
const $ = id => document.getElementById(id);
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private browsing/storage full must not break the gallery. */ } };
let catalogPromise;
async function fallbackCatalog(q) {
  catalogPromise ||= fetch(new URL('../catalog.json', import.meta.url)).then(r => r.ok ? r.json() : { artworks: [] }).catch(() => ({ artworks: [] }));
  const catalog = await catalogPromise;
  const words = normalizeQuery(q).toLowerCase().split(' ');
  return catalog.artworks.filter(a => { const text = [a.title, a.artist, a.date, a.museum, ...(a.topics || [])].join(' ').toLowerCase(); return words.every(w => text.includes(w)); });
}
let favorites = read('fireplace-favorites', []), selected, page = 1, generation = 0, showingFavorites = false, results = [];
let backend = read('fireplace-backend', 'https://fireplace-art-controller.fireplace-art-gallery.workers.dev'), settings = read('fireplace-settings', { mode: 'fill', brightness: 70, background: '#000000' });
// Migrate old fit preferences to edge-to-edge presentation.
settings.mode = 'fill';
// workers.dev or a custom controller hostname is detected through an explicit /controller path.
const controller = location.pathname.startsWith('/controller');
let last = read('fireplace-last', null);
const key = a => `${a.source}:${a.id}`;
const say = (id, text) => { $(id).textContent = text; };
function count() { say('favorite-count', favorites.length); }
function render() {
  $('grid').replaceChildren();
  for (const artwork of results) {
    const card = document.createElement('button'); card.className = 'card'; card.setAttribute('aria-label', `${artwork.title}, ${artwork.artist}`);
    const wrap = document.createElement('div'); wrap.className = 'art-image';
    const img = document.createElement('img'); img.src = artwork.thumbnail; img.alt = artwork.title; img.loading = 'lazy'; img.referrerPolicy = 'no-referrer';
    card.style.visibility = 'hidden';
    img.onload = () => { const sized = {...artwork,width:img.naturalWidth,height:img.naturalHeight}; if (!screenSuitable(sized)) { card.remove(); results = results.filter(a => key(a) !== key(artwork)); } else { Object.assign(artwork,sized); card.style.visibility='visible'; } };
    img.onerror = () => { card.remove(); };
    wrap.append(img); card.append(wrap);
    for (const [tag, text] of [['h3', artwork.title], ['p', `${artwork.artist} · ${artwork.date}`], ['small', artwork.museum]]) { const el = document.createElement(tag); el.textContent = text; card.append(el); }
    card.onclick = () => preview(artwork); $('grid').append(card);
  }
  count();
}
async function search(append = false) {
  const q = normalizeQuery($('query').value); if (!q) return;
  const run = ++generation; showingFavorites = false; if (!append) { page = 1; results = []; render(); }
  say('results-heading', q); say('message', 'Looking through the museum collections…'); $('more').hidden = true;
  try {
    const data = controller ? await api(`/api/search?q=${encodeURIComponent(q)}&page=${page}`) : await fetch(`${new URL('/public/search',backend).href}?q=${encodeURIComponent(q)}&page=${page}`,{signal:AbortSignal.timeout(25000)}).then(r=>{if(!r.ok) throw new Error('Museum search temporarily unavailable.');return r.json();});
    if (!controller && data.warnings.length) {
      const fallback = await fallbackCatalog(q);
      const seen = new Set(data.artworks.map(key));
      data.artworks.push(...fallback.filter(a => !seen.has(key(a))));
      data.warnings = ['Some museum services are temporarily unavailable. Results also include paintings from the saved collection.'];
    }
    if (run !== generation) return;
    const known = new Set(results.map(key)); results.push(...data.artworks.filter(a => !known.has(key(a)) && (!a.width || screenSuitable(a)))); render();
    say('message', `${results.length} candidates · only widescreen paintings are shown after image checks${data.artworks.length ? '' : ' · No more eligible paintings on this page. Try another search.'}${data.warnings.length ? '\n' + data.warnings.join('\n') : ''}`);
    $('more').hidden = data.artworks.length === 0 && data.warnings.length === 0;
  } catch (e) { if (run === generation) say('message', e.message); }
}
function updatePreview() {
  settings = { mode: 'fill', background: $('background').value, brightness: Number($('brightness').value) };
  $('preview-image').style.objectFit = settings.mode === 'fill' ? 'cover' : 'contain';
  $('preview-image').style.filter = `brightness(${settings.brightness}%)`;
  document.querySelector('.tv-frame').style.background = settings.background;
  say('brightness-value', `${settings.brightness}%`); write('fireplace-settings', settings);
}
function preview(a) {
  selected = a; last = a; write('fireplace-last', a);
  $('preview-image').src = controller ? `/api/image?source=${a.source}&id=${a.id}` : a.image; $('preview-image').alt = a.title;
  $('preview-image').onerror = () => {
    if ($('preview-image').src !== a.thumbnail) { $('preview-image').src = a.thumbnail; say('display-message', 'Full-size preview unavailable; showing the museum thumbnail. The controller retrieves the TV image separately.'); }
    else say('display-message', 'The museum image could not be loaded. Try another painting.');
  };
  say('preview-title', a.title); say('preview-meta', `${a.artist} · ${a.date}`); say('preview-museum', `${a.museum} · ${a.rights}`);
  $('source-link').href = /^https:\/\//.test(a.url || '') ? a.url : '#';
  $('mode').value = settings.mode; $('background').value = settings.background; $('brightness').value = settings.brightness;
  say('display-message', ''); saveLabel(); updatePreview(); if (!$('preview').open) $('preview').showModal();
}
function saveLabel() { say('save', favorites.some(a => key(a) === key(selected)) ? '♥ Saved' : '♡ Save'); }
async function api(path, body) {
  let r;
  try { r = await fetch(path, { method: body ? 'POST' : 'GET', headers: body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(body ? 120000 : 20000) }); }
  catch { throw new Error('Connection interrupted. Check TV status before retrying; the last request may have been accepted.'); }
  if (!r.headers.get('content-type')?.includes('application/json')) throw new Error('Your sign-in may have expired. Reload the secure controller to sign in again.');
  const data = await r.json(); if (!r.ok) throw new Error(data.error || 'Controller unavailable.'); return data;
}
$('search-form').onsubmit = e => { e.preventDefault(); search(); };
document.querySelectorAll('.suggestions button').forEach(b => b.onclick = () => { $('query').value = b.textContent; search(); });
$('more').onclick = () => { page++; search(true); };
$('favorites').onclick = () => { ++generation; showingFavorites = true; results = favorites.filter(a => !a.width || screenSuitable(a)); render(); say('results-heading', 'Your favorites'); say('message', favorites.length ? 'Saved on this device.' : 'Open a painting and tap Save to begin your collection.'); $('more').hidden = true; };
$('save').onclick = () => { const exists = favorites.some(a => key(a) === key(selected)); favorites = exists ? favorites.filter(a => key(a) !== key(selected)) : [...favorites, selected]; write('fireplace-favorites', favorites); saveLabel(); count(); if (showingFavorites) { results = favorites.filter(a => !a.width || screenSuitable(a)); render(); } };
for (const id of ['mode', 'background', 'brightness']) $(id).oninput = updatePreview;
document.querySelectorAll('dialog .close').forEach(b => b.onclick = () => b.closest('dialog').close());
$('settings').onclick = () => { $('backend').value = backend; $('connection').showModal(); };
function backendURL() { const u = new URL(backend); if (u.protocol !== 'https:' || u.username || u.password) throw new Error('Use your secure HTTPS controller address.'); return new URL('/controller', u.origin); }
$('save-backend').onclick = () => { try { backend = $('backend').value.trim(); backendURL(); write('fireplace-backend', backend); say('connection-message', 'Controller saved. Display on TV will open its secure sign-in.'); } catch (e) { say('connection-message', e.message); } };
$('open-controller').onclick = () => { try { location.href = backendURL().href; } catch (e) { say('connection-message', e.message); } };
$('display').onclick = async () => {
  if (!controller) {
    if (!backend) { $('connection').showModal(); return; }
    try { const u = backendURL(); u.search = new URLSearchParams({ source: selected.source, id: selected.id, ...settings }).toString(); location.href = u.href; } catch (e) { say('display-message', e.message); } return;
  }
  $('display').disabled = true; say('display-message', 'Preparing your painting and sending it to AbleSign…');
  try {
    const input = { source: selected.source, id: selected.id, ...settings };
    const jpeg = await prepareJPEG(`/api/image?source=${selected.source}&id=${selected.id}`, settings);
    const form = new FormData(); form.append('settings', JSON.stringify(input)); form.append('image', jpeg, 'painting.jpg');
    say('display-message', 'Image prepared. Sending it to AbleSign… Keep this page open until confirmation.');
    const data = await api('/api/display', form); say('display-message', data.message);
  }
  catch (e) { say('display-message', e.message); }
  finally { $('display').disabled = false; }
};
$('check-status').onclick = async () => {
  if (!controller) { say('display-message', 'Open your secure controller to check the TV.'); return; }
  try { const s = await api('/api/status'); say('display-message', `${s.playlistMatches ? 'The AbleSign playlist matches your last submission.' : 'The playlist does not match a confirmed submission.'} Last player heartbeat: ${s.heartbeatTime ? new Date(s.heartbeatTime).toLocaleString() : 'unavailable'}. ${s.message}`); } catch (e) { say('display-message', e.message); }
};
count();
const hash = new URLSearchParams(location.search || location.hash.slice(1));
if (controller && hash.has('source')) {
  try { settings = { mode: 'fill', brightness: Math.min(100, Math.max(10, Number(hash.get('brightness')) || 70)), background: ['#000000', '#24211e', '#77716a'].includes(hash.get('background')) ? hash.get('background') : '#000000' }; const a = await api(`/api/artwork?${new URLSearchParams({ source: hash.get('source'), id: hash.get('id') })}`); preview(a); say('display-message', 'Signed in to your controller. Tap Display on TV to submit this painting.'); } catch (e) { say('message', e.message); }
} else if (last && screenSuitable(last)) { preview(last); } else if (controller) {
  try { const state = await api('/api/status'); if (state.last?.artwork) preview(state.last.artwork); } catch (e) { say('message', e.message); }
}
search();
