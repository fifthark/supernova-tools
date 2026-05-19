import type { Block, Plan } from "../types";
import {
  blockBodyEndMinutes,
  formatTime,
  startMinutes,
} from "./calculations";

const PADDING_MIN = 60;
const SLOT_MIN = 30;

function roundDownToHour(min: number): number {
  return Math.floor(min / 60) * 60;
}

function roundUpToHour(min: number): number {
  return Math.ceil(min / 60) * 60;
}

function blockActiveAt(block: Block, slotMin: number): boolean {
  const s = startMinutes(block);
  const e = blockBodyEndMinutes(block);
  return s <= slotMin && slotMin < e;
}

export function exportTimetableMarkdown(plan: Plan): string {
  const lines: string[] = [];
  lines.push(`# ${plan.tournamentName} — ${plan.tournamentDate}`);
  lines.push("");

  const activeBlocks = plan.blocks.filter(b => b.courts.length > 0);

  if (activeBlocks.length === 0) {
    lines.push("_no blocks_");
    return lines.join("\n") + "\n";
  }

  let earliest = Infinity;
  let latest = -Infinity;
  for (const b of activeBlocks) {
    const s = startMinutes(b);
    const e = blockBodyEndMinutes(b);
    if (s < earliest) earliest = s;
    if (e > latest) latest = e;
  }

  const rangeStart = roundDownToHour(Math.max(0, earliest - PADDING_MIN));
  const rangeEnd = roundUpToHour(latest + PADDING_MIN);

  const slots: number[] = [];
  for (let m = rangeStart; m < rangeEnd; m += SLOT_MIN) slots.push(m);

  const headerCells = ["", ...slots.map(formatTime)];
  lines.push("| " + headerCells.join(" | ") + " |");
  lines.push("|" + headerCells.map(() => "------").join("|") + "|");

  for (let court = 1; court <= plan.numCourts; court++) {
    const blocksOnCourt = activeBlocks.filter(b => b.courts.includes(court));
    const cells: string[] = [`Court ${court}`];
    for (const slot of slots) {
      const active = blocksOnCourt.find(b => blockActiveAt(b, slot));
      cells.push(active?.label ?? "");
    }
    lines.push("| " + cells.join(" | ") + " |");
  }

  return lines.join("\n") + "\n";
}
