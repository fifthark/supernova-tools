// HMAC-signed, expiring cookies; the backing session ID is also checked by GAS
// on every admin operation, so logout revokes a copied cookie across instances.
const encoder = new TextEncoder();
async function key() {
  const secret = process.env.TOURNAMENT_LITE_ADMIN_SESSION_TOKEN;
  if (!secret) throw new Error('Admin session signing is not configured.');
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
function encode(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function decode(value: string) { return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)); }
export async function signSession(id: string, expiresAt: number) {
  const payload = encode(encoder.encode(JSON.stringify({ id, expiresAt })));
  return `${payload}.${encode(new Uint8Array(await crypto.subtle.sign('HMAC', await key(), encoder.encode(payload))))}`;
}
export async function verifySession(cookie?: string): Promise<{ id: string; expiresAt: number } | null> {
  try {
    if (!cookie || cookie.length > 512) return null;
    const parts = cookie.split('.'); if (parts.length !== 2) return null;
    if (!await crypto.subtle.verify('HMAC', await key(), decode(parts[1]), encoder.encode(parts[0]))) return null;
    const session = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    if (!/^[a-f0-9]{32}$/.test(session.id) || !Number.isFinite(session.expiresAt) || session.expiresAt <= Date.now() || session.expiresAt > Date.now() + 12 * 60 * 60 * 1000 + 60000) return null;
    return session;
  } catch { return null; }
}
export async function loginClientKey(req: Request) {
  // Vercel overwrites these proxy headers. Outside Vercel use a shared local
  // bucket, not an untrusted client-supplied address. Non-Vercel hosting needs
  // a verified proxy integration before use by multiple admins.
  const address = process.env.VERCEL ? (req.headers.get('x-vercel-forwarded-for') || req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim() : 'local';
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', await key(), encoder.encode(`login:${address}`)));
  return Array.from(digest.slice(0,16), b => b.toString(16).padStart(2,'0')).join('');
}
