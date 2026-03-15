import { NextRequest, NextResponse } from "next/server";

// ═══════════════════════════════════════════════════════════════════
// FB ADS — GOOGLE SHEETS API ROUTE
// ═══════════════════════════════════════════════════════════════════
//
// Fetches FB Ads data from a Google Sheet (synced via Make.com).
// Expects env vars:
//   GOOGLE_SERVICE_ACCOUNT_JSON — Base64-encoded service account JSON
//   FB_ADS_SHEET_ID — Google Sheet ID
//
// GET /api/fb-ads/sheets
//   Returns: { data: string[][] } (header row + data rows)
//
// Timeout: Vercel hobby = 10s. We catch and return helpful error.
// ═══════════════════════════════════════════════════════════════════

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
const SHEET_RANGE = "Sheet1!A:Z"; // Read all columns

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
  token_uri: string;
}

/**
 * Create a JWT and exchange it for an access token.
 * This avoids importing the full google-auth-library (180kB).
 */
async function getAccessToken(key: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: key.client_email,
    scope: SCOPES.join(" "),
    aud: key.token_uri,
    iat: now,
    exp: now + 3600,
  };

  // Base64url encode
  const b64url = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const unsignedToken = `${b64url(header)}.${b64url(payload)}`;

  // Sign with RSA-SHA256
  const crypto = await import("crypto");
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  const signature = signer
    .sign(key.private_key, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${unsignedToken}.${signature}`;

  // Exchange JWT for access token
  const tokenRes = await fetch(key.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed: ${tokenRes.status}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

export async function GET(request: NextRequest) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s (leave 2s buffer for Vercel 10s limit)

  try {
    // Check env vars
    const serviceAccountB64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const sheetId = process.env.FB_ADS_SHEET_ID;

    if (!serviceAccountB64) {
      return NextResponse.json(
        { error: "GOOGLE_SERVICE_ACCOUNT_JSON not configured. Add it to your .env.local" },
        { status: 500 }
      );
    }

    if (!sheetId) {
      return NextResponse.json(
        { error: "FB_ADS_SHEET_ID not configured. Add it to your .env.local" },
        { status: 500 }
      );
    }

    // Decode service account key
    let serviceAccount: ServiceAccountKey;
    try {
      const decoded = Buffer.from(serviceAccountB64, "base64").toString("utf-8");
      serviceAccount = JSON.parse(decoded);
    } catch {
      return NextResponse.json(
        { error: "Invalid GOOGLE_SERVICE_ACCOUNT_JSON. Must be base64-encoded service account JSON." },
        { status: 500 }
      );
    }

    // Get access token
    const accessToken = await getAccessToken(serviceAccount);

    // Read sheet data from optional query param for range
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get("range") || SHEET_RANGE;

    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;

    const sheetsRes = await fetch(sheetsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    });

    if (!sheetsRes.ok) {
      const errorText = await sheetsRes.text();
      return NextResponse.json(
        { error: `Google Sheets API error: ${sheetsRes.status} — ${errorText}` },
        { status: sheetsRes.status }
      );
    }

    const sheetsData = await sheetsRes.json();
    const rows: string[][] = sheetsData.values || [];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Sheet is empty. Ensure Make.com has synced data to this sheet." },
        { status: 404 }
      );
    }

    // Return header + data rows
    // Client will parse these the same way as CSV
    return NextResponse.json({
      data: rows,
      rowCount: rows.length - 1, // Exclude header
      sheetId,
    });
  } catch (err: unknown) {
    clearTimeout(timeout);

    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json(
        { error: "Google Sheets connection timed out. Try a smaller date range or switch to CSV upload." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: `Unexpected error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
