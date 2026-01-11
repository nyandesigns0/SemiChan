"use client";

import { Badge } from "@/components/ui/badge";
import { Users, MessageSquare, Lightbulb, Hash, Link as LinkIcon, Layers, Activity } from "lucide-react";
import { formatCostReadable } from "@/lib/utils/api-utils";
import type { Stance } from "@/types/nlp";
import type { AnalysisResult } from "@/types/analysis";

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

interface GraphLegendProps {
  analysis?: AnalysisResult | null;
  filteredNodesCount?: number;
  filteredLinksCount?: number;
  numDimensions?: number;
  apiCallCount?: number;
  apiCostTotal?: number;
}

export function GraphLegend({ 
  analysis, 
  filteredNodesCount = 0, 
  filteredLinksCount = 0,
  numDimensions = 3,
  apiCallCount = 0,
  apiCostTotal = 0
}: GraphLegendProps) {
  const { amount: formattedCost, unit: costUnit } = formatCostReadable(apiCostTotal);

  return (
    <div className="mt-3 flex items-center justify-between gap-4 text-xs text-slate-700">
      {/* Legend on the left */}
      <div className="flex flex-wrap items-center gap-2">
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
      
      {/* Stats badges on the right */}
      <div className="flex flex-wrap items-center gap-2">
        {analysis && (
          <>
            <Badge variant="outline" className="flex items-center gap-1.5 border-slate-200 bg-white px-3 py-1 text-slate-500 shadow-sm">
              <Users className="h-3.5 w-3.5" />
              <span>{analysis.stats.totalJurors} jurors</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1.5 border-slate-200 bg-white px-3 py-1 text-slate-500 shadow-sm">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{analysis.stats.totalSentences} sentences processed</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1.5 border-slate-200 bg-white px-3 py-1 text-slate-500 shadow-sm">
              <Lightbulb className="h-3.5 w-3.5" />
              <span>{analysis.stats.totalConcepts} concepts found</span>
            </Badge>
          <div className="mx-1 h-6 w-px bg-slate-200" />
          </>
        )}
        <Badge variant="outline" className="flex items-center gap-1.5 border-slate-200 bg-white px-3 py-1 text-slate-500 shadow-sm">
          <Layers className="h-3.5 w-3.5" />
          <span>{numDimensions} axes</span>
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1.5 border-slate-200 bg-white px-3 py-1 text-slate-500 shadow-sm">
          <Activity className="h-3.5 w-3.5" />
          <div className="flex items-center gap-1.5">
            <span>{apiCallCount} calls</span>
            <span className="h-4 w-px bg-slate-200" />
            <span>{formattedCost} {costUnit}</span>
          </div>
        </Badge>
        <Badge variant="secondary" className="flex items-center gap-1.5 border border-indigo-100 bg-indigo-50 px-3 py-1 text-indigo-700">
          <Hash className="h-3.5 w-3.5" />
          <span>{filteredNodesCount} Nodes</span>
        </Badge>
        <Badge variant="secondary" className="flex items-center gap-1.5 border border-emerald-100 bg-emerald-50 px-3 py-1 text-emerald-700">
          <LinkIcon className="h-3.5 w-3.5" />
          <span>{filteredLinksCount} Edges ({analysis?.links.length || 0} total)</span>
        </Badge>
      </div>
    </div>
  );
}
