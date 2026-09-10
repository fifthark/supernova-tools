import { NextResponse } from "next/server";
import { verifySession } from "./session";
import { cookies } from "next/headers";
import { gasPost } from "./gasClient";

const actions: Record<string, Record<string, string[]>> = {
  state: { state: [] },
  generate: { generateFixtures: ["categoryId", "preview", "confirm", "force", "previewToken", "requireSafeSchedule", "acceptUnscheduled"] },
  reset: { resetFixtures: ["categoryId"] },
  score: { updateScore: ["matchId", "score1", "score2"] },
  recalc: { recalcLeaderboard: ["categoryId", "poolId"] },
  category: { upsertCategory: ["categoryId", "Category_Name", "Event_Code", "Fixture_Mode", "Club_A", "Club_B", "Start_Time", "End_Time", "Court_Whitelist", "Match_Duration_Minutes", "Buffer_Minutes", "Pool_Size", "Status"] },
  entries: { upsertEntry: ["Entry_ID", "Category_ID", "Entry_Name", "Entry_Display_Name", "Member_1", "Member_2", "Club_Name", "Status"] },
  settings: { saveSettings: ["Event_Name", "Event_Date", "Venue", "Share_Token", "Num_Courts", "Court_Names", "Day_Start_Time", "Day_End_Time", "Default_Match_Duration_Minutes", "Default_Buffer_Minutes", "Default_Pool_Size"] },
  tournaments: { listTournaments: [], createTournament: ["name", "requestId"], setTournamentArchived: ["archived"] },
};
export async function adminRoute(req: Request, route: string) {
  const session = await verifySession((await cookies()).get("tl_admin")?.value);
  if (!session) return NextResponse.json({ ok: false, reason: "unauthorized", message: "Admin login required." }, { status: 401 });
  const origin = req.headers.get("origin");
  if (origin) {
    try { if (new URL(origin).host !== (req.headers.get("host") || new URL(req.url).host)) throw Error(); }
    catch { return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403 }); }
  }
  let body: Record<string, unknown>;
  try {
    const text = await req.text();
    body = text ? JSON.parse(text) : {};
    if (!body || Array.isArray(body) || typeof body !== "object") throw Error();
  } catch { return NextResponse.json({ ok: false, reason: "bad_request", message: "Invalid request." }, { status: 400 }); }
  const allowed = actions[route];
  const action = route === "tournaments" ? String(body.action || "listTournaments") : Object.keys(allowed)[0];
  if (!Object.prototype.hasOwnProperty.call(allowed, action)) return NextResponse.json({ ok: false, reason: "bad_request" }, { status: 400 });
  const tournamentId = body.tournamentId === undefined ? "legacy" : body.tournamentId;
  if (typeof tournamentId !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(tournamentId)) return NextResponse.json({ ok: false, reason: "bad_request", message: "Select a valid tournament." }, { status: 400 });
  const payload: Record<string, unknown> = {};
  for (const key of allowed[action]) if (Object.prototype.hasOwnProperty.call(body, key)) payload[key] = body[key];
  const result = await gasPost(action, payload, tournamentId, session.id);
  return NextResponse.json(result, { status: result.reason === 'unauthorized' ? 401 : 200 });
}
