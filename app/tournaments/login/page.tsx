"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Admin passcode gate. On success the server sets an httpOnly cookie and we
// redirect to the requested admin page (or the admin console by default).
export default function AdminLoginPage() {
  const router = useRouter();
  const [next, setNext] = useState("/tournaments/admin");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("next");
    if (p && p.startsWith("/") && !p.startsWith("//")) setNext(p);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/tournament-lite/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (data.ok) {
        router.replace(next);
        router.refresh();
      } else {
        setErr(data.message || "Incorrect passcode.");
      }
    } catch {
      setErr("Network error — please try again.");
    }
    setBusy(false);
  }

  return (
    <main className="tlite-shell tlite-login">
      <form className="tlite-card tlite-login-card" onSubmit={submit}>
        <h1 className="tlite-login-title">Tournament Admin</h1>
        <p className="tlite-muted">Enter the admin passcode to continue.</p>
        <input
          className="tlite-login-input"
          type="password"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
          aria-label="Admin passcode"
          autoFocus
        />
        {err && (
          <p className="tlite-login-err" role="alert">
            {err}
          </p>
        )}
        <button className="tlite-btn tlite-btn-primary" type="submit" disabled={busy || !passcode}>
          {busy ? "Checking…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
