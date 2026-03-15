import type { TournamentInput } from "./types";

export const DOUBLES_PRESET: Partial<TournamentInput> = {
  playersPerTeam: 2,
  matchesPerTie: 1,
  scoringFormat: "2×21",
  minutesPerMatch: 20,
  courtsPerPool: 1,
  tiesPerTeam: 3,
};

export const SQUAD_PRESET: Partial<TournamentInput> = {
  playersPerTeam: 4,
  matchesPerTie: 4,
  scoringFormat: "1×21",
  minutesPerMatch: 10,
  courtsPerPool: 2,
  tiesPerTeam: 3,
};

export const DEFAULT_INPUT: TournamentInput = {
  numCategories: 7,
  teamsPerPool: 6,
  poolsPerCategory: 1,
  totalPools: 7,
  playersPerTeam: 4,
  tiesPerTeam: 3,
  matchesPerTie: 4,
  scoringFormat: "1×21",
  minutesPerMatch: 10,
  includeFinals: true,

  courtsAvailable: 12,
  courtsPerPool: 2,
  courtCostPerHour: 20,

  shuttleCostPerUnit: 5,
  shuttlesPerMatch: 1.2,
  warmupShuttlesPerTie: 0,
  prizePerCategory: 100,
  prizeMinTeamsThreshold: 4,
  volunteerCount: 0,
  volunteerMealCost: 12,
  adsBudget: 500,
  adminMisc: 200,

  pricePerPlayer: 45,
  earlyBirdEnabled: false,
  earlyBirdPrice: 40,
  earlyBirdPct: 30,
  latePricingEnabled: false,
  latePrice: 55,
  latePct: 10,
  fillRatePct: 100,
  platformFeePct: 2.9,
  refundLeakagePct: 2,
  sponsorshipRevenue: 0,
  grantRevenue: 0,

  scheduleConfidence: "Realistic",
  overheadPerMatchMin: 2,
  overheadPerTieMin: 3,

  categoryVariancePct: 10,
};

export const INPUT_BOUNDS: Record<string, { min: number; max: number }> = {
  numCategories: { min: 1, max: 20 },
  teamsPerPool: { min: 3, max: 8 },
  poolsPerCategory: { min: 1, max: 5 },
  totalPools: { min: 1, max: 50 },
  playersPerTeam: { min: 2, max: 6 },
  tiesPerTeam: { min: 1, max: 7 },
  matchesPerTie: { min: 1, max: 5 },
  minutesPerMatch: { min: 5, max: 30 },

  courtsAvailable: { min: 1, max: 30 },
  courtsPerPool: { min: 1, max: 4 },
  courtCostPerHour: { min: 0, max: 100 },

  shuttleCostPerUnit: { min: 1, max: 15 },
  shuttlesPerMatch: { min: 0.5, max: 3.0 },
  warmupShuttlesPerTie: { min: 0, max: 2.0 },
  prizePerCategory: { min: 0, max: 500 },
  prizeMinTeamsThreshold: { min: 2, max: 8 },
  volunteerCount: { min: 0, max: 30 },
  volunteerMealCost: { min: 0, max: 30 },
  adsBudget: { min: 0, max: 2000 },
  adminMisc: { min: 0, max: 1000 },

  pricePerPlayer: { min: 10, max: 100 },
  earlyBirdPrice: { min: 10, max: 100 },
  earlyBirdPct: { min: 0, max: 80 },
  latePrice: { min: 10, max: 100 },
  latePct: { min: 0, max: 50 },
  fillRatePct: { min: 50, max: 100 },
  platformFeePct: { min: 0, max: 10 },
  refundLeakagePct: { min: 0, max: 10 },

  sponsorshipRevenue: { min: 0, max: 10000 },
  grantRevenue: { min: 0, max: 10000 },
  overheadPerMatchMin: { min: 0, max: 5 },
  overheadPerTieMin: { min: 0, max: 10 },
  categoryVariancePct: { min: 0, max: 30 },
};

export const SCORING_FORMATS = ["1×21", "1×30", "2×21"] as const;

// Scoring format → suggested minutes per match
export const SCORING_FORMAT_MINUTES: Record<string, number> = {
  "1×21": 10,
  "1×30": 15,
  "2×21": 20,
};
