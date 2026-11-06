import { createRemoteJWKSet, jwtVerify } from 'jose';
let certs, lastIssuer;
export async function authorized(request, env, verify = jwtVerify) {
  // Optional single-owner HTTP Basic login. Browser-owned credentials never enter app JS.
  if (env.CONTROLLER_PASSWORD) {
    if (!/^[!-~]{32,128}$/.test(env.CONTROLLER_PASSWORD)) return false;
    try {
      const header = request.headers.get('Authorization') || '';
      if (!header.startsWith('Basic ')) return false;
      const value = atob(header.slice(6));
      if (!value.startsWith('fireplace:')) return false;
      const password = value.slice(10);
      const encoder = new TextEncoder();
      const [actual, expected] = await Promise.all([password, env.CONTROLLER_PASSWORD].map(p => crypto.subtle.digest('SHA-256', encoder.encode(p))));
      const a = new Uint8Array(actual), b = new Uint8Array(expected);
      let difference = 0; for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
      return difference === 0;
    } catch { return false; }
  }
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.OWNER_EMAIL) return false;
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) return false;
  const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
  try {
    if (issuer !== lastIssuer) { certs = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)); lastIssuer = issuer; }
    const { payload } = await verify(token, certs, { issuer, audience: env.ACCESS_AUD });
    return typeof payload.email === 'string' && payload.email.toLowerCase() === env.OWNER_EMAIL.toLowerCase();
  } catch { return false; }
}
export function sameOrigin(request) {
  return request.headers.get('Origin') === new URL(request.url).origin && (/^(application\/json|multipart\/form-data)(;|$)/.test(request.headers.get('Content-Type') || ''));
}

// Read-only TV pairing credential. It never authorizes controller writes.
export async function deviceAuthorized(request, env) {
  if (!env.TV_VIEW_TOKEN || !/^[a-f0-9]{64}$/.test(env.TV_VIEW_TOKEN)) return false;
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ') || header.length > 256) return false;
  const encoder = new TextEncoder();
  const hashes = await Promise.all([header.slice(7), env.TV_VIEW_TOKEN].map(value => crypto.subtle.digest('SHA-256', encoder.encode(value))));
  return crypto.subtle.timingSafeEqual(hashes[0], hashes[1]);
}
