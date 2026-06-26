// Tournament Lite — server-only Apps Script client.
//
// SERVER-ONLY. Imported only by the /api/tournament-lite/* route handlers. It
// reads TOURNAMENT_LITE_ADMIN_SECRET from the server environment and injects it
// into the request body, so the secret never reaches the browser. Never import
// this module from a client component.
//
// Admin actions here carry the server-held ADMIN_SECRET. Network access to the
// admin pages (/tournament-lite, /tournaments/admin) and admin API
// (/api/tournament-lite/{state,generate,score,recalc,reset,category}) is gated by
// the Next.js middleware (middleware.ts), which requires the admin session cookie.
// The public board (/api/tournament-lite/public, /live/[token]) stays read-only
// and Share_Token-gated, and remains public by design.

export interface GasResult {
  ok: boolean;
  reason?: string;
  message?: string;
  [key: string]: unknown;
}

// GAS cold start + generateFixtures (full clear + rewrite of matches, leaderboard
// and per-entry Pool_IDs) can take 20-40s. Relaxed for TEST/local dev.
// NOTE for production: Vercel function limits apply (hobby 10s, pro 60s) — the
// generate latency must be addressed before deploying (Pro plan, or optimise the
// GAS write path / make generate async).
const TIMEOUT_MS = 45000;

/**
 * POST { action, secret, payload } to the Tournament Lite Apps Script /exec URL,
 * following GAS's redirect, and return the parsed JSON envelope. Always resolves
 * to a clean { ok:false, reason } on misconfiguration, network failure, timeout,
 * or a non-JSON response — it never throws.
 */
export async function gasPost(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<GasResult> {
  const execUrl = process.env.TOURNAMENT_LITE_EXEC_URL;
  const secret = process.env.TOURNAMENT_LITE_ADMIN_SECRET;

  if (!execUrl) {
    return { ok: false, reason: "config_error", message: "TOURNAMENT_LITE_EXEC_URL is not set." };
  }
  if (!secret) {
    return { ok: false, reason: "config_error", message: "TOURNAMENT_LITE_ADMIN_SECRET is not set." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(execUrl, {
      method: "POST",
      redirect: "follow",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, secret, payload }),
      signal: controller.signal,
    });
    const text = await res.text();
    try {
      return JSON.parse(text) as GasResult;
    } catch {
      return { ok: false, reason: "bad_gateway", message: "Apps Script returned a non-JSON response." };
    }
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      reason: aborted ? "timeout" : "network_error",
      message: aborted ? "Apps Script request timed out." : "Could not reach Apps Script.",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET the PUBLIC Apps Script endpoint (e.g. action=publicBoard). The board token
 * is passed by the caller; NO admin secret is ever sent. Returns the parsed JSON
 * envelope; never throws.
 */
export async function gasGetPublic(params: Record<string, string>): Promise<GasResult> {
  const execUrl = process.env.TOURNAMENT_LITE_EXEC_URL;
  if (!execUrl) {
    return { ok: false, reason: "config_error", message: "TOURNAMENT_LITE_EXEC_URL is not set." };
  }
  const qs = new URLSearchParams(params).toString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${execUrl}?${qs}`, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
    });
    const text = await res.text();
    try {
      return JSON.parse(text) as GasResult;
    } catch {
      return { ok: false, reason: "bad_gateway", message: "Apps Script returned a non-JSON response." };
    }
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      reason: aborted ? "timeout" : "network_error",
      message: aborted ? "Apps Script request timed out." : "Could not reach Apps Script.",
    };
  } finally {
    clearTimeout(timer);
  }
}
