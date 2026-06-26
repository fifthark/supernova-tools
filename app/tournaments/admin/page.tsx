import type { Metadata } from "next";
import EventWorkspace from "@/app/tournament-lite/components/EventWorkspace";

// Friendly alias for the admin console (also served at /tournament-lite).
// Future friendly domain: https://tournaments.shuttleflow.com.au/admin
//
// Access is gated by the Next.js middleware (middleware.ts): unauthenticated
// requests to the admin pages (/tournament-lite, /tournaments/admin) and admin API
// (/api/tournament-lite/{state,generate,score,recalc,reset,category}) are
// redirected to /tournaments/login (or 401 for API). The public player board
// (/live/[token], /tournament-lite/board/[token], /api/tournament-lite/public)
// stays public/read-only, gated only by Share_Token.

export const metadata: Metadata = {
  title: "Tournament Admin — SuperNova Tools",
  description: "Tournament Lite admin console",
};

export default function TournamentsAdminPage() {
  return <EventWorkspace />;
}
