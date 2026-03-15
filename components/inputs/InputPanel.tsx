"use client";

import type { TournamentInput, ScheduleConfidence } from "@/lib/calc/types";
import { SCORING_FORMATS, SCORING_FORMAT_MINUTES } from "@/lib/calc/constants";
import { NumberInput } from "@/components/ui/NumberInput";
import { Toggle } from "@/components/ui/Toggle";
import { PillToggle } from "@/components/ui/PillToggle";
import { ThreeToggle } from "@/components/ui/ThreeToggle";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";

type Format = "Doubles" | "Squad Battle";

interface InputPanelProps {
  input: TournamentInput;
  format: Format;
  onFormatChange: (f: Format) => void;
  onChange: <K extends keyof TournamentInput>(key: K, value: TournamentInput[K]) => void;
}

export function InputPanel({ input, format, onFormatChange, onChange }: InputPanelProps) {
  const totalPools = input.totalPools ?? (input.numCategories * input.poolsPerCategory);
  const isFullRR = input.tiesPerTeam === input.teamsPerPool - 1;

  const handleScoringFormatChange = (fmt: string) => {
    onChange("scoringFormat", fmt);
    const suggestedMinutes = SCORING_FORMAT_MINUTES[fmt];
    if (suggestedMinutes) {
      onChange("minutesPerMatch", suggestedMinutes);
    }
  };

  const handleTotalPoolsChange = (v: number) => {
    onChange("totalPools" as keyof TournamentInput, v);
    const ppc = Math.max(1, Math.round(v / input.numCategories));
    onChange("poolsPerCategory", ppc);
  };

  const handleNumCategoriesChange = (v: number) => {
    onChange("numCategories", v);
    if (totalPools < v) {
      onChange("totalPools" as keyof TournamentInput, v);
    }
  };

  return (
    <div className="input-panel">
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>
          Tournament Calculator
        </h1>
        <PillToggle
          options={["Doubles", "Squad Battle"] as Format[]}
          value={format}
          onChange={onFormatChange}
        />
      </div>

      <CollapsibleSection title="Structure">
        <NumberInput
          label="Categories"
          value={input.numCategories}
          onChange={handleNumCategoriesChange}
          min={1}
          max={20}
          annotation="e.g. Men's A, Women's B, Mixed C"
        />
        <NumberInput
          label="Total Pools"
          value={totalPools}
          onChange={handleTotalPoolsChange}
          min={1}
          max={50}
          annotation="Total across all categories (some may have 1, others 2+)"
        />
        <NumberInput label="Teams per Pool" value={input.teamsPerPool} onChange={(v) => onChange("teamsPerPool", v)} min={3} max={8} />
        <NumberInput label="Players per Team" value={input.playersPerTeam} onChange={(v) => onChange("playersPerTeam", v)} min={2} max={6} />
        <NumberInput
          label="Ties per Team"
          value={input.tiesPerTeam}
          onChange={(v) => onChange("tiesPerTeam", v)}
          min={1}
          max={input.teamsPerPool - 1}
          annotation={isFullRR ? "Full round-robin — plays every other team" : "How many opponents each team faces in pool"}
        />
        <NumberInput
          label="Matches per Tie"
          value={input.matchesPerTie}
          onChange={(v) => onChange("matchesPerTie", v)}
          min={1}
          max={5}
          annotation={input.matchesPerTie === 4 ? "e.g. 1 MD + 1 WD + 2 XD" : input.matchesPerTie === 1 ? "Single match per fixture" : `${input.matchesPerTie} games per fixture`}
        />
        <div className="input-row">
          <div>
            <span className="label">Scoring Format</span>
            <div className="annotation">
              {input.scoringFormat === "1×21" && "Single game to 21 (~10 min)"}
              {input.scoringFormat === "1×30" && "Single game to 30 (~15 min)"}
              {input.scoringFormat === "2×21" && "Best of 3 games to 21 (~20 min)"}
            </div>
          </div>
          <select
            className="select-input"
            value={input.scoringFormat}
            onChange={(e) => handleScoringFormatChange(e.target.value)}
          >
            {SCORING_FORMATS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <NumberInput
          label="Minutes per Match"
          value={input.minutesPerMatch}
          onChange={(v) => onChange("minutesPerMatch", v)}
          min={5}
          max={30}
          annotation="Auto-set by scoring format, still editable"
        />
        <Toggle label="Include Finals" value={input.includeFinals} onChange={(v) => onChange("includeFinals", v)} />
      </CollapsibleSection>

      <CollapsibleSection title="Venue & Courts">
        <NumberInput label="Courts Available" value={input.courtsAvailable} onChange={(v) => onChange("courtsAvailable", v)} min={1} max={30} />
        <NumberInput label="Courts per Pool" value={input.courtsPerPool} onChange={(v) => onChange("courtsPerPool", v)} min={1} max={4} />
        <NumberInput label="Court Cost ($/hr)" value={input.courtCostPerHour} onChange={(v) => onChange("courtCostPerHour", v)} min={0} max={100} suffix="$/hr" />
      </CollapsibleSection>

      <CollapsibleSection title="Costs">
        <NumberInput label="Shuttle Cost ($)" value={input.shuttleCostPerUnit} onChange={(v) => onChange("shuttleCostPerUnit", v)} min={1} max={15} step={0.5} suffix="$" />
        <NumberInput label="Shuttles per Match" value={input.shuttlesPerMatch} onChange={(v) => onChange("shuttlesPerMatch", v)} min={0.5} max={3} step={0.1} />
        <NumberInput label="Warmup Shuttles/Tie" value={input.warmupShuttlesPerTie} onChange={(v) => onChange("warmupShuttlesPerTie", v)} min={0} max={2} step={0.5} />
        <NumberInput label="Prize per Category ($)" value={input.prizePerCategory} onChange={(v) => onChange("prizePerCategory", v)} min={0} max={500} suffix="$" annotation="Awarded per category, not per pool" />
        <NumberInput label="Min Teams for Full Prize" value={input.prizeMinTeamsThreshold} onChange={(v) => onChange("prizeMinTeamsThreshold", v)} min={2} max={8} />
        <NumberInput label="Volunteers" value={input.volunteerCount} onChange={(v) => onChange("volunteerCount", v)} min={0} max={30} />
        <NumberInput label="Meal Cost/Volunteer ($)" value={input.volunteerMealCost} onChange={(v) => onChange("volunteerMealCost", v)} min={0} max={30} suffix="$" />
        <NumberInput label="Ad Budget ($)" value={input.adsBudget} onChange={(v) => onChange("adsBudget", v)} min={0} max={2000} suffix="$" />
        <NumberInput label="Admin/Misc ($)" value={input.adminMisc} onChange={(v) => onChange("adminMisc", v)} min={0} max={1000} suffix="$" />
      </CollapsibleSection>

      <CollapsibleSection title="Pricing & Revenue">
        <NumberInput label="Price per Player ($)" value={input.pricePerPlayer} onChange={(v) => onChange("pricePerPlayer", v)} min={10} max={100} suffix="$" />
        <Toggle label="Early Bird Enabled" value={input.earlyBirdEnabled} onChange={(v) => onChange("earlyBirdEnabled", v)} />
        {input.earlyBirdEnabled && (
          <>
            <NumberInput label="Early Bird Price ($)" value={input.earlyBirdPrice} onChange={(v) => onChange("earlyBirdPrice", v)} min={10} max={100} suffix="$" />
            <NumberInput label="Early Bird %" value={input.earlyBirdPct} onChange={(v) => onChange("earlyBirdPct", v)} min={0} max={80} suffix="%" />
          </>
        )}
        <Toggle label="Late Pricing Enabled" value={input.latePricingEnabled} onChange={(v) => onChange("latePricingEnabled", v)} />
        {input.latePricingEnabled && (
          <>
            <NumberInput label="Late Price ($)" value={input.latePrice} onChange={(v) => onChange("latePrice", v)} min={10} max={100} suffix="$" />
            <NumberInput label="Late %" value={input.latePct} onChange={(v) => onChange("latePct", v)} min={0} max={50} suffix="%" />
          </>
        )}
        <NumberInput label="Fill Rate %" value={input.fillRatePct} onChange={(v) => onChange("fillRatePct", v)} min={50} max={100} suffix="%" />
        <NumberInput label="Platform Fee %" value={input.platformFeePct} onChange={(v) => onChange("platformFeePct", v)} min={0} max={10} step={0.1} suffix="%" />
        <NumberInput label="Refund/Comp Leakage %" value={input.refundLeakagePct} onChange={(v) => onChange("refundLeakagePct", v)} min={0} max={10} step={0.1} suffix="%" />
        <NumberInput
          label="Sponsorship ($)"
          value={input.sponsorshipRevenue ?? 0}
          onChange={(v) => onChange("sponsorshipRevenue", v)}
          min={0}
          max={10000}
          suffix="$"
          annotation="Sponsor contributions added to revenue"
        />
        <NumberInput
          label="Grants ($)"
          value={input.grantRevenue ?? 0}
          onChange={(v) => onChange("grantRevenue", v)}
          min={0}
          max={10000}
          suffix="$"
          annotation="Council/association grants"
        />
      </CollapsibleSection>

      <CollapsibleSection title="Schedule Realism">
        <div className="input-row">
          <span className="label">Schedule Confidence</span>
          <ThreeToggle
            options={["Aggressive", "Realistic", "Conservative"] as ScheduleConfidence[]}
            value={input.scheduleConfidence}
            onChange={(v) => onChange("scheduleConfidence", v)}
          />
        </div>
        <NumberInput label="Overhead/Match (min)" value={input.overheadPerMatchMin} onChange={(v) => onChange("overheadPerMatchMin", v)} min={0} max={5} suffix="min" />
        <NumberInput label="Overhead/Tie (min)" value={input.overheadPerTieMin} onChange={(v) => onChange("overheadPerTieMin", v)} min={0} max={10} suffix="min" />
      </CollapsibleSection>

      <CollapsibleSection title="Variance">
        <NumberInput label="Category Variance ±%" value={input.categoryVariancePct} onChange={(v) => onChange("categoryVariancePct", v)} min={0} max={30} suffix="%" />
      </CollapsibleSection>
    </div>
  );
}
