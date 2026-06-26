import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Lightweight admin access guard for Tournament Lite.
//
// Protects the admin console pages + admin API routes by requiring an httpOnly
// session cookie (set by /api/tournament-lite/admin-login after a passcode check).
// PUBLIC routes are deliberately NOT matched and stay open/read-only:
//   /live/[token], /tournament-lite/board/[token], /api/tournament-lite/public,
//   and the login/logout endpoints.
// The session token is server-only (never reaches the client bundle).

const COOKIE = "tl_admin";

export const config = {
  matcher: [
    "/admin/:path*",
    "/tournaments/admin/:path*",
    "/tournament-lite",
    "/api/tournament-lite/state",
    "/api/tournament-lite/generate",
    "/api/tournament-lite/score",
    "/api/tournament-lite/recalc",
    "/api/tournament-lite/reset",
    "/api/tournament-lite/category",
  ],
};

export function middleware(req: NextRequest) {
  const token = process.env.TOURNAMENT_LITE_ADMIN_SESSION_TOKEN;
  const cookie = req.cookies.get(COOKIE)?.value;
  const authed = Boolean(token) && cookie === token;
  if (authed) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, reason: "unauthorized", message: "Admin login required." },
      { status: 401 },
    );
  }

  const url = req.nextUrl.clone();
  url.pathname = "/tournaments/login";
  url.search = `next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}
