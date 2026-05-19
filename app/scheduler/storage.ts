import { SCHEMA_VERSION, buildT004Plan } from "./defaults";
import type { Plan } from "./types";

export const STORAGE_KEY = "fifthark_scheduler_plan_v1";

export function loadPlan(): Plan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Plan;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.schemaVersion !== SCHEMA_VERSION) return null;
    return parsed;
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
