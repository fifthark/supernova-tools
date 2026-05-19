export type EventCode =
  | "MS"
  | "WS"
  | "MD"
  | "WD"
  | "XD"
  | "Squad"
  | "KO"
  | "Other";

export type BlockMode = "match-count" | "fixed-duration";

export interface Category {
  id: string;
  name: string;
  sourceCategoryId?: string;
  eventCode: string;
  matchCount: number;
  defaultMatchDurationMinutes: number;
  defaultBufferMinutes: number;
  notes?: string;
}

export interface Block {
  id: string;
  label: string;
  mode: BlockMode;
  selectedCategoryIds: string[];
  startTime: string;
  courts: number[];
  matchDurationMinutes: number;
  bufferMinutesBetweenMatches: number;
  afterBlockBufferMinutes: number;
  matchCount: number;
  fixedDurationMinutes: number;
  colourOverride?: string;
  notes?: string;
}

export type CourtIdMap = Record<number, string>;

export interface Plan {
  schemaVersion: number;
  tournamentName: string;
  tournamentDate: string;
  courtIdMap: CourtIdMap;
  categories: Category[];
  blocks: Block[];
}
