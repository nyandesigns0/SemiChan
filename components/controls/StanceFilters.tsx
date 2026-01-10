"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils/cn";

interface StanceFiltersProps {
  showPraise: boolean;
  showCritique: boolean;
  showSuggestion: boolean;
  showNeutral: boolean;
  onShowPraiseChange: (value: boolean) => void;
  onShowCritiqueChange: (value: boolean) => void;
  onShowSuggestionChange: (value: boolean) => void;
  onShowNeutralChange: (value: boolean) => void;
}

export function StanceFilters({
  showPraise,
  showCritique,
  showSuggestion,
  showNeutral,
  onShowPraiseChange,
  onShowCritiqueChange,
  onShowSuggestionChange,
  onShowNeutralChange,
}: StanceFiltersProps) {
  const filters = [
    { label: "Praise", checked: showPraise, onChange: onShowPraiseChange, color: "bg-emerald-500" },
    { label: "Critique", checked: showCritique, onChange: onShowCritiqueChange, color: "bg-red-500" },
    { label: "Suggestion", checked: showSuggestion, onChange: onShowSuggestionChange, color: "bg-blue-500" },
    { label: "Neutral", checked: showNeutral, onChange: onShowNeutralChange, color: "bg-slate-400" },
  ];

  return (
    <div className="grid grid-cols-1 gap-2">
      {filters.map((filter) => (
        <div
          key={filter.label}
          className={cn(
            "flex items-center justify-between rounded-2xl border-2 px-4 py-3 transition-all",
            filter.checked 
              ? "border-indigo-500/30 bg-white shadow-md ring-1 ring-indigo-500/10" 
              : "border-transparent bg-slate-50/50 opacity-60 hover:opacity-100 hover:bg-slate-50"
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn("h-2.5 w-2.5 rounded-full", filter.color)} />
            <Label className="text-sm font-bold text-slate-700">{filter.label}</Label>
          </div>
          <Switch checked={filter.checked} onCheckedChange={filter.onChange} />
        </div>
      ))}
    </div>
  );
}

