"use client";

import type { TournamentResult } from "@/lib/calc/types";

interface ScheduleInfoProps {
  result: TournamentResult;
}

export function ScheduleInfo({ result }: ScheduleInfoProps) {
  return (
    <div className="card">
      <div className="section-header">Schedule</div>

      {/* Per-Pool breakdown */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
          Per Pool
        </div>
        <div className="metrics-grid">
          <div className="metric-item">
            <div className="metric-label">Ties / Pool</div>
            <div className="metric-value">{result.tiesPerPool}</div>
            <div className="helper-text">Round-robin matchups in each pool</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Games / Pool</div>
            <div className="metric-value">{result.matchesPerPool}</div>
            <div className="helper-text">Total individual games played</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Time / Tie</div>
            <div className="metric-value">{result.timePerTieMinutes} min</div>
            <div className="helper-text">All games in a tie + overhead</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Pool Duration</div>
            <div className="metric-value">{result.poolPlayingHours.toFixed(1)}h</div>
            <div className="helper-text">Playing time for 1 pool</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Booked Hours</div>
            <div className="metric-value">{result.bookHours}h</div>
            <div className="helper-text">Venue billing per pool (rounded up)</div>
          </div>
        </div>
      </div>

      {/* Courts & Costs */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
          Courts
        </div>
        <div className="metrics-grid">
          <div className="metric-item">
            <div className="metric-label">Courts Used</div>
            <div className="metric-value">{result.courtsUsed}</div>
            <div className="helper-text">{result.totalPools} pools × {result.courtsUsed / result.totalPools} courts/pool</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Court Hours</div>
            <div className="metric-value">{result.totalCourtHours}</div>
            <div className="helper-text">{result.courtsUsed} courts × {result.bookHours}h each</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Court Cost</div>
            <div className="metric-value">${result.costs.courts.toLocaleString()}</div>
            <div className="helper-text">{result.totalCourtHours} court-hrs × ${result.costs.courts > 0 ? Math.round(result.costs.courts / result.totalCourtHours) : 0}/hr</div>
          </div>
        </div>
      </div>

      {/* Event-level schedule */}
      <div>
        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
          Event Timeline
        </div>
        <div className="metrics-grid">
          <div className="metric-item">
            <div className="metric-label">Parallel Pools</div>
            <div className="metric-value">{result.poolsSimultaneous}</div>
            <div className="helper-text">Pools running at the same time</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Waves</div>
            <div className="metric-value">{result.waves}</div>
            <div className="helper-text">
              {result.waves === 1
                ? "All pools fit in 1 wave"
                : `${result.totalPools} pools / ${result.poolsSimultaneous} parallel = ${result.waves} waves`}
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Pool Stage</div>
            <div className="metric-value">{result.estimatedPoolStageHours.toFixed(1)}h</div>
            <div className="helper-text">
              {result.waves} wave{result.waves > 1 ? "s" : ""} × {result.poolPlayingHours.toFixed(1)}h
              {result.waves > 1 ? ` + ${result.bufferMinutesPerWave}min buffer` : ""}
            </div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Finals + Ceremony</div>
            <div className="metric-value">{(result.finalsHours + 0.5).toFixed(1)}h</div>
            <div className="helper-text">{result.finalsHours > 0 ? "Finals 1h + ceremony 30min" : "Ceremony 30min"}</div>
          </div>
          <div className="metric-item">
            <div className="metric-label">Total Event</div>
            <div className="metric-value" style={{ color: result.totalEventDuration > 8 ? "#ef4444" : result.totalEventDuration > 6 ? "var(--accent)" : "var(--text-primary)" }}>
              {result.totalEventDuration.toFixed(1)}h
            </div>
            <div className="helper-text">Full day wall-clock time</div>
          </div>
        </div>
      </div>

      {result.scheduleWarning && (
        <div className="schedule-warning">{result.scheduleWarning}</div>
      )}
    </div>
  );
}
