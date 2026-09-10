import { NextResponse } from "next/server";
import { timingSafeEqual, createHash, randomUUID } from "node:crypto";
import { gasPost } from "@/app/tournament-lite/lib/gasClient";
import { loginClientKey, signSession } from "@/app/tournament-lite/lib/session";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(req: Request) {
  const passcode = process.env.TOURNAMENT_LITE_ADMIN_PASSCODE;
  if (!passcode || !process.env.TOURNAMENT_LITE_ADMIN_SESSION_TOKEN) return NextResponse.json({ ok: false, reason: "config_error", message: "Admin login is not configured." }, { status: 503 });
  let body: Record<string, unknown> = {};
  try { const parsed = await req.json(); if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed; } catch { /* invalid body counts as a failed attempt */ }
  const supplied = typeof body.passcode === 'string' ? body.passcode : '';
  const validPasscode = timingSafeEqual(createHash('sha256').update(supplied).digest(), createHash('sha256').update(passcode).digest());
  const sessionId = randomUUID().replace(/-/g, '');
  const result = await gasPost('adminLogin', { clientKey: await loginClientKey(req), validPasscode, sessionId });
  if (!result.ok) {
    const status = result.reason === 'rate_limited' ? 429 : result.reason === 'invalid_passcode' ? 401 : 503;
    return NextResponse.json({ ok: false, reason: result.reason, message: result.message }, { status, headers: status === 429 ? { 'Retry-After': String(result.retryAfter || 900) } : undefined });
  }
  if (typeof result.expiresAt !== 'number') return NextResponse.json({ ok: false, reason: 'bad_gateway', message: 'Login service unavailable.' }, {status:503});
  const res = NextResponse.json({ ok: true });
  res.cookies.set('tl_admin', await signSession(sessionId, result.expiresAt), { httpOnly: true, secure: Boolean(process.env.VERCEL) || new URL(req.url).protocol === 'https:', sameSite: 'lax', path: '/', maxAge: 12 * 60 * 60 });
  return res;
}
