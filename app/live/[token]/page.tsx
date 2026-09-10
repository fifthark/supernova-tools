import type { Metadata } from "next";
import PlayerBoard from "@/app/tournament-lite/components/PlayerBoard";

// Friendly alias for the public player board (also served at
// /tournament-lite/board/[token]). Future: https://live.shuttleflow.com.au/<slug>
// Read-only, token-gated; no admin nav/tools (AppNav is hidden on /live/*).

export const metadata: Metadata = {
  title: "Live Tournament Board — SuperNova",
  description: "Live matches and standings",
};

export default async function LiveBoardPage({ params }: { params: Promise<{ token: string }> }) {
  return <PlayerBoard token={(await params).token} />;
}
