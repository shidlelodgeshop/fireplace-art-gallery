export class ServiceError extends Error {
  constructor(message, status = 502, retryAfter = null) { super(message); this.status = status; this.retryAfter = retryAfter; }
}
export async function able(env, path, method = 'GET', body, fetcher = fetch) {
  const headers = { Authorization: `Bearer ${env.ABLESIGN_API_KEY}`, 'Content-Type': 'application/json' };
  if (env.ABLESIGN_WORKSPACE_ID) headers['Workspace-Id'] = env.ABLESIGN_WORKSPACE_ID;
  let r;
  try { r = await fetcher(`https://api.ablesign.tv/api/v1${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(25000) }); }
  catch { throw new ServiceError('AbleSign could not be reached. Check status before retrying.'); }
  if (!r.ok) throw new ServiceError(r.status === 429 ? 'AbleSign rate limit reached. Wait before trying again.' : r.status === 401 || r.status === 403 ? 'AbleSign refused access. Check the server key and account permissions.' : `AbleSign request failed (${r.status}). Check status before retrying.`, r.status === 429 ? 429 : 502, r.headers.get('Retry-After'));
  return (await r.json()).data;
}
export const playlistBody = id => ({ items: [{ mediafileId: id, displayDuration: 3600, sequenceNumber: 0 }], shufflePlay: false, enableImageTransitions: false, defaultTransition: null });
export async function upload(env, bytes, name, fetcher = fetch) {
  const init = await able(env, '/media_files/init_upload', 'POST', { filename: name, mimeType: 'image/jpeg', size: bytes.length }, fetcher);
  const u = new URL(init.url);
  if (u.protocol !== 'https:' || !(/(^|\.)amazonaws\.com$/.test(u.hostname))) throw new ServiceError('AbleSign returned an unexpected upload destination.');
  // Never send the API credential to the signed storage URL.
  const r = await fetcher(u.href, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: bytes, signal: AbortSignal.timeout(30000), redirect: 'manual' });
  if (!r.ok) throw new ServiceError('Image upload failed. Your previous painting is unchanged.');
  return able(env, '/media_files/finish_upload', 'POST', { uploadId: init.uploadId }, fetcher);
}
