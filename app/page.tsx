"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import type { TournamentInput, SavedScenario } from "@/lib/calc/types";
import { DEFAULT_INPUT, DOUBLES_PRESET, SQUAD_PRESET } from "@/lib/calc/constants";
import { computeTournament } from "@/lib/calc/engine";
import { runScanner } from "@/lib/calc/scanner";
import { InputPanel } from "@/components/inputs/InputPanel";
import { ProfitHero } from "@/components/outputs/ProfitHero";
import { MetricsGrid } from "@/components/outputs/MetricsGrid";
import { CostBreakdown } from "@/components/outputs/CostBreakdown";
import { RevenueFlow } from "@/components/outputs/RevenueFlow";
import { ScheduleInfo } from "@/components/outputs/ScheduleInfo";
import { QuickWins } from "@/components/outputs/QuickWins";
import { AIAnalysis } from "@/components/outputs/AIAnalysis";
import { CostDonut } from "@/components/charts/CostDonut";
import { RevenueWaterfall } from "@/components/charts/RevenueWaterfall";
import { ProfitMarginBar } from "@/components/charts/ProfitMarginBar";
import { CostStackedBar } from "@/components/charts/CostStackedBar";
import { ScenarioManager } from "@/components/scenarios/ScenarioManager";

type Format = "Doubles" | "Squad Battle";

const STORAGE_KEY = "supernova-scenarios";

function loadSaved(): SavedScenario[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSaved(scenarios: SavedScenario[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scenarios));
}

export default function Home() {
  const [format, setFormat] = useState<Format>("Squad Battle");
  const [input, setInput] = useState<TournamentInput>(DEFAULT_INPUT);
  const [saved, setSaved] = useState<SavedScenario[]>([]);

  // Load saved scenarios from localStorage on mount
  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  const result = useMemo(() => computeTournament(input), [input]);
  const suggestions = useMemo(() => runScanner(input), [input]);

  const handleChange = useCallback(
    <K extends keyof TournamentInput>(key: K, value: TournamentInput[K]) => {
      setInput((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleFormatChange = useCallback((f: Format) => {
    setFormat(f);
    const preset = f === "Doubles" ? DOUBLES_PRESET : SQUAD_PRESET;
    setInput((prev) => ({ ...prev, ...preset }));
  }, []);

  const handleSaveScenario = useCallback((scenario: SavedScenario) => {
    setSaved((prev) => {
      const next = [...prev, scenario].slice(-3);
      saveSaved(next);
      return next;
    });
  }, []);

  const handleDeleteScenario = useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.filter((s) => s.id !== id);
      saveSaved(next);
      return next;
    });
  }, []);

  const handleLoadScenario = useCallback((scenario: SavedScenario) => {
    setInput(scenario.inputs);
    const isDoubles = scenario.inputs.playersPerTeam === 2;
    setFormat(isDoubles ? "Doubles" : "Squad Battle");
  }, []);

  const currentLabel = `${format} — ${result.totalPools}p`;

  return (
    <div className="app-container">
      <InputPanel
        input={input}
        format={format}
        onFormatChange={handleFormatChange}
        onChange={handleChange}
      />

      <div className="output-panel">
        <div className="profit-hero-sticky">
          <ProfitHero result={result} variancePct={input.categoryVariancePct} />
        </div>

        <QuickWins suggestions={suggestions} />
        <MetricsGrid result={result} input={input} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <RevenueFlow result={result} />
          <CostBreakdown result={result} />
        </div>

        <CostDonut result={result} />
        <ScheduleInfo result={result} />
        <RevenueWaterfall result={result} />

        <div style={{ marginTop: 24 }}>
          <ScenarioManager
            inputs={input}
            result={result}
            format={format}
            saved={saved}
            onSave={handleSaveScenario}
            onDelete={handleDeleteScenario}
            onLoad={handleLoadScenario}
          />
        </div>

        {saved.length >= 1 && (
          <>
            <ProfitMarginBar
              current={{ label: currentLabel, result }}
              saved={saved}
            />
            <CostStackedBar
              current={{ label: currentLabel, result }}
              saved={saved}
            />
          </>
        )}

        <AIAnalysis inputs={input} result={result} topSuggestions={suggestions} />
      </div>
    </div>
  );
}
