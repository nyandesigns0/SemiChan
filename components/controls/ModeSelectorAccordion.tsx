"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, LayoutGrid } from "lucide-react";
import { ModeSelector, type GraphMode } from "./ModeSelector";

interface ModeSelectorAccordionProps {
  mode: GraphMode;
  onModeChange: (mode: GraphMode) => void;
}

export function ModeSelectorAccordion({ mode, onModeChange }: ModeSelectorAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-violet-50 p-2 text-violet-600">
            <LayoutGrid className="h-5 w-5" />
          </div>
          <span className="font-bold text-slate-800">Visualization Mode</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 p-4">
          <ModeSelector mode={mode} onModeChange={onModeChange} />
        </div>
      )}
    </div>
  );
}

