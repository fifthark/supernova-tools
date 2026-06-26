import type { Metadata } from "next";
import EventWorkspace from "@/app/tournament-lite/components/EventWorkspace";

// Friendly alias for the admin console (also served at /tournament-lite).
// Future friendly domain: https://tournaments.shuttleflow.com.au/admin
//
// SECURITY TODO — before exposing this admin console on a public ShuttleFlow
// domain, gate the admin surface behind an access guard (auth / SSO / IP
// allowlist). These must NOT be publicly reachable without admin auth:
//   - pages: /tournament-lite, /tournaments/admin
//   - admin API: /api/tournament-lite/{state,generate,score,recalc,reset,category}
// The public player board (/live/[token], /tournament-lite/board/[token]) and
// /api/tournament-lite/public stay public/read-only, gated only by Share_Token.

export const metadata: Metadata = {
  title: "Tournament Admin — SuperNova Tools",
  description: "Tournament Lite admin console",
};

export default function TournamentsAdminPage() {
  return <EventWorkspace />;
}
