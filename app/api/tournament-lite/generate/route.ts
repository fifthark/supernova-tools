import { NextResponse } from "next/server";
import { gasPost } from "@/app/tournament-lite/lib/gasClient";

// POST /api/tournament-lite/generate — generate fixtures.
// Optional client body: { force?: true, categoryId?: string }. categoryId
// regenerates one category (others preserved). Secret added server-side.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* empty / invalid body is fine — defaults apply */
  }
  const payload: Record<string, unknown> = {};
  if (body.force === true) payload.force = true;
  if (typeof body.categoryId === "string" && body.categoryId !== "") payload.categoryId = body.categoryId;
  return NextResponse.json(await gasPost("generateFixtures", payload));
}
