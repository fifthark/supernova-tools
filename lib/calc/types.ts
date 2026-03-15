export type ScheduleConfidence = "Aggressive" | "Realistic" | "Conservative";

export interface TournamentInput {
  // Structure
  numCategories: number;
  teamsPerPool: number;
  poolsPerCategory: number;
  totalPools?: number; // direct override; if absent, computed as numCategories × poolsPerCategory
  playersPerTeam: number;
  tiesPerTeam: number;
  matchesPerTie: number;
  minutesPerMatch: number;
  includeFinals: boolean;
  scoringFormat?: string;

  // Venue & Courts
  courtsAvailable: number;
  courtsPerPool: number;
  courtCostPerHour: number;

  // Costs
  shuttleCostPerUnit: number;
  shuttlesPerMatch: number;
  warmupShuttlesPerTie: number;
  prizePerCategory: number;
  prizeMinTeamsThreshold: number;
  volunteerCount: number;
  volunteerMealCost: number;
  adsBudget: number;
  adminMisc: number;

  // Pricing & Revenue
  pricePerPlayer: number;
  earlyBirdEnabled: boolean;
  earlyBirdPrice: number;
  earlyBirdPct: number;
  latePricingEnabled: boolean;
  latePrice: number;
  latePct: number;
  fillRatePct: number;
  platformFeePct: number;
  refundLeakagePct: number;

  // Additional Revenue (optional, defaults to 0)
  sponsorshipRevenue?: number;
  grantRevenue?: number;

  // Schedule Realism
  scheduleConfidence: ScheduleConfidence;
  overheadPerMatchMin: number;
  overheadPerTieMin: number;

  // Variance
  categoryVariancePct: number;
}

export interface CostBreakdown {
  courts: number;
  shuttles: number;
  prizes: number;
  volunteers: number;
  ads: number;
  admin: number;
  total: number;
}

export interface TournamentResult {
  // Scale
  totalPools: number;
  totalTeams: number;
  effectiveTeams: number;
  totalPlayers: number;

  // Revenue
  blendedPricePerPlayer: number;
  grossRevenue: number;
  platformFees: number;
  refundLeakage: number;
  netRevenue: number;
  additionalRevenue: number;

  // Cost breakdown
  costs: CostBreakdown;

  // Per-pool detail
  courtCostPerPool: number;
  shuttleCostPerPool: number;
  finalCostPerCategory: number;

  // Profitability
  profit: number;
  marginPct: number;
  profitPerTeam: number;
  profitPerPlayer: number;
  profitRange: { low: number; high: number };
  breakEvenPools: number | null;

  // Player value
  gamesPerPlayerPerTie: number; // games each player plays in one tie
  gamesPerPlayerPool: number; // total games per player in pool stage
  gamesPerPlayerWithFinal: number;
  costPerGame: number;

  // Schedule
  tiesPerPool: number;
  matchesPerPool: number;
  timePerTieMinutes: number;
  rawPoolMinutes: number;
  poolPlayingHours: number; // actual playing time for 1 pool (decimal hours)
  bookHours: number; // venue billing hours per pool (ceiling)
  courtsUsed: number; // total court-slots used (pools × courtsPerPool)
  totalCourtHours: number; // total court-hours billed
  poolsSimultaneous: number;
  waves: number;
  bufferMinutesPerWave: number; // transition buffer between waves
  estimatedPoolStageHours: number; // wall-clock time for all pools
  finalsHours: number;
  totalEventDuration: number;
  scheduleWarning: string | null;
}

export interface ScannerSuggestion {
  label: string;
  profitDelta: number;
  marginDelta: number;
  durationDelta: number;
  newProfit: number;
  newMargin: number;
}

export interface SavedScenario {
  id: string;
  label: string;
  timestamp: number;
  inputs: TournamentInput;
  result: TournamentResult;
}
