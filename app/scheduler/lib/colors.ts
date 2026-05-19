import type { Block, Category, EventCode } from "../types";

export const KNOWN_EVENT_CODES: EventCode[] = [
  "MS",
  "WS",
  "MD",
  "WD",
  "XD",
  "Squad",
  "KO",
  "Other",
];

const CODE_LOOKUP: Record<string, EventCode> = {
  ms: "MS",
  ws: "WS",
  md: "MD",
  wd: "WD",
  xd: "XD",
  squad: "Squad",
  ko: "KO",
  other: "Other",
};

export function normalizeEventCode(raw: string | undefined): EventCode {
  if (!raw) return "Other";
  return CODE_LOOKUP[raw.trim().toLowerCase()] ?? "Other";
}

export function blockEventCode(block: Block, categories: Category[]): EventCode {
  const first = block.selectedCategoryIds
    .map(id => categories.find(c => c.id === id))
    .find(c => !!c);
  if (!first) return "Other";
  return normalizeEventCode(first.eventCode);
}

export function eventCodeClass(code: EventCode): string {
  return `scheduler-event-${code.toLowerCase()}`;
}
