"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Database, FileText, Hash, Link as LinkIcon, BarChart2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { AnalysisResult } from "@/types/analysis";

interface CorpusSummaryProps {
  analysis: AnalysisResult | null;
  empty: boolean;
}

export function CorpusSummary({ analysis, empty }: CorpusSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (empty || !analysis) return null;

  const stanceSummary = [
    { name: "Praise", value: analysis.stats.stanceCounts.praise, color: "#10b981" },
    { name: "Critique", value: analysis.stats.stanceCounts.critique, color: "#ef4444" },
    { name: "Suggestion", value: analysis.stats.stanceCounts.suggestion, color: "#3b82f6" },
    { name: "Neutral", value: analysis.stats.stanceCounts.neutral, color: "#94a3b8" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
            <BarChart2 className="h-5 w-5" />
          </div>
          <span className="font-bold text-slate-800">Corpus Summary</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-6 border-t border-slate-100 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-100">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <FileText className="h-3 w-3" />
                Sentences
              </div>
              <div className="mt-1 text-xl font-bold text-slate-900">{analysis.stats.totalSentences}</div>
            </div>

            <div className="flex flex-col rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-100">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <Hash className="h-3 w-3" />
                Concepts
              </div>
              <div className="mt-1 text-xl font-bold text-slate-900">{analysis.stats.totalConcepts}</div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-100">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Stance Distribution</div>
              <Badge variant="secondary" className="bg-slate-200/50 text-[9px] font-bold uppercase text-slate-500">
                Heuristic
              </Badge>
            </div>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stanceSummary} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10, fontWeight: 600, fill: "#64748b" }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fontWeight: 600, fill: "#64748b" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: "rgba(241, 245, 249, 0.5)" }}
                    contentStyle={{ 
                      borderRadius: "12px", 
                      border: "none", 
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                      fontSize: "12px",
                      fontWeight: "600"
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {stanceSummary.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

