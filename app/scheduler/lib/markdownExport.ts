import type { Plan } from "../types";
import {
  blockBodyEndMinutes,
  formatTime,
  perCourtDistribution,
  startMinutes,
} from "./calculations";

interface CourtRow {
  court: number;
  courtId: string;
  startMin: number;
  endMin: number;
  blockLabel: string;
  detail: string;
}

export function exportTimetableMarkdown(plan: Plan): string {
  const rows: CourtRow[] = [];

  for (const block of plan.blocks) {
    const start = startMinutes(block);
    const end = blockBodyEndMinutes(block);
    const distribution = perCourtDistribution(block);
    block.courts.forEach((court, idx) => {
      const matches = block.mode === "match-count" ? distribution[idx] ?? 0 : null;
      const detail =
        block.mode === "match-count"
          ? `${matches} match${matches === 1 ? "" : "es"}`
          : "fixed";
      rows.push({
        court,
        courtId: plan.courtIdMap[court] ?? `Court ${court}`,
        startMin: start,
        endMin: end,
        blockLabel: block.label,
        detail,
      });
    });
  }

  rows.sort((a, b) => {
    if (a.court !== b.court) return a.court - b.court;
    return a.startMin - b.startMin;
  });

  const lines: string[] = [];
  lines.push(`# ${plan.tournamentName} — ${plan.tournamentDate}`);
  lines.push("");
  lines.push("| Court | Court ID | Time | Block | Notes |");
  lines.push("|-------|----------|------|-------|-------|");

  if (rows.length === 0) {
    lines.push("| _no blocks_ |  |  |  |  |");
  } else {
    for (const r of rows) {
      lines.push(
        `| Court ${r.court} | ${r.courtId} | ${formatTime(r.startMin)} – ${formatTime(r.endMin)} | ${r.blockLabel} | ${r.detail} |`,
      );
    }
  }

  return lines.join("\n") + "\n";
}
