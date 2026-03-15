import type { TournamentInput, TournamentResult } from "./types";

export function computeTournament(input: TournamentInput): TournamentResult {
  // === POOL STRUCTURE ===
  const totalTiesPerPool = (input.teamsPerPool * input.tiesPerTeam) / 2;
  const matchesPerPool = totalTiesPerPool * input.matchesPerTie;
  const totalPools = input.totalPools ?? (input.numCategories * input.poolsPerCategory);

  // === REVENUE ===
  const totalTeams = input.teamsPerPool * totalPools;
  const effectiveTeams = Math.round((totalTeams * input.fillRatePct) / 100);
  const totalPlayers = effectiveTeams * input.playersPerTeam;

  const regularPct =
    100 -
    (input.earlyBirdEnabled ? input.earlyBirdPct : 0) -
    (input.latePricingEnabled ? input.latePct : 0);

  const blendedPrice =
    (regularPct / 100) * input.pricePerPlayer +
    (input.earlyBirdEnabled
      ? (input.earlyBirdPct / 100) * input.earlyBirdPrice
      : 0) +
    (input.latePricingEnabled ? (input.latePct / 100) * input.latePrice : 0);

  const grossRevenue = totalPlayers * blendedPrice;
  const platformFees = (grossRevenue * input.platformFeePct) / 100;
  const refundLeakage = (grossRevenue * input.refundLeakagePct) / 100;
  const netRevenue = grossRevenue - platformFees - refundLeakage;

  // === TIME PER TIE ===
  const timePerTieMinutes =
    input.matchesPerTie * (input.minutesPerMatch + input.overheadPerMatchMin) +
    input.overheadPerTieMin;

  // === POOL COSTS ===
  const rawPoolMinutes =
    (totalTiesPerPool * timePerTieMinutes) / input.courtsPerPool;
  const bookHours = Math.ceil(rawPoolMinutes / 60);

  // Courts actually used = totalPools × courtsPerPool (each pool needs its own courts)
  const courtsUsed = totalPools * input.courtsPerPool;
  // Total court-hours = each pool's courts × booked hours
  const totalCourtHours = courtsUsed * bookHours;

  const courtCostPerPool =
    input.courtsPerPool * bookHours * input.courtCostPerHour;
  const shuttleCostPerPool =
    (matchesPerPool * input.shuttlesPerMatch +
      totalTiesPerPool * input.warmupShuttlesPerTie) *
    input.shuttleCostPerUnit;

  // Prize scaling (per category)
  const effectiveTeamsPerPool = effectiveTeams / totalPools;
  const effectivePrize =
    effectiveTeamsPerPool >= input.prizeMinTeamsThreshold
      ? input.prizePerCategory
      : input.prizePerCategory * 0.5;

  // === FINALS (per category) ===
  const finalCourtCost = input.courtsPerPool * 1 * input.courtCostPerHour;
  const finalShuttleCost =
    (input.matchesPerTie * input.shuttlesPerMatch +
      1 * input.warmupShuttlesPerTie) *
    input.shuttleCostPerUnit;
  const finalCostPerCategory = finalCourtCost + finalShuttleCost;

  // === COST TOTALS ===
  // Pool stage court cost = total court-hours × rate
  const poolStageCourtCost = totalCourtHours * input.courtCostPerHour;
  const totalCourtCost =
    poolStageCourtCost +
    (input.includeFinals ? finalCourtCost * input.numCategories : 0);
  const totalShuttleCost =
    shuttleCostPerPool * totalPools +
    (input.includeFinals ? finalShuttleCost * input.numCategories : 0);
  const totalPrizeCost = effectivePrize * input.numCategories;
  const totalVolunteerCost = input.volunteerCount * input.volunteerMealCost;
  const totalCosts =
    totalCourtCost +
    totalShuttleCost +
    totalPrizeCost +
    totalVolunteerCost +
    input.adsBudget +
    input.adminMisc;

  // === ADDITIONAL REVENUE ===
  const additionalRevenue = (input.sponsorshipRevenue ?? 0) + (input.grantRevenue ?? 0);

  // === PROFITABILITY ===
  const profit = netRevenue + additionalRevenue - totalCosts;
  const totalIncome = grossRevenue + additionalRevenue;
  const marginPct = totalIncome > 0 ? (profit / totalIncome) * 100 : 0;
  const profitPerTeam = effectiveTeams > 0 ? profit / effectiveTeams : 0;
  const profitPerPlayer = totalPlayers > 0 ? profit / totalPlayers : 0;

  // Variance range
  const profitLow = profit * (1 - input.categoryVariancePct / 100);
  const profitHigh = profit * (1 + input.categoryVariancePct / 100);

  // === PLAYER VALUE ===
  // Scoring format multiplier: 2×21 means best-of-3 sets → 2× the playing value
  const setsPerGame = input.scoringFormat === "2×21" ? 2 : 1;

  // Squad: each player plays 2 games per tie (1 discipline + 1 XD)
  // Doubles: each player plays every match in the tie
  const gamesPerPlayerPerTie =
    input.playersPerTeam > 2
      ? 2 // squad: 1 MD/WD + 1 XD per player per tie
      : input.matchesPerTie; // doubles: all matches
  const gamesPerPlayerPool = input.tiesPerTeam * gamesPerPlayerPerTie * setsPerGame;
  const gamesPerPlayerFinals =
    input.includeFinals
      ? gamesPerPlayerPerTie * setsPerGame
      : 0;
  const gamesPerPlayerWithFinal = gamesPerPlayerPool + gamesPerPlayerFinals;
  const costPerGame =
    gamesPerPlayerPool > 0 ? blendedPrice / gamesPerPlayerPool : 0;

  // === SCHEDULE ===
  // Buffer between waves: changeover time for teams to swap courts
  const bufferMinutesPerWave =
    input.scheduleConfidence === "Aggressive"
      ? 5
      : input.scheduleConfidence === "Realistic"
        ? 10
        : 15;
  const poolsSimultaneous = Math.floor(
    input.courtsAvailable / input.courtsPerPool
  );
  const waves =
    poolsSimultaneous > 0
      ? Math.ceil(totalPools / poolsSimultaneous)
      : totalPools;

  // Pool playing time = rawPoolMinutes (already includes match & tie overhead)
  const poolPlayingHours = rawPoolMinutes / 60;

  // Pool stage = waves × (one pool's playing time) + transition buffers between waves
  // rawPoolMinutes already includes overheadPerMatchMin and overheadPerTieMin
  const transitionMinutes = Math.max(0, waves - 1) * bufferMinutesPerWave;
  const estimatedPoolStageHours =
    (waves * rawPoolMinutes + transitionMinutes) / 60;

  const finalsHours = input.includeFinals ? 1.0 : 0;
  const ceremonyBuffer = 0.5;
  const totalEventDuration =
    estimatedPoolStageHours + finalsHours + ceremonyBuffer;

  // Schedule warning
  let scheduleWarning: string | null = null;
  if (totalEventDuration > 10)
    scheduleWarning =
      "Event exceeds 10 hours — consider adding courts or reducing pools";
  else if (totalEventDuration > 8)
    scheduleWarning = "Event exceeds 8 hours — tight for a single-day event";

  // === BREAK-EVEN ===
  let breakEvenPools: number | null = null;
  for (let p = 1; p <= totalPools; p++) {
    const beTeams = input.teamsPerPool * p;
    const beEffective = Math.round((beTeams * input.fillRatePct) / 100);
    const bePlayers = beEffective * input.playersPerTeam;
    const beGross = bePlayers * blendedPrice;
    const beNet =
      beGross -
      (beGross * input.platformFeePct) / 100 -
      (beGross * input.refundLeakagePct) / 100;
    // Prize cost scales per category (not per pool)
    const beCategoriesAtP = Math.min(p, input.numCategories);
    const beCost =
      courtCostPerPool * p +
      shuttleCostPerPool * p +
      effectivePrize * beCategoriesAtP +
      (input.includeFinals
        ? finalCostPerCategory * beCategoriesAtP
        : 0) +
      totalVolunteerCost +
      input.adsBudget +
      input.adminMisc;
    if ((beNet + additionalRevenue) >= beCost) {
      breakEvenPools = p;
      break;
    }
  }

  return {
    // Scale
    totalPools,
    totalTeams,
    effectiveTeams,
    totalPlayers,

    // Revenue
    blendedPricePerPlayer: blendedPrice,
    grossRevenue,
    platformFees,
    refundLeakage,
    netRevenue,
    additionalRevenue,

    // Cost breakdown
    costs: {
      courts: totalCourtCost,
      shuttles: totalShuttleCost,
      prizes: totalPrizeCost,
      volunteers: totalVolunteerCost,
      ads: input.adsBudget,
      admin: input.adminMisc,
      total: totalCosts,
    },

    // Per-pool detail
    courtCostPerPool,
    shuttleCostPerPool,
    finalCostPerCategory,

    // Profitability
    profit,
    marginPct,
    profitPerTeam,
    profitPerPlayer,
    profitRange: { low: profitLow, high: profitHigh },
    breakEvenPools,

    // Player value
    gamesPerPlayerPerTie,
    gamesPerPlayerPool,
    gamesPerPlayerWithFinal,
    costPerGame,

    // Schedule
    tiesPerPool: totalTiesPerPool,
    matchesPerPool,
    timePerTieMinutes,
    rawPoolMinutes,
    poolPlayingHours,
    bookHours,
    courtsUsed,
    totalCourtHours,
    poolsSimultaneous,
    waves,
    bufferMinutesPerWave,
    estimatedPoolStageHours,
    finalsHours,
    totalEventDuration,
    scheduleWarning,
  };
}
