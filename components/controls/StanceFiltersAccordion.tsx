"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import { StanceFilters } from "./StanceFilters";

interface StanceFiltersAccordionProps {
  showPraise: boolean;
  showCritique: boolean;
  showSuggestion: boolean;
  showNeutral: boolean;
  onShowPraiseChange: (value: boolean) => void;
  onShowCritiqueChange: (value: boolean) => void;
  onShowSuggestionChange: (value: boolean) => void;
  onShowNeutralChange: (value: boolean) => void;
}

export function StanceFiltersAccordion({
  showPraise,
  showCritique,
  showSuggestion,
  showNeutral,
  onShowPraiseChange,
  onShowCritiqueChange,
  onShowSuggestionChange,
  onShowNeutralChange,
}: StanceFiltersAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-orange-50 p-2 text-orange-600">
            <Filter className="h-5 w-5" />
          </div>
          <span className="font-bold text-slate-800">Filters</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 p-4">
          <StanceFilters
            showPraise={showPraise}
            showCritique={showCritique}
            showSuggestion={showSuggestion}
            showNeutral={showNeutral}
            onShowPraiseChange={onShowPraiseChange}
            onShowCritiqueChange={onShowCritiqueChange}
            onShowSuggestionChange={onShowSuggestionChange}
            onShowNeutralChange={onShowNeutralChange}
          />
        </div>
      )}
    </div>
  );
}

