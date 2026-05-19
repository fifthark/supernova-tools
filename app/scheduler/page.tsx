"use client";

import { useEffect, useMemo, useState } from "react";
import BlocksPanel from "./components/BlocksPanel";
import CategoriesPanel from "./components/CategoriesPanel";
import HeaderChips from "./components/HeaderChips";
import PlanSettingsPanel from "./components/PlanSettingsPanel";
import Timetable from "./components/Timetable";
import { buildT004Plan } from "./defaults";
import { detectClashes } from "./lib/clashDetection";
import { loadOrBuildPlan, savePlan } from "./storage";
import type { Block, Category, Plan } from "./types";

export default function SchedulerPage() {
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    setPlan(loadOrBuildPlan());
  }, []);

  useEffect(() => {
    if (plan) savePlan(plan);
  }, [plan]);

  const courtNumbers = useMemo(() => {
    if (!plan) return [];
    return Array.from({ length: plan.numCourts }, (_, i) => i + 1);
  }, [plan]);

  const clashes = useMemo(() => (plan ? detectClashes(plan.blocks) : []), [plan]);

  if (!plan) {
    return (
      <main className="scheduler-shell">
        <p className="annotation">Loading plan…</p>
      </main>
    );
  }

  const updatePlan = (patch: Partial<Plan>) => {
    setPlan(p => (p ? { ...p, ...patch } : p));
  };

  const addCategory = (c: Category) => {
    setPlan(p => (p ? { ...p, categories: [...p.categories, c] } : p));
  };

  const updateCategory = (c: Category) => {
    setPlan(p =>
      p
        ? { ...p, categories: p.categories.map(x => (x.id === c.id ? c : x)) }
        : p,
    );
  };

  const deleteCategory = (id: string) => {
    setPlan(p =>
      p
        ? {
            ...p,
            categories: p.categories.filter(c => c.id !== id),
            blocks: p.blocks.map(b => ({
              ...b,
              selectedCategoryIds: b.selectedCategoryIds.filter(x => x !== id),
            })),
          }
        : p,
    );
  };

  const duplicateCategory = (id: string) => {
    setPlan(p => {
      if (!p) return p;
      const src = p.categories.find(c => c.id === id);
      if (!src) return p;
      const copy: Category = {
        ...src,
        id: crypto.randomUUID(),
        name: `${src.name} (copy)`,
      };
      return { ...p, categories: [...p.categories, copy] };
    });
  };

  const addBlock = (b: Block) => {
    setPlan(p => (p ? { ...p, blocks: [...p.blocks, b] } : p));
  };

  const updateBlock = (b: Block) => {
    setPlan(p =>
      p ? { ...p, blocks: p.blocks.map(x => (x.id === b.id ? b : x)) } : p,
    );
  };

  const deleteBlock = (id: string) => {
    setPlan(p => (p ? { ...p, blocks: p.blocks.filter(b => b.id !== id) } : p));
  };

  const duplicateBlock = (id: string) => {
    setPlan(p => {
      if (!p) return p;
      const src = p.blocks.find(b => b.id === id);
      if (!src) return p;
      const copy: Block = {
        ...src,
        id: crypto.randomUUID(),
        label: `${src.label} (copy)`,
        courts: [...src.courts],
        selectedCategoryIds: [...src.selectedCategoryIds],
      };
      return { ...p, blocks: [...p.blocks, copy] };
    });
  };

  const resetToDefaults = () => {
    setPlan(buildT004Plan());
  };

  return (
    <main className="scheduler-shell">
      <PlanSettingsPanel
        plan={plan}
        onUpdate={updatePlan}
        onReset={resetToDefaults}
      />

      <HeaderChips blocks={plan.blocks} clashCount={clashes.length} />

      <div className="scheduler-two-col">
        <CategoriesPanel
          categories={plan.categories}
          onAdd={addCategory}
          onUpdate={updateCategory}
          onDelete={deleteCategory}
          onDuplicate={duplicateCategory}
        />
        <BlocksPanel
          blocks={plan.blocks}
          categories={plan.categories}
          courtNumbers={courtNumbers}
          clashes={clashes}
          onAdd={addBlock}
          onUpdate={updateBlock}
          onDelete={deleteBlock}
          onDuplicate={duplicateBlock}
        />
      </div>

      <Timetable
        plan={plan}
        blocks={plan.blocks}
        categories={plan.categories}
        courtNumbers={courtNumbers}
        clashes={clashes}
      />
    </main>
  );
}
