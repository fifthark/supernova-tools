"use client";

import { useState } from "react";

// Shows the public player-board URL derived from the current browser origin
// (no hardcoded domain) and a Copy button. The token is the public Share_Token
// (already part of the public board URL) — never the admin secret.
export default function PlayerLinkCard({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = token ? `${origin}/live/${token}` : "";

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — the link is still shown for manual copy */
    }
  }

  return (
    <section className="tlite-card tlite-linkcard">
      <div className="tlite-linkcard-body">
        <h3 className="tlite-card-title">Player board link</h3>
        {token ? (
          <p className="tlite-link-url" title={url}>
            {url}
          </p>
        ) : (
          <p className="tlite-muted">Publish the board (set a share token) to get a shareable link.</p>
        )}
      </div>
      {token ? (
        <button className="tlite-btn tlite-btn-sm" onClick={copy}>
          {copied ? "Copied ✓" : "Copy link"}
        </button>
      ) : null}
    </section>
  );
}
