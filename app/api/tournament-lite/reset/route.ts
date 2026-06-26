import { NextResponse } from "next/server";
import { gasPost } from "@/app/tournament-lite/lib/gasClient";

// POST /api/tournament-lite/reset — clear fixtures.
// Optional client body: { categoryId } resets one category; else all.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* empty body resets all categories */
  }
  const payload: Record<string, unknown> = {};
  if (typeof body.categoryId === "string" && body.categoryId !== "") payload.categoryId = body.categoryId;
  return NextResponse.json(await gasPost("resetFixtures", payload));
}
