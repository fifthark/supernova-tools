import { NextResponse } from "next/server";
import { gasPost } from "@/app/tournament-lite/lib/gasClient";

// POST /api/tournament-lite/score — save a match score.
// Required client body: { matchId, score1, score2 }. Secret added server-side.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* fall through to the validation error below */
  }

  const { matchId, score1, score2 } = body;
  const missing =
    matchId === undefined || matchId === null || matchId === "" ||
    score1 === undefined || score1 === null ||
    score2 === undefined || score2 === null;

  if (missing) {
    return NextResponse.json(
      { ok: false, reason: "bad_request", message: "matchId, score1 and score2 are required." },
      { status: 400 },
    );
  }

  return NextResponse.json(await gasPost("updateScore", { matchId, score1, score2 }));
}
