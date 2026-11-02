import { createRemoteJWKSet, jwtVerify } from 'jose';
let certs, lastIssuer;
export async function authorized(request, env, verify = jwtVerify) {
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
