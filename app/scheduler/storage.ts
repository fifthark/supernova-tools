import {
  DEFAULT_NUM_COURTS,
  MAX_NUM_COURTS,
  MIN_NUM_COURTS,
  SCHEMA_VERSION,
  buildT004Plan,
} from "./defaults";
import type { Plan } from "./types";

export const STORAGE_KEY = "fifthark_scheduler_plan_v1";

function clampNumCourts(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_NUM_COURTS;
  return Math.min(MAX_NUM_COURTS, Math.max(MIN_NUM_COURTS, Math.floor(n)));
}

function migrateToV2(raw: Record<string, unknown>): Plan | null {
  if (!raw || typeof raw !== "object") return null;

  const version = typeof raw.schemaVersion === "number" ? raw.schemaVersion : 1;

  let numCourts: number;
  if (typeof raw.numCourts === "number") {
    numCourts = clampNumCourts(raw.numCourts);
  } else if (raw.courtIdMap && typeof raw.courtIdMap === "object") {
    const keys = Object.keys(raw.courtIdMap as Record<string, unknown>);
    numCourts = keys.length > 0 ? clampNumCourts(keys.length) : DEFAULT_NUM_COURTS;
  } else {
    numCourts = DEFAULT_NUM_COURTS;
  }

  const { courtIdMap: _drop, ...rest } = raw as Record<string, unknown> & {
    courtIdMap?: unknown;
  };
  void _drop;

  const migrated: Plan = {
    ...(rest as unknown as Plan),
    schemaVersion: SCHEMA_VERSION,
    numCourts,
  };

  console.info(
    `[scheduler] migrated plan from schemaVersion=${version} to ${SCHEMA_VERSION} (numCourts=${numCourts})`,
  );

  return migrated;
}

export function loadPlan(): Plan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return null;

    if (parsed.schemaVersion === SCHEMA_VERSION && typeof parsed.numCourts === "number") {
      return parsed as unknown as Plan;
    }

    const migrated = migrateToV2(parsed);
    if (migrated) {
      savePlan(migrated);
    }
    return migrated;
  } catch {
    return null;
  }
}

export function savePlan(plan: Plan): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // Quota errors / private-mode failures are non-fatal — plan still lives in React state.
  }
}

export function loadOrBuildPlan(): Plan {
  return loadPlan() ?? buildT004Plan();
}
