import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { gasPost } from "@/app/tournament-lite/lib/gasClient";
import { verifySession } from "@/app/tournament-lite/lib/session";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(req: Request) {
  const session = await verifySession((await cookies()).get('tl_admin')?.value);
  if (session) {
    const result = await gasPost('adminLogout', { sessionId: session.id });
    if (!result.ok) return NextResponse.json({ ok: false, message: 'Could not revoke the session. Please retry sign out.' }, {status:503});
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('tl_admin', '', { httpOnly:true, secure:Boolean(process.env.VERCEL) || new URL(req.url).protocol === 'https:', sameSite:'lax',path:'/',maxAge:0 });
  return res;
}
