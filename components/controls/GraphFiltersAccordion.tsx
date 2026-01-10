"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, LayoutGrid } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";

interface GraphFiltersAccordionProps {
  adaptiveMode: boolean;
  onAdaptiveModeChange: (value: boolean) => void;
  showJurorNodes: boolean;
  showConceptNodes: boolean;
  showJurorConceptLinks: boolean;
  showJurorJurorLinks: boolean;
  showConceptConceptLinks: boolean;
  showPraise: boolean;
  showCritique: boolean;
  showSuggestion: boolean;
  showNeutral: boolean;
  onShowJurorNodesChange: (value: boolean) => void;
  onShowConceptNodesChange: (value: boolean) => void;
  onShowJurorConceptLinksChange: (value: boolean) => void;
  onShowJurorJurorLinksChange: (value: boolean) => void;
  onShowConceptConceptLinksChange: (value: boolean) => void;
  onShowPraiseChange: (value: boolean) => void;
  onShowCritiqueChange: (value: boolean) => void;
  onShowSuggestionChange: (value: boolean) => void;
  onShowNeutralChange: (value: boolean) => void;
}

export function GraphFiltersAccordion({
  adaptiveMode,
  onAdaptiveModeChange,
  showJurorNodes,
  showConceptNodes,
  showJurorConceptLinks,
  showJurorJurorLinks,
  showConceptConceptLinks,
  showPraise,
  showCritique,
  showSuggestion,
  showNeutral,
  onShowJurorNodesChange,
  onShowConceptNodesChange,
  onShowJurorConceptLinksChange,
  onShowJurorJurorLinksChange,
  onShowConceptConceptLinksChange,
  onShowPraiseChange,
  onShowCritiqueChange,
  onShowSuggestionChange,
  onShowNeutralChange,
}: GraphFiltersAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const nodeFilters = [
    { label: "Juror Nodes", checked: showJurorNodes, onChange: onShowJurorNodesChange },
    { label: "Concept Nodes", checked: showConceptNodes, onChange: onShowConceptNodesChange },
  ];

  const linkFilters = [
    { label: "Juror-Concept Links", checked: showJurorConceptLinks, onChange: onShowJurorConceptLinksChange },
    { label: "Juror-Juror Links", checked: showJurorJurorLinks, onChange: onShowJurorJurorLinksChange },
    { label: "Concept-Concept Links", checked: showConceptConceptLinks, onChange: onShowConceptConceptLinksChange },
  ];

  const stanceFilters = [
    { label: "Praise", checked: showPraise, onChange: onShowPraiseChange, color: "bg-emerald-500" },
    { label: "Critique", checked: showCritique, onChange: onShowCritiqueChange, color: "bg-red-500" },
    { label: "Suggestion", checked: showSuggestion, onChange: onShowSuggestionChange, color: "bg-amber-500" },
    { label: "Neutral", checked: showNeutral, onChange: onShowNeutralChange, color: "bg-slate-400" },
  ];

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
          <span className="font-bold text-slate-800">Graph Filters</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 p-4">
          {/* Adaptive Toggle - Full Width */}
          <div
            className={cn(
              "mb-4 flex items-center justify-between rounded-xl border-2 px-4 py-3 transition-all",
              adaptiveMode ? "border-slate-100 bg-white shadow-sm" : "border-transparent bg-slate-50 opacity-60"
            )}
          >
            <Label className="text-sm font-bold text-slate-700">Adaptive Toggle</Label>
            <Switch checked={adaptiveMode} onCheckedChange={onAdaptiveModeChange} />
          </div>

          {/* Separator */}
          <div className="mb-4 space-y-3">
            <div className="border-b border-slate-200" />
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              {adaptiveMode ? "Adaptive Filters" : "Complete Filters"}
            </h3>
          </div>

          {/* Manual Toggles - Two Column Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {/* Node Type Filters */}
            {nodeFilters.map((filter) => (
              <div
                key={filter.label}
                className={cn(
                  "flex items-center justify-between rounded-xl border-2 px-3 py-2 transition-all",
                  filter.checked ? "border-slate-100 bg-white shadow-sm" : "border-transparent bg-slate-50 opacity-60"
                )}
              >
                <Label className="text-xs font-bold text-slate-700">{filter.label}</Label>
                <Switch checked={filter.checked} onCheckedChange={filter.onChange} />
              </div>
            ))}

            {/* Link Type Filters */}
            {linkFilters.map((filter) => (
              <div
                key={filter.label}
                className={cn(
                  "flex items-center justify-between rounded-xl border-2 px-3 py-2 transition-all",
                  filter.checked ? "border-slate-100 bg-white shadow-sm" : "border-transparent bg-slate-50 opacity-60"
                )}
              >
                <Label className="text-xs font-bold text-slate-700">{filter.label}</Label>
                <Switch checked={filter.checked} onCheckedChange={filter.onChange} />
              </div>
            ))}

            {/* Stance Filters */}
            {stanceFilters.map((filter) => (
              <div
                key={filter.label}
                className={cn(
                  "flex items-center justify-between rounded-xl border-2 px-3 py-2 transition-all",
                  filter.checked ? "border-slate-100 bg-white shadow-sm" : "border-transparent bg-slate-50 opacity-60"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn("h-2 w-2 rounded-full", filter.color)} />
                  <Label className="text-xs font-bold text-slate-700">{filter.label}</Label>
                </div>
                <Switch checked={filter.checked} onCheckedChange={filter.onChange} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

