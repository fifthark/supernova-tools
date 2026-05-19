import type { Block, Category, Plan } from "./types";

export const SCHEMA_VERSION = 2;

export const DEFAULT_NUM_COURTS = 7;
export const MIN_NUM_COURTS = 1;
export const MAX_NUM_COURTS = 15;

interface CategorySeed {
  name: string;
  eventCode: string;
  matchCount: number;
  defaultMatchDurationMinutes: number;
  defaultBufferMinutes: number;
  defaultStartTime?: string;
}

interface BlockSeed {
  label: string;
  categoryNames: string[];
  courts: number[];
  startTime: string;
  matchCount: number;
  matchDurationMinutes: number;
  bufferMinutesBetweenMatches: number;
  afterBlockBufferMinutes: number;
}

const T004_CATEGORY_SEEDS: CategorySeed[] = [
  { name: "MS Grade2", eventCode: "MS", matchCount: 10, defaultMatchDurationMinutes: 20, defaultBufferMinutes: 5, defaultStartTime: "08:30" },
  { name: "MS Grade3", eventCode: "MS", matchCount: 6, defaultMatchDurationMinutes: 20, defaultBufferMinutes: 5, defaultStartTime: "08:30" },
  { name: "MD Grade2", eventCode: "MD", matchCount: 24, defaultMatchDurationMinutes: 20, defaultBufferMinutes: 0, defaultStartTime: "10:15" },
  { name: "WD Grade2", eventCode: "WD", matchCount: 10, defaultMatchDurationMinutes: 20, defaultBufferMinutes: 0, defaultStartTime: "09:00" },
  { name: "WD Grade3", eventCode: "WD", matchCount: 10, defaultMatchDurationMinutes: 20, defaultBufferMinutes: 0, defaultStartTime: "09:00" },
  { name: "XD Grade2", eventCode: "XD", matchCount: 12, defaultMatchDurationMinutes: 20, defaultBufferMinutes: 0, defaultStartTime: "13:00" },
  { name: "XD Grade3", eventCode: "XD", matchCount: 10, defaultMatchDurationMinutes: 20, defaultBufferMinutes: 0, defaultStartTime: "13:00" },
  { name: "XD Grade4", eventCode: "XD", matchCount: 10, defaultMatchDurationMinutes: 20, defaultBufferMinutes: 0, defaultStartTime: "13:00" },
];

const T004_BLOCK_SEEDS: BlockSeed[] = [
  {
    label: "MS RR",
    categoryNames: ["MS Grade2", "MS Grade3"],
    courts: [1, 2, 3, 4],
    startTime: "08:30",
    matchCount: 16,
    matchDurationMinutes: 20,
    bufferMinutesBetweenMatches: 5,
    afterBlockBufferMinutes: 0,
  },
  {
    label: "MD RR",
    categoryNames: ["MD Grade2"],
    courts: [1, 2, 3, 4],
    startTime: "10:15",
    matchCount: 24,
    matchDurationMinutes: 20,
    bufferMinutesBetweenMatches: 0,
    afterBlockBufferMinutes: 30,
  },
  {
    label: "WD RR",
    categoryNames: ["WD Grade2", "WD Grade3"],
    courts: [5, 6, 7],
    startTime: "09:00",
    matchCount: 20,
    matchDurationMinutes: 20,
    bufferMinutesBetweenMatches: 0,
    afterBlockBufferMinutes: 30,
  },
  {
    label: "XD G2",
    categoryNames: ["XD Grade2"],
    courts: [1, 2],
    startTime: "13:00",
    matchCount: 12,
    matchDurationMinutes: 20,
    bufferMinutesBetweenMatches: 0,
    afterBlockBufferMinutes: 30,
  },
  {
    label: "XD G3",
    categoryNames: ["XD Grade3"],
    courts: [3, 4],
    startTime: "13:00",
    matchCount: 10,
    matchDurationMinutes: 20,
    bufferMinutesBetweenMatches: 0,
    afterBlockBufferMinutes: 30,
  },
  {
    label: "XD G4",
    categoryNames: ["XD Grade4"],
    courts: [5, 6],
    startTime: "13:00",
    matchCount: 10,
    matchDurationMinutes: 20,
    bufferMinutesBetweenMatches: 0,
    afterBlockBufferMinutes: 30,
  },
];

export function buildT004Plan(): Plan {
  const categories: Category[] = T004_CATEGORY_SEEDS.map(seed => ({
    id: crypto.randomUUID(),
    name: seed.name,
    eventCode: seed.eventCode,
    matchCount: seed.matchCount,
    defaultMatchDurationMinutes: seed.defaultMatchDurationMinutes,
    defaultBufferMinutes: seed.defaultBufferMinutes,
    defaultStartTime: seed.defaultStartTime,
  }));

  const idByName: Record<string, string> = {};
  for (const cat of categories) idByName[cat.name] = cat.id;

  const blocks: Block[] = T004_BLOCK_SEEDS.map(seed => ({
    id: crypto.randomUUID(),
    label: seed.label,
    mode: "match-count",
    selectedCategoryIds: seed.categoryNames.map(n => idByName[n]).filter(Boolean),
    startTime: seed.startTime,
    courts: [...seed.courts],
    matchDurationMinutes: seed.matchDurationMinutes,
    bufferMinutesBetweenMatches: seed.bufferMinutesBetweenMatches,
    afterBlockBufferMinutes: seed.afterBlockBufferMinutes,
    matchCount: seed.matchCount,
    fixedDurationMinutes: 60,
  }));

  return {
    schemaVersion: SCHEMA_VERSION,
    tournamentName: "T004",
    tournamentDate: "2026-05-23",
    numCourts: DEFAULT_NUM_COURTS,
    categories,
    blocks,
  };
}
