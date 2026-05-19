import type { Block } from "../types";

export function parseTime(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) return 0;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return h * 60 + min;
}

export function formatTime(totalMinutes: number): string {
  const m = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
}

export function slotMinutes(block: Block): number {
  return block.matchDurationMinutes + block.bufferMinutesBetweenMatches;
}

export function slotsNeeded(block: Block): number {
  const courts = block.courts.length;
  if (courts === 0 || block.matchCount <= 0) return 0;
  return Math.ceil(block.matchCount / courts);
}

export function rrEndMinutes(block: Block): number {
  return parseTime(block.startTime) + slotsNeeded(block) * slotMinutes(block);
}

export function startMinutes(block: Block): number {
  return parseTime(block.startTime);
}

export function blockEndMinutes(block: Block): number {
  if (block.mode === "fixed-duration") {
    return parseTime(block.startTime) + Math.max(0, block.fixedDurationMinutes);
  }
  return rrEndMinutes(block) + Math.max(0, block.afterBlockBufferMinutes);
}

export function blockBodyEndMinutes(block: Block): number {
  if (block.mode === "fixed-duration") {
    return parseTime(block.startTime) + Math.max(0, block.fixedDurationMinutes);
  }
  return rrEndMinutes(block);
}

export function perCourtDistribution(block: Block): number[] {
  const courts = block.courts.length;
  if (courts === 0) return [];
  const base = Math.floor(block.matchCount / courts);
  const remainder = block.matchCount % courts;
  return block.courts.map((_, i) => base + (i < remainder ? 1 : 0));
}

export function isUnevenDistribution(block: Block): boolean {
  if (block.mode !== "match-count") return false;
  if (block.courts.length === 0) return false;
  return block.matchCount % block.courts.length !== 0;
}

export function totalMatches(blocks: Block[]): number {
  return blocks
    .filter(b => b.mode === "match-count")
    .reduce((sum, b) => sum + Math.max(0, b.matchCount), 0);
}

export function earliestStartMinutes(blocks: Block[]): number | null {
  if (blocks.length === 0) return null;
  return Math.min(...blocks.map(startMinutes));
}

export function latestEndMinutes(blocks: Block[]): number | null {
  if (blocks.length === 0) return null;
  return Math.max(...blocks.map(blockEndMinutes));
}
