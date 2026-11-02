export const museums = { met: 'The Metropolitan Museum of Art', artic: 'Art Institute of Chicago', cleveland: 'Cleveland Museum of Art', nga: 'National Gallery of Art, Washington' };
let ngaPaintings;
export function setNGACatalog(data) { ngaPaintings = data.artworks; }
async function ngaCatalog() { if (!ngaPaintings) ngaPaintings = (await json(new URL('../nga.json', import.meta.url))).artworks; return ngaPaintings; }
export function screenSuitable(a) { const ratio = Number(a.width) / Number(a.height); return Number.isFinite(ratio) && ratio >= 1.34 && ratio <= 2.37; }
export const normalizeQuery = q => String(q ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').slice(0, 120);
export async function json(url, fetcher = fetch) {
  const r = await fetcher(url, { signal: AbortSignal.timeout(15000), headers: { 'AIC-User-Agent': 'FireplaceArtGallery (https://github.com/shidlelodgeshop/fireplace-art-gallery)' } });
  if (!r.ok) throw new Error(r.status === 429 ? 'Museum is busy; try again later.' : 'Museum temporarily unavailable.');
  return r.json();
}
export function normalize(source, x) {
  let a;
  if (source === 'met') {
    if (!x.isPublicDomain || !/painting/i.test(x.objectName || '') || !x.primaryImage) return null;
    a = { id: x.objectID, title: x.title, artist: x.artistDisplayName, date: x.objectDate, image: x.primaryImage, thumbnail: x.primaryImageSmall || x.primaryImage, url: x.objectURL };
  } else if (source === 'artic') {
    if (!x.is_public_domain || !x.image_id || !/painting/i.test(x.artwork_type_title || '')) return null;
    const base = `https://www.artic.edu/iiif/2/${x.image_id}/full/`;
    a = { width: x.thumbnail?.width, height: x.thumbnail?.height, id: x.id, title: x.title, artist: x.artist_title || x.artist_display, date: x.date_display, thumbnail: `${base}400,/0/default.jpg`, image: `${base}1686,/0/default.jpg`, url: `https://www.artic.edu/artworks/${x.id}` };
  } else if (source === 'cleveland') {
    if (x.share_license_status !== 'CC0' || !/painting/i.test(x.type || '') || !x.images?.web?.url) return null;
    a = { width: x.images.web.width, height: x.images.web.height, id: x.id, title: x.title, artist: x.creators?.map(c => c.description).join('; '), date: x.creation_date, image: x.images.web.url, thumbnail: x.images.web.url, url: x.url };
  } else return null;
  return { ...a, id: String(a.id), source, museum: museums[source], title: a.title || 'Untitled', artist: a.artist || 'Unknown artist', date: a.date || 'Date unavailable', rights: 'Public domain / CC0' };
}
const fields = 'id,title,artist_title,artist_display,date_display,image_id,is_public_domain,artwork_type_title,thumbnail';
export async function detail(source, id, fetcher = fetch) {
  if (!/^[0-9]{1,12}$/.test(String(id))) throw new Error('Invalid artwork ID.');
  if (source === 'nga') { const a = (await ngaCatalog()).find(a => a.id === String(id)); if (!a) throw new Error('Artwork unavailable.'); return a; }
  let x;
  if (source === 'met') x = await json(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`, fetcher);
  else if (source === 'artic') x = (await json(`https://api.artic.edu/api/v1/artworks/${id}?fields=${fields}`, fetcher)).data;
  else if (source === 'cleveland') x = (await json(`https://openaccess-api.clevelandart.org/api/artworks/${id}`, fetcher)).data;
  else throw new Error('Unknown museum.');
  const a = normalize(source, x);
  if (!a) throw new Error('This painting no longer has an eligible open-access image.');
  return a;
}
export async function searchMuseum(source, query, page = 1, fetcher = fetch) {
  const q = normalizeQuery(query), offset = (page - 1) * 12;
  if (!q) return [];
  if (source === 'nga') { const words = q.toLowerCase().split(' '); return (await ngaCatalog()).filter(a => q.toLowerCase() === 'wide paintings' || words.every(w => [a.title,a.artist,a.date,a.museum,...(a.topics || [])].join(' ').toLowerCase().includes(w))).slice((page-1)*24,page*24); }
  if (source === 'met') {
    const data = await json(`https://collectionapi.metmuseum.org/public/collection/v1.1/search?${new URLSearchParams({ q, hasImages: 'true', medium: 'Paintings', limit: '12', offset: String(offset) })}`, fetcher);
    const ids = data.objectIDs || [];
    const out = [];
    // Three concurrent detail calls, below the museum's request limit.
    for (let i = 0; i < ids.length; i += 3) {
      const batch = await Promise.allSettled(ids.slice(i, i + 3).map(id => detail(source, id, fetcher)));
      out.push(...batch.filter(r => r.status === 'fulfilled').map(r => r.value));
    }
    return out;
  }
  if (source === 'artic') {
    const params = new URLSearchParams({ q, limit: '12', page: String(page), fields, 'query[bool][filter][0][term][is_public_domain]': 'true', 'query[bool][filter][1][term][artwork_type_title.keyword]': 'Painting' });
    return (await json(`https://api.artic.edu/api/v1/artworks/search?${params}`, fetcher)).data.map(x => normalize(source, x)).filter(Boolean);
  }
  const params = new URLSearchParams({ q, cc0: '', has_image: '1', type: 'Painting', limit: '12', skip: String(offset) });
  return (await json(`https://openaccess-api.clevelandart.org/api/artworks/?${params}`, fetcher)).data.map(x => normalize(source, x)).filter(Boolean);
}
export async function searchAll(query, page = 1, fetcher = fetch) {
  const sources = Object.keys(museums);
  const results = await Promise.allSettled(sources.map(s => searchMuseum(s, query, page, fetcher)));
  return { artworks: results.flatMap(r => r.status === 'fulfilled' ? r.value : []), warnings: results.flatMap((r, i) => r.status === 'rejected' ? [`${museums[sources[i]]}: ${r.reason.message}`] : []) };
}
