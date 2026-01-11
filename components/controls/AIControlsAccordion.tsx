"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, BrainCircuit } from "lucide-react";
import { AIControls } from "./AIControls";

interface AIControlsAccordionProps {
  enableAxisLabelAI: boolean;
  onToggleAxisLabelAI: (enabled: boolean) => void;
  autoSynthesize: boolean;
  onToggleAutoSynthesize: (enabled: boolean) => void;
}

export function AIControlsAccordion({
  enableAxisLabelAI,
  onToggleAxisLabelAI,
  autoSynthesize,
  onToggleAutoSynthesize,
}: AIControlsAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-50 p-2 text-purple-600 ring-1 ring-purple-100/50">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <span className="font-bold text-slate-800">AI Controls</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 p-4">
          <AIControls
            enableAxisLabelAI={enableAxisLabelAI}
            onToggleAxisLabelAI={onToggleAxisLabelAI}
            autoSynthesize={autoSynthesize}
            onToggleAutoSynthesize={onToggleAutoSynthesize}
          />
        </div>
      )}
    </div>
  );
}
