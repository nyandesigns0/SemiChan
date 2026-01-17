"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Navigation, Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnchorAxesList } from "./AnchorAxesList";
import type { AnchorAxis as AnchorAxisType } from "@/types/anchor-axes";

interface AnchoredAxesAccordionProps {
  axes: AnchorAxisType[];
  onAxesChange: (axes: AnchorAxisType[]) => void;
  onOpenModal: () => void;
}

export function AnchoredAxesAccordion({ axes, onAxesChange, onOpenModal }: AnchoredAxesAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAxes, setShowAxes] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 ring-1 ring-indigo-100/50">
            <Navigation className="h-5 w-5" />
          </div>
          <span className="font-bold text-slate-800">Anchored Axes</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 p-3 pt-2 space-y-3">
          <Button
            onClick={onOpenModal}
            className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition-all hover:shadow-md py-2.5"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Axis
          </Button>

          <div className="space-y-2">
            <button
              onClick={() => setShowAxes(!showAxes)}
              className="flex w-full items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-500 transition-colors py-0.5 px-1 border-b border-dashed border-slate-200"
            >
              <div className="flex items-center gap-1.5">
                <Settings2 className="h-3 w-3" />
                Review & Tune Axes
              </div>
              {showAxes ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showAxes && (
              <div className="pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-2.5">
                  <AnchorAxesList axes={axes} onChange={onAxesChange} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
