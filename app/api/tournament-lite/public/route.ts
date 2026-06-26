import { NextResponse } from "next/server";
import { gasGetPublic } from "@/app/tournament-lite/lib/gasClient";

// GET /api/tournament-lite/public?token=...&categoryId=...
// Public, read-only board. Token-gated by Share_Token; NO admin secret is used.
// The Apps Script /exec URL stays server-side only.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  const categoryId = url.searchParams.get("categoryId") || "";
  if (!token) {
    return NextResponse.json(
      { ok: false, reason: "bad_request", message: "A board token is required." },
      { status: 400 },
    );
  }
  const params: Record<string, string> = { action: "publicBoard", token };
  if (categoryId) params.categoryId = categoryId;
  return NextResponse.json(await gasGetPublic(params));
}
