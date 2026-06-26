import type { Metadata } from "next";
import EventWorkspace from "@/app/tournament-lite/components/EventWorkspace";

// Short friendly alias for the admin console — same protected EventWorkspace as
// /tournaments/admin and /tournament-lite. Intended production link:
//   https://tournaments.shuttleflow.com.au/admin
//
// Access is gated by the Next.js middleware (middleware.ts): unauthenticated
// requests to /admin (and /tournaments/admin, /tournament-lite, and the admin
// API) are redirected to /tournaments/login (or 401 for API). The public player
// board (/live/[token], /tournament-lite/board/[token], /api/tournament-lite/public)
// stays public/read-only, gated only by Share_Token.

export const metadata: Metadata = {
  title: "Tournament Admin — SuperNova Tools",
  description: "Tournament Lite admin console",
};

export default function AdminPage() {
  return <EventWorkspace />;
}
