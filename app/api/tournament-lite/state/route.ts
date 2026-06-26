import { NextResponse } from "next/server";
import { gasPost } from "@/app/tournament-lite/lib/gasClient";

// POST /api/tournament-lite/state — full admin workspace state.
// The browser calls this with no body; the admin secret is added server-side.
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(await gasPost("state", {}));
}
