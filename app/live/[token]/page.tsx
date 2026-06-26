import type { Metadata } from "next";
import PlayerBoard from "@/app/tournament-lite/components/PlayerBoard";

// Friendly alias for the public player board (also served at
// /tournament-lite/board/[token]). Future: https://live.shuttleflow.com.au/<slug>
// Read-only, token-gated; no admin nav/tools (AppNav is hidden on /live/*).

export const metadata: Metadata = {
  title: "Live Tournament Board — SuperNova",
  description: "Live matches and standings",
};

export default function LiveBoardPage({ params }: { params: { token: string } }) {
  return <PlayerBoard token={params.token} />;
}
