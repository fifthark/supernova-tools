import { adminRoute } from "@/app/tournament-lite/lib/adminRoute";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(req: Request) { return adminRoute(req, "score"); }
