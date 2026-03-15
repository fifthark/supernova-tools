import { describe, it, expect } from "vitest";
import { computeTournament } from "../engine";
import type { TournamentInput } from "../types";

// Base input for Squad Battle scenarios (S1)
const S1_INPUT: TournamentInput = {
  numCategories: 7,
  teamsPerPool: 6,
  poolsPerCategory: 1,
  playersPerTeam: 4,
  tiesPerTeam: 3,
  matchesPerTie: 4,
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
  volunteerMealCost: 0,
  adsBudget: 500,
  adminMisc: 200,
  pricePerPlayer: 45,
  earlyBirdEnabled: false,
  earlyBirdPrice: 40,
  earlyBirdPct: 0,
  latePricingEnabled: false,
  latePrice: 55,
  latePct: 0,
  fillRatePct: 100,
  platformFeePct: 0,
  refundLeakagePct: 0,
  scheduleConfidence: "Aggressive",
  overheadPerMatchMin: 0,
  overheadPerTieMin: 0,
  categoryVariancePct: 0,
};

describe("Engine — 13 Golden Scenarios", () => {
  // ================================================================
  // Scenario 1: Squad Battle — 3 ties/team baseline (no overheads, no fees)
  // ================================================================
  it("S1: Squad Battle baseline", () => {
    const result = computeTournament(S1_INPUT);

    expect(result.totalPools).toBe(7);
    expect(result.totalTeams).toBe(42);
    expect(result.totalPlayers).toBe(168);
    expect(result.grossRevenue).toBeCloseTo(7560, 1);
    expect(result.netRevenue).toBeCloseTo(7560, 1);
    expect(result.costs.courts).toBeCloseTo(1120, 1);
    expect(result.costs.shuttles).toBeCloseTo(1680, 1);
    expect(result.costs.prizes).toBeCloseTo(700, 1);
    expect(result.costs.total).toBeCloseTo(4200, 1);
    expect(result.profit).toBeCloseTo(3360, 1);
    expect(result.marginPct).toBeCloseTo(44.44, 0);
    expect(result.profitPerTeam).toBeCloseTo(80, 1);
    expect(result.tiesPerPool).toBe(9);
    expect(result.matchesPerPool).toBe(36);
    expect(result.bookHours).toBe(3);
    expect(result.gamesPerPlayerPool).toBe(6); // 3 ties × 2 games/tie (1 MD/WD + 1 XD)
    expect(result.costPerGame).toBeCloseTo(7.5, 1); // $45 / 6 games
    expect(result.breakEvenPools).toBe(2);
  });

  // ================================================================
  // Scenario 2: Squad Battle — 5 ties/team (full round-robin)
  // ================================================================
  it("S2: Full round-robin (5 ties)", () => {
    const input = { ...S1_INPUT, tiesPerTeam: 5 };
    const result = computeTournament(input);

    expect(result.totalPools).toBe(7);
    expect(result.totalTeams).toBe(42);
    expect(result.totalPlayers).toBe(168);
    expect(result.grossRevenue).toBeCloseTo(7560, 1);
    expect(result.tiesPerPool).toBe(15);
    expect(result.matchesPerPool).toBe(60);
    expect(result.bookHours).toBe(5);
    expect(result.costs.courts).toBeCloseTo(1680, 1);
    expect(result.costs.shuttles).toBeCloseTo(2688, 1);
    expect(result.costs.prizes).toBeCloseTo(700, 1);
    expect(result.costs.total).toBeCloseTo(5768, 1);
    expect(result.profit).toBeCloseTo(1792, 1);
    expect(result.marginPct).toBeCloseTo(23.7, 0);
    expect(result.profitPerTeam).toBeCloseTo(42.67, 1);
    expect(result.gamesPerPlayerPool).toBe(10); // 5 ties × 2 games/tie (1 MD/WD + 1 XD)
    expect(result.costPerGame).toBeCloseTo(4.5, 1); // $45 / 10 games
  });

  // ================================================================
  // Scenario 3: 1 pool (loss scenario)
  // ================================================================
  it("S3: 1 category (loss)", () => {
    const input = { ...S1_INPUT, numCategories: 1 };
    const result = computeTournament(input);

    expect(result.totalTeams).toBe(6);
    expect(result.totalPlayers).toBe(24);
    expect(result.grossRevenue).toBeCloseTo(1080, 1);
    expect(result.costs.courts).toBeCloseTo(160, 1);
    expect(result.costs.shuttles).toBeCloseTo(240, 1);
    expect(result.costs.prizes).toBeCloseTo(100, 1);
    expect(result.costs.total).toBeCloseTo(1200, 1);
    expect(result.profit).toBeCloseTo(-120, 1);
    expect(result.marginPct).toBeCloseTo(-11.11, 0);
  });

  // ================================================================
  // Scenario 4: 10 pools (scale scenario)
  // ================================================================
  it("S4: 10 categories (scale)", () => {
    const input = { ...S1_INPUT, numCategories: 10 };
    const result = computeTournament(input);

    expect(result.totalTeams).toBe(60);
    expect(result.totalPlayers).toBe(240);
    expect(result.grossRevenue).toBeCloseTo(10800, 1);
    expect(result.costs.courts).toBeCloseTo(1600, 1);
    expect(result.costs.shuttles).toBeCloseTo(2400, 1);
    expect(result.costs.prizes).toBeCloseTo(1000, 1);
    expect(result.costs.total).toBeCloseTo(5700, 1);
    expect(result.profit).toBeCloseTo(5100, 1);
    expect(result.marginPct).toBeCloseTo(47.22, 0);
    expect(result.breakEvenPools).toBe(2);
  });

  // ================================================================
  // Scenario 5: Price $30/player
  // ================================================================
  it("S5: Low price ($30)", () => {
    const input = { ...S1_INPUT, pricePerPlayer: 30 };
    const result = computeTournament(input);

    expect(result.grossRevenue).toBeCloseTo(5040, 1);
    expect(result.costs.total).toBeCloseTo(4200, 1);
    expect(result.profit).toBeCloseTo(840, 1);
    expect(result.marginPct).toBeCloseTo(16.67, 0);
    expect(result.breakEvenPools).toBe(4);
  });

  // ================================================================
  // Scenario 6: Price $60/player
  // ================================================================
  it("S6: High price ($60)", () => {
    const input = { ...S1_INPUT, pricePerPlayer: 60 };
    const result = computeTournament(input);

    expect(result.grossRevenue).toBeCloseTo(10080, 1);
    expect(result.costs.total).toBeCloseTo(4200, 1);
    expect(result.profit).toBeCloseTo(5880, 1);
    expect(result.marginPct).toBeCloseTo(58.33, 0);
    expect(result.breakEvenPools).toBe(1);
  });

  // ================================================================
  // Scenario 7: With platform fees + refund leakage
  // ================================================================
  it("S7: Platform fees + refund leakage", () => {
    const input = { ...S1_INPUT, platformFeePct: 2.9, refundLeakagePct: 2 };
    const result = computeTournament(input);

    expect(result.grossRevenue).toBeCloseTo(7560, 1);
    expect(result.platformFees).toBeCloseTo(219.24, 1);
    expect(result.refundLeakage).toBeCloseTo(151.2, 1);
    expect(result.netRevenue).toBeCloseTo(7189.56, 1);
    expect(result.costs.total).toBeCloseTo(4200, 1);
    expect(result.profit).toBeCloseTo(2989.56, 1);
    expect(result.marginPct).toBeCloseTo(39.54, 0);
  });

  // ================================================================
  // Scenario 8: With volunteers
  // ================================================================
  it("S8: Volunteers", () => {
    const input = { ...S1_INPUT, volunteerCount: 8, volunteerMealCost: 12 };
    const result = computeTournament(input);

    expect(result.costs.volunteers).toBeCloseTo(96, 1);
    expect(result.costs.total).toBeCloseTo(4296, 1);
    expect(result.profit).toBeCloseTo(3264, 1);
    expect(result.marginPct).toBeCloseTo(43.17, 0);
  });

  // ================================================================
  // Scenario 9: Fill rate 80%
  // ================================================================
  it("S9: Fill rate 80%", () => {
    const input = { ...S1_INPUT, fillRatePct: 80 };
    const result = computeTournament(input);

    expect(result.effectiveTeams).toBe(34);
    expect(result.totalPlayers).toBe(136);
    expect(result.grossRevenue).toBeCloseTo(6120, 1);
    expect(result.costs.total).toBeCloseTo(4200, 1);
    expect(result.profit).toBeCloseTo(1920, 1);
    expect(result.marginPct).toBeCloseTo(31.37, 0);
  });

  // ================================================================
  // Scenario 10: No finals
  // ================================================================
  it("S10: No finals", () => {
    const input = { ...S1_INPUT, includeFinals: false };
    const result = computeTournament(input);

    expect(result.costs.courts).toBeCloseTo(840, 1);
    expect(result.costs.shuttles).toBeCloseTo(1512, 1);
    expect(result.costs.total).toBeCloseTo(3752, 1);
    expect(result.profit).toBeCloseTo(3808, 1);
    expect(result.marginPct).toBeCloseTo(50.37, 0);
  });

  // ================================================================
  // Scenario 11: Full round-robin with overhead buffers
  // ================================================================
  it("S11: Full RR with overheads", () => {
    const input = {
      ...S1_INPUT,
      tiesPerTeam: 5,
      overheadPerMatchMin: 2,
      overheadPerTieMin: 3,
    };
    const result = computeTournament(input);

    expect(result.timePerTieMinutes).toBe(51);
    expect(result.rawPoolMinutes).toBeCloseTo(382.5, 1);
    expect(result.bookHours).toBe(7);
    expect(result.courtCostPerPool).toBeCloseTo(280, 1);
    expect(result.costs.courts).toBeCloseTo(2240, 1);
    expect(result.costs.shuttles).toBeCloseTo(2688, 1);
    expect(result.costs.total).toBeCloseTo(6328, 1);
    expect(result.profit).toBeCloseTo(1232, 1);
    expect(result.marginPct).toBeCloseTo(16.3, 0);
  });

  // ================================================================
  // Scenario 12: Realistic config (all new features enabled)
  // ================================================================
  it("S12: Realistic full-feature config", () => {
    const input: TournamentInput = {
      ...S1_INPUT,
      platformFeePct: 2.9,
      refundLeakagePct: 2,
      volunteerCount: 8,
      volunteerMealCost: 12,
      warmupShuttlesPerTie: 0.5,
      overheadPerMatchMin: 2,
      overheadPerTieMin: 3,
      scheduleConfidence: "Realistic",
    };
    const result = computeTournament(input);

    expect(result.timePerTieMinutes).toBe(51);
    expect(result.rawPoolMinutes).toBeCloseTo(229.5, 1);
    expect(result.bookHours).toBe(4);
    expect(result.courtCostPerPool).toBeCloseTo(160, 1);
    expect(result.shuttleCostPerPool).toBeCloseTo(238.5, 1);
    expect(result.costs.courts).toBeCloseTo(1400, 1);
    expect(result.costs.shuttles).toBeCloseTo(1855, 1);
    expect(result.costs.prizes).toBeCloseTo(700, 1);
    expect(result.costs.volunteers).toBeCloseTo(96, 1);
    expect(result.costs.total).toBeCloseTo(4751, 1);
    expect(result.grossRevenue).toBeCloseTo(7560, 1);
    expect(result.platformFees).toBeCloseTo(219.24, 1);
    expect(result.refundLeakage).toBeCloseTo(151.2, 1);
    expect(result.netRevenue).toBeCloseTo(7189.56, 1);
    expect(result.profit).toBeCloseTo(2438.56, 1);
    expect(result.marginPct).toBeCloseTo(32.26, 0);
  });

  // ================================================================
  // Scenario 13: Doubles format
  // ================================================================
  it("S13: Doubles format", () => {
    const S13_INPUT: TournamentInput = {
      numCategories: 5,
      teamsPerPool: 4,
      poolsPerCategory: 1,
      playersPerTeam: 2,
      tiesPerTeam: 3,
      matchesPerTie: 1,
      minutesPerMatch: 20,
      includeFinals: true,
      courtsAvailable: 10,
      courtsPerPool: 1,
      courtCostPerHour: 20,
      shuttleCostPerUnit: 5,
      shuttlesPerMatch: 2.0,
      warmupShuttlesPerTie: 0.5,
      prizePerCategory: 100,
      prizeMinTeamsThreshold: 4,
      volunteerCount: 6,
      volunteerMealCost: 12,
      adsBudget: 400,
      adminMisc: 150,
      pricePerPlayer: 40,
      earlyBirdEnabled: false,
      earlyBirdPrice: 40,
      earlyBirdPct: 0,
      latePricingEnabled: false,
      latePrice: 55,
      latePct: 0,
      fillRatePct: 100,
      platformFeePct: 2.9,
      refundLeakagePct: 2,
      scheduleConfidence: "Aggressive",
      overheadPerMatchMin: 0,
      overheadPerTieMin: 0,
      categoryVariancePct: 0,
    };
    const result = computeTournament(S13_INPUT);

    expect(result.tiesPerPool).toBe(6);
    expect(result.matchesPerPool).toBe(6);
    expect(result.totalPools).toBe(5);
    expect(result.totalTeams).toBe(20);
    expect(result.totalPlayers).toBe(40);
    expect(result.grossRevenue).toBeCloseTo(1600, 1);
    expect(result.platformFees).toBeCloseTo(46.4, 1);
    expect(result.refundLeakage).toBeCloseTo(32.0, 1);
    expect(result.netRevenue).toBeCloseTo(1521.6, 1);
    expect(result.rawPoolMinutes).toBeCloseTo(120, 1);
    expect(result.bookHours).toBe(2);
    expect(result.courtCostPerPool).toBeCloseTo(40, 1);
    expect(result.shuttleCostPerPool).toBeCloseTo(75, 1);
    expect(result.costs.courts).toBeCloseTo(300, 1);
    expect(result.costs.shuttles).toBeCloseTo(437.5, 1);
    expect(result.costs.prizes).toBeCloseTo(500, 1);
    expect(result.costs.volunteers).toBeCloseTo(72, 1);
    expect(result.costs.total).toBeCloseTo(1859.5, 1);
    expect(result.profit).toBeCloseTo(-337.9, 1);
    expect(result.marginPct).toBeCloseTo(-21.12, 0);
    expect(result.gamesPerPlayerPool).toBe(3);
    expect(result.costPerGame).toBeCloseTo(13.33, 1);
  });
});
