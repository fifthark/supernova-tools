import { NextResponse } from "next/server";

// POST /api/tournament-lite/admin-login — verify the admin passcode and set an
// httpOnly session cookie. Passcode and session token are server-only env vars.
export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function POST(req: Request) {
  const passcode = process.env.TOURNAMENT_LITE_ADMIN_PASSCODE;
  const token = process.env.TOURNAMENT_LITE_ADMIN_SESSION_TOKEN;
  if (!passcode || !token) {
    return NextResponse.json(
      { ok: false, reason: "config_error", message: "Admin login is not configured." },
      { status: 500 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* missing/invalid body -> treated as no passcode */
  }
  const supplied = typeof body.passcode === "string" ? body.passcode : "";
  // Always run the constant-time comparison — including for an empty/missing
  // passcode — so response timing can't distinguish "no passcode sent" from
  // "wrong passcode". safeEqual("", passcode) is false, so 401 still holds.
  if (!safeEqual(supplied, passcode)) {
    return NextResponse.json(
      { ok: false, reason: "invalid_passcode", message: "Incorrect passcode." },
      { status: 401 },
    );
  }

  const isHttps =
    req.headers.get("x-forwarded-proto") === "https" || new URL(req.url).protocol === "https:";
  const res = NextResponse.json({ ok: true });
  res.cookies.set("tl_admin", token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12h pilot session
  });
  return res;
}
