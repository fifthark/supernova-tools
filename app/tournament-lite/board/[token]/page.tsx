import type { Metadata } from "next";
import PlayerBoard from "@/app/tournament-lite/components/PlayerBoard";

export const metadata: Metadata = {
  title: "Tournament Board — SuperNova",
  description: "Live matches and standings",
};

export default function BoardPage({ params }: { params: { token: string } }) {
  return <PlayerBoard token={params.token} />;
}
