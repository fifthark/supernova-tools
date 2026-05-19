import type { Plan } from "../types";
import {
  blockBodyEndMinutes,
  formatTime,
  perCourtDistribution,
  startMinutes,
} from "./calculations";

interface CourtRow {
  court: number;
  startMin: number;
  endMin: number;
  blockLabel: string;
  detail: string;
}

export function exportTimetableMarkdown(plan: Plan): string {
  const rows: CourtRow[] = [];

  for (const block of plan.blocks) {
    if (block.courts.length === 0) continue;
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
  lines.push("| Court | Time | Block | Notes |");
  lines.push("|-------|------|-------|-------|");

  if (rows.length === 0) {
    lines.push("| _no blocks_ |  |  |  |");
  } else {
    for (const r of rows) {
      lines.push(
        `| Court ${r.court} | ${formatTime(r.startMin)} – ${formatTime(r.endMin)} | ${r.blockLabel} | ${r.detail} |`,
      );
    }
  }

  return lines.join("\n") + "\n";
}
