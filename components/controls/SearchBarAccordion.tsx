"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Search as SearchIcon } from "lucide-react";
import { SearchBar } from "./SearchBar";

interface SearchBarAccordionProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBarAccordion({ value, onChange }: SearchBarAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-cyan-50 p-2 text-cyan-600">
            <SearchIcon className="h-5 w-5" />
          </div>
          <span className="font-bold text-slate-800">Search</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 p-4">
          <SearchBar value={value} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

