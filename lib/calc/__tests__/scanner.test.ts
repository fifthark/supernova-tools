import { describe, it, expect } from "vitest";
import { runScanner } from "../scanner";
import type { TournamentInput } from "../types";

const BASE_INPUT: TournamentInput = {
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

describe("Scanner", () => {
  it("returns at most 5 suggestions", () => {
    const suggestions = runScanner(BASE_INPUT, 5);
    expect(suggestions.length).toBeLessThanOrEqual(5);
  });

  it("all suggestions have positive profitDelta", () => {
    const suggestions = runScanner(BASE_INPUT);
    for (const s of suggestions) {
      expect(s.profitDelta).toBeGreaterThan(0);
    }
  });

  it("suggestions are sorted by profitDelta descending", () => {
    const suggestions = runScanner(BASE_INPUT);
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i - 1].profitDelta).toBeGreaterThanOrEqual(
        suggestions[i].profitDelta
      );
    }
  });

  it("each suggestion has all required fields", () => {
    const suggestions = runScanner(BASE_INPUT);
    for (const s of suggestions) {
      expect(s).toHaveProperty("label");
      expect(s).toHaveProperty("profitDelta");
      expect(s).toHaveProperty("marginDelta");
      expect(s).toHaveProperty("durationDelta");
      expect(s).toHaveProperty("newProfit");
      expect(s).toHaveProperty("newMargin");
    }
  });

  it("includes price increase among top suggestions", () => {
    const suggestions = runScanner(BASE_INPUT);
    const hasPriceSuggestion = suggestions.some((s) =>
      s.label.includes("price")
    );
    expect(hasPriceSuggestion).toBe(true);
  });
});
