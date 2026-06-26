import { NextResponse } from "next/server";
import { gasPost } from "@/app/tournament-lite/lib/gasClient";

// POST /api/tournament-lite/recalc — recalculate the leaderboard.
// Optional client body: { poolId } or { categoryId } (else all pools).
// Secret added server-side.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* empty body recalculates all pools */
  }

  const payload: Record<string, unknown> = {};
  if (typeof body.poolId === "string" && body.poolId !== "") payload.poolId = body.poolId;
  if (typeof body.categoryId === "string" && body.categoryId !== "") payload.categoryId = body.categoryId;

  return NextResponse.json(await gasPost("recalcLeaderboard", payload));
}
