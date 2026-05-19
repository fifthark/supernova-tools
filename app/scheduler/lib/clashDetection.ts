import type { Block } from "../types";
import { blockEndMinutes, startMinutes } from "./calculations";

export interface Clash {
  blockAId: string;
  blockBId: string;
  courts: number[];
}

function intervalsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function detectClashes(blocks: Block[]): Clash[] {
  const clashes: Clash[] = [];
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      if (a.courts.length === 0 || b.courts.length === 0) continue;
      const aStart = startMinutes(a);
      const aEnd = blockEndMinutes(a);
      const bStart = startMinutes(b);
      const bEnd = blockEndMinutes(b);
      if (!intervalsOverlap(aStart, aEnd, bStart, bEnd)) continue;
      const sharedCourts = a.courts.filter(c => b.courts.includes(c));
      if (sharedCourts.length === 0) continue;
      clashes.push({ blockAId: a.id, blockBId: b.id, courts: sharedCourts });
    }
  }
  return clashes;
}

export function buildBlockCourtClashSet(clashes: Clash[]): Set<string> {
  const set = new Set<string>();
  for (const c of clashes) {
    for (const court of c.courts) {
      set.add(`${c.blockAId}:${court}`);
      set.add(`${c.blockBId}:${court}`);
    }
  }
  return set;
}

export function blockHasClash(blockId: string, clashes: Clash[]): boolean {
  return clashes.some(c => c.blockAId === blockId || c.blockBId === blockId);
}
