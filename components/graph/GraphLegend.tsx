"use client";

import { Badge } from "@/components/ui/badge";
import type { Stance } from "@/types/nlp";

function stanceColor(s?: Stance): string {
  switch (s) {
    case "praise":
      return "#16a34a";
    case "critique":
      return "#dc2626";
    case "suggestion":
      return "#f59e0b";
    default:
      return "#64748b";
  }
}

export function GraphLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-700">
      <Badge variant="secondary" className="font-normal">
        Legend
      </Badge>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full" style={{ background: stanceColor("praise") }} /> Praise
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full" style={{ background: stanceColor("critique") }} /> Critique
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full" style={{ background: stanceColor("suggestion") }} /> Suggestion
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-2 w-2 rounded-full" style={{ background: stanceColor("neutral") }} /> Neutral
      </span>
    </div>
  );
}

