import type { Metadata } from "next";
import EventWorkspace from "./components/EventWorkspace";

export const metadata: Metadata = {
  title: "Tournament Lite — SuperNova Tools",
  description: "Lightweight ad-hoc round-robin event workspace",
};

export default function TournamentLitePage() {
  return <EventWorkspace />;
}
