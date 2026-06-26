import { NextResponse } from "next/server";

// POST /api/tournament-lite/admin-logout — clear the admin session cookie.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const isHttps =
    req.headers.get("x-forwarded-proto") === "https" || new URL(req.url).protocol === "https:";
  const res = NextResponse.json({ ok: true });
  res.cookies.set("tl_admin", "", {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
