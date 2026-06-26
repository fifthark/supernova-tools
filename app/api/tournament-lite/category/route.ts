import { NextResponse } from "next/server";
import { gasPost } from "@/app/tournament-lite/lib/gasClient";

// POST /api/tournament-lite/category — save editable category settings.
// Required: { categoryId } + any subset of the allowed fields below.
export const dynamic = "force-dynamic";

const FIELDS = [
  "Category_Name",
  "Start_Time",
  "End_Time",
  "Court_Whitelist",
  "Match_Duration_Minutes",
  "Buffer_Minutes",
  "Pool_Size",
  "Status",
];

export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* fall through to validation */
  }

  const categoryId = body.categoryId;
  if (typeof categoryId !== "string" || categoryId === "") {
    return NextResponse.json(
      { ok: false, reason: "bad_request", message: "categoryId is required." },
      { status: 400 },
    );
  }

  const payload: Record<string, unknown> = { categoryId };
  for (const f of FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, f)) payload[f] = body[f];
  }
  return NextResponse.json(await gasPost("saveCategory", payload));
}
