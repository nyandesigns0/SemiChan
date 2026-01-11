"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BarChart2, Compass, Layers, Users, Sparkles, CircleDot, RefreshCw, ListFilter, Filter } from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";
import type { JurorBlock } from "@/types/nlp";
import type { ConceptInsight } from "@/hooks/useConceptSummarizer";
import { getPCColor, lightenColor, getAxisColors } from "@/lib/utils/graph-color-utils";

interface AnalysisReportProps {
  analysis: AnalysisResult | null;
  jurorBlocks: JurorBlock[];
  axisLabels?: AnalysisResult["axisLabels"];
  enableAxisLabelAI?: boolean;
  isRefreshingAxisLabels?: boolean;
  insights?: Record<string, ConceptInsight>;
}

function formatPercent(value: number | undefined, digits = 1): string {
  if (value === undefined || Number.isNaN(value)) return "0%";
  return `${(value * 100).toFixed(digits)}%`;
}

export function AnalysisReport({ analysis, jurorBlocks, axisLabels, enableAxisLabelAI, isRefreshingAxisLabels = false, insights }: AnalysisReportProps) {
  const sentencesByJuror = useMemo(() => {
    if (!analysis) return new Map<string, number>();
    const counts = new Map<string, number>();
    analysis.sentences.forEach((s) => {
      counts.set(s.juror, (counts.get(s.juror) ?? 0) + 1);
    });
    return counts;
  }, [analysis]);

  const conceptLabelMap = useMemo(() => {
    if (!analysis) return new Map<string, { label: string; ai: boolean; loading?: boolean }>();
    return new Map(
      analysis.concepts.map((c) => {
        const insight = insights?.[c.id];
        return [
          c.id,
          { label: insight?.shortLabel || c.label, ai: Boolean(insight?.shortLabel), loading: insight?.isLoadingLabel },
        ];
      })
    );
  }, [analysis, insights]);

  const conceptColors = useMemo(() => {
    if (!analysis) return new Map<string, { base: string; soft: string }>();
    const map = new Map<string, { base: string; soft: string }>();
    analysis.nodes
      .filter((n) => n.type === "concept")
      .forEach((n) => {
        const base = getPCColor(n.pcValues, "#4f46e5");
        const soft = lightenColor(base, 0.8);
        map.set(n.id, { base, soft });
      });
    return map;
  }, [analysis]);

  const conceptWeights = useMemo(() => {
    if (!analysis) return new Map<string, number>();
    const map = new Map<string, number>();
    analysis.nodes
      .filter((n) => n.type === "concept")
      .forEach((n) => {
        const weight = typeof (n.meta as any)?.weight === "number" ? (n.meta as any).weight : 0;
        map.set(n.id, weight);
      });
    return map;
  }, [analysis]);

  const conceptJurorDistribution = useMemo(() => {
    if (!analysis) return new Map<string, Array<{ juror: string; weight: number }>>();
    return new Map(
      analysis.nodes
        .filter((n) => n.type === "concept" && Array.isArray((n.meta as any)?.jurorDistribution))
        .map((n) => [n.id, (n.meta as any).jurorDistribution as Array<{ juror: string; weight: number }>])
    );
  }, [analysis]);

  const [conceptSort, setConceptSort] = useState<"weight" | "alpha" | "juror" | "ai">("weight");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [conceptLimit, setConceptLimit] = useState<"5" | "10" | "all">("all");
  const [limitMenuOpen, setLimitMenuOpen] = useState(false);

  const sortedConcepts = useMemo(() => {
    if (!analysis) return [];
    const base = [...analysis.concepts];
    const byWeight = (id: string) => conceptWeights.get(id) ?? 0;
    const jurorCounts = (id: string) => (conceptJurorDistribution.get(id) || []).length;
    const hasAi = (id: string) => Boolean(insights?.[id]?.shortLabel);

    return base.sort((a, b) => {
      switch (conceptSort) {
        case "alpha":
          return (a.label || "").localeCompare(b.label || "");
        case "juror":
          return jurorCounts(b.id) - jurorCounts(a.id);
        case "ai":
          return Number(hasAi(b.id)) - Number(hasAi(a.id)) || byWeight(b.id) - byWeight(a.id);
        case "weight":
        default:
          return byWeight(b.id) - byWeight(a.id);
      }
    });
  }, [analysis, conceptWeights, conceptJurorDistribution, insights, conceptSort]);

  const visibleConcepts = useMemo(() => {
    switch (conceptLimit) {
      case "5":
        return sortedConcepts.slice(0, 5);
      case "10":
        return sortedConcepts.slice(0, 10);
      case "all":
      default:
        return sortedConcepts;
    }
  }, [sortedConcepts, conceptLimit]);

  if (!analysis) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
        <div className="text-center text-slate-500">
          <p className="text-sm font-semibold">Run an analysis to see the report.</p>
          <p className="text-xs">Results will summarize jurors, dimensions, concepts, and stance distribution.</p>
        </div>
      </div>
    );
  }

  const stanceCounts = analysis.stats.stanceCounts;
  const stanceTotal =
    stanceCounts.praise + stanceCounts.critique + stanceCounts.suggestion + stanceCounts.neutral || 1;

  const effectiveAxisLabels = axisLabels || analysis.axisLabels;

  const axisKeys = Object.keys(effectiveAxisLabels || {});
  const orderedAxes = axisKeys
    .map((key, idx) => {
      const parsed = Number.parseInt(key, 10);
      const axisIndex = Number.isFinite(parsed) ? parsed : idx;
      return { key, axisIndex, originalIndex: idx };
    })
    .sort((a, b) => (a.axisIndex - b.axisIndex) || (a.originalIndex - b.originalIndex));
  const axisColorList = useMemo(
    () => getAxisColors(Math.max(orderedAxes.length || 3, 3)),
    [orderedAxes.length]
  );

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      {/* Corpus Summary pinned to top, compact rows */}
      <div className="rounded-2xl border border-slate-200 bg-slate-900 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-white/10 text-white">
              Corpus Summary
            </Badge>
            <span className="text-sm font-semibold text-white/80">Volume & stance mix</span>
          </div>
          <BarChart2 className="h-4 w-4 text-white/60" />
        </div>
        <div className="grid grid-cols-1 gap-3 border-b border-white/10 px-5 py-4 md:grid-cols-8">
          {[
            { label: "Sentences", value: analysis.stats.totalSentences },
            { label: "Concepts", value: analysis.stats.totalConcepts },
            { label: "Jurors", value: analysis.stats.totalJurors },
            { label: "Source Files", value: jurorBlocks.length },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white/5 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">{item.label}</div>
              <div className="mt-1 text-2xl font-black text-white">{item.value}</div>
            </div>
          ))}
          {(
            [
              { key: "praise", label: "Praise", color: "bg-emerald-400" },
              { key: "critique", label: "Critique", color: "bg-rose-400" },
              { key: "suggestion", label: "Suggestion", color: "bg-blue-400" },
              { key: "neutral", label: "Neutral", color: "bg-slate-300" },
            ] as const
          ).map(({ key, label, color }) => {
            const count = stanceCounts[key] || 0;
            const share = stanceTotal > 0 ? Math.max(0.02, count / stanceTotal) : 0;
            return (
              <div key={key} className="rounded-xl bg-white/5 p-3">
                <div className="flex items-center justify-between text-[11px] font-semibold text-white/80">
                  <span>{label}</span>
                  <span>
                    {count} ({formatPercent(stanceTotal > 0 ? count / stanceTotal : 0, 0)})
                  </span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-white/10">
                  <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(100, share * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Three-column layout: Juror, Dimension, Concept */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Juror Analysis */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">
                Juror Analysis
              </Badge>
              <span className="text-xs font-semibold text-slate-500">Raw terms vs concept pull</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-slate-200 bg-white text-[11px] font-semibold text-slate-600">
                {analysis.stats.totalJurors} jurors
              </Badge>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
          </div>
          <div className="space-y-3">
            {analysis.jurors.map((juror) => {
              const rawTerms = analysis.jurorTopTerms?.[juror] || [];
              const vector = analysis.jurorVectors[juror] || {};
              const conceptWeights = Object.entries(vector)
                .filter(([, w]) => w > 0)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);
              const sentences = sentencesByJuror.get(juror) ?? 0;
              const conceptCoverage = Object.keys(vector).length;

              return (
                <div
                  key={juror}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-900">{juror}</div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>{sentences} sentences</span>
                      <span className="h-3 w-px bg-slate-200" />
                      <span>{conceptCoverage} concept links</span>
                    </div>
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Top raw terms</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {rawTerms.slice(0, 6).map((term) => (
                      <Badge key={term} variant="outline" className="border-slate-200 bg-white text-[11px] font-semibold">
                        {term}
                      </Badge>
                    ))}
                    {rawTerms.length === 0 && <span className="text-[11px] text-slate-400">No terms extracted</span>}
                  </div>
                  <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Concept affinity
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {conceptWeights.map(([id, weight]) => {
                      const labelInfo = conceptLabelMap.get(id);
                      const colors = conceptColors.get(id);
                      return (
                        <Badge
                          key={id}
                          variant="secondary"
                          className="text-indigo-900"
                          style={{
                            backgroundColor: colors?.soft ?? "#eef2ff",
                            color: colors?.base ?? "#312e81",
                            borderColor: colors?.base ?? "transparent",
                            borderWidth: "1px",
                          }}
                        >
                          <span
                            className="mr-1 inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: colors?.base ?? "#312e81" }}
                          />
                          {labelInfo?.label || id} • {formatPercent(weight)}
                          {labelInfo?.ai && (
                            <Badge variant="outline" className="ml-2 border-white/60 bg-white/50 text-[9px] font-semibold" style={{ color: colors?.base ?? "#312e81" }}>
                              AI
                            </Badge>
                          )}
                          {labelInfo?.loading && !labelInfo.ai && (
                            <Badge variant="outline" className="ml-2 border-white/60 bg-white/50 text-[9px] font-semibold text-slate-600">
                              Labeling…
                            </Badge>
                          )}
                        </Badge>
                      );
                    })}
                    {conceptWeights.length === 0 && (
                      <span className="text-[11px] text-slate-400">No concept weights available</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dimension Analysis */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-amber-50 text-amber-700">
                Dimension Analysis
              </Badge>
              <span className="text-xs font-semibold text-slate-500">Why points sit where they do</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500">
              {enableAxisLabelAI && (
                <Badge variant="outline" className="border-indigo-100 bg-indigo-50 text-indigo-700">
                  AI labels
                </Badge>
              )}
              {isRefreshingAxisLabels && (
                <div className="flex items-center gap-1 text-xs text-indigo-600">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Updating
                </div>
              )}
              <Layers className="h-4 w-4 text-slate-400" />
            </div>
          </div>
          <div className="space-y-3">
            {orderedAxes.length === 0 && <div className="text-xs text-slate-400">No axis labels available.</div>}
            {orderedAxes.map(({ key: axisKey, axisIndex }) => {
              const axis = effectiveAxisLabels?.[axisKey];
              const explained = analysis.varianceStats?.explainedVariances?.[axisIndex] ?? 0;
              const totalVar = analysis.varianceStats?.totalVariance ?? 0;
              const variance = totalVar > 0 ? explained / totalVar : explained || 0;

              const nodesWithPc = analysis.nodes.filter(
                (n) => Array.isArray(n.pcValues) && n.pcValues && n.pcValues.length > axisIndex
              );
              let min: { label: string; value: number } | null = null;
              let max: { label: string; value: number } | null = null;
              nodesWithPc.forEach((node) => {
                const value = node.pcValues?.[axisIndex] ?? 0;
                if (min === null || value < min.value) min = { label: node.label, value };
                if (max === null || value > max.value) max = { label: node.label, value };
              });

              return (
                <div key={axisKey} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <Compass className="h-4 w-4 text-slate-500" />
                      <Badge
                        variant="outline"
                        className="border text-[11px] font-semibold"
                        style={{
                          borderColor: axisColorList[axisIndex % axisColorList.length],
                          color: axisColorList[axisIndex % axisColorList.length],
                          backgroundColor: lightenColor(axisColorList[axisIndex % axisColorList.length], 0.85),
                        }}
                      >
                        Axis {axisIndex + 1}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="border-slate-200 bg-white text-[11px] font-semibold text-slate-500">
                      {formatPercent(variance)}
                    </Badge>
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Polarity
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-700">
                    <Badge
                      variant="secondary"
                      className="bg-white text-slate-700"
                      style={{
                        backgroundColor: lightenColor(axisColorList[axisIndex % axisColorList.length], 0.9),
                        color: axisColorList[axisIndex % axisColorList.length],
                        borderColor: axisColorList[axisIndex % axisColorList.length],
                        borderWidth: "1px",
                      }}
                    >
                      {axis?.synthesizedNegative || axis?.negative || "Negative"}
                    </Badge>
                    <span className="text-[11px] text-slate-400">vs</span>
                    <Badge
                      variant="secondary"
                      className="bg-white text-slate-700"
                      style={{
                        backgroundColor: lightenColor(axisColorList[axisIndex % axisColorList.length], 0.9),
                        color: axisColorList[axisIndex % axisColorList.length],
                        borderColor: axisColorList[axisIndex % axisColorList.length],
                        borderWidth: "1px",
                      }}
                    >
                      {axis?.synthesizedPositive || axis?.positive || "Positive"}
                    </Badge>
                  </div>
                  <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Extremes
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-700">
                    <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                      Low: {min?.label ?? "–"}
                    </Badge>
                    <Badge variant="outline" className="border-slate-200 bg-white text-slate-600">
                      High: {max?.label ?? "–"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Concept Analysis */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                Concept Analysis
              </Badge>
              <span className="text-xs font-semibold text-slate-500">Juror ownership & evidence</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-slate-200 bg-white text-[11px] font-semibold text-slate-600">
                {analysis.stats.totalConcepts}
              </Badge>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLimitMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
                >
                  <Filter className="h-3.5 w-3.5" />
                  Limit
                </button>
                {limitMenuOpen && (
                  <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                    {[
                      { value: "5", label: "Top 5" },
                      { value: "10", label: "Top 10" },
                      { value: "all", label: "Show all" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setConceptLimit(opt.value as any);
                          setLimitMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12px] font-semibold ${
                          conceptLimit === opt.value ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {conceptLimit === opt.value && <span className="text-[10px] text-indigo-600">•</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setSortMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  Sort
                </button>
                {sortMenuOpen && (
                  <div className="absolute right-0 top-8 z-10 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                    {[
                      { value: "weight", label: "Most frequent" },
                      { value: "juror", label: "Juror coverage" },
                      { value: "ai", label: "AI label first" },
                      { value: "alpha", label: "Alphabetical" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setConceptSort(opt.value as any);
                          setSortMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12px] font-semibold ${
                          conceptSort === opt.value ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {conceptSort === opt.value && <span className="text-[10px] text-indigo-600">•</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Sparkles className="h-4 w-4 text-slate-400" />
            </div>
          </div>
          <div className="space-y-3">
            {visibleConcepts.map((concept) => {
              const distribution = (conceptJurorDistribution.get(concept.id) || [])
                .slice()
                .sort((a, b) => b.weight - a.weight)
                .slice(0, 3);
              const topSentence = concept.representativeSentences?.[0];
              const conceptInsight = insights?.[concept.id];
              const aiLabel = conceptInsight?.shortLabel;
              const isLoadingLabel = conceptInsight?.isLoadingLabel;

              return (
                <div key={concept.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-sm font-bold text-slate-900">
                      {aiLabel || concept.label}
                      {aiLabel && (
                        <Badge variant="outline" className="ml-2 border-indigo-100 bg-white text-[10px] font-semibold text-indigo-700">
                          AI label
                        </Badge>
                      )}
                      {isLoadingLabel && !aiLabel && (
                        <Badge variant="outline" className="ml-2 border-slate-200 bg-white text-[10px] font-semibold text-slate-500">
                          Labeling…
                        </Badge>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className="border-slate-200 bg-white text-[11px] font-semibold text-slate-500"
                      style={{
                        borderColor: (conceptColors.get(concept.id)?.base ?? "#cbd5e1"),
                        color: conceptColors.get(concept.id)?.base ?? "#334155",
                        backgroundColor: conceptColors.get(concept.id)?.soft ?? "#f8fafc",
                      }}
                    >
                      <span
                        className="mr-1 inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: conceptColors.get(concept.id)?.base ?? "#334155" }}
                      />
                      {concept.topTerms.slice(0, 3).join(" • ")}
                    </Badge>
                  </div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Juror attribution
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {distribution.length > 0 ? (
                      distribution.map((entry) => {
                        const colors = conceptColors.get(concept.id);
                        return (
                          <Badge
                            key={entry.juror}
                            variant="secondary"
                            className="bg-white text-slate-700"
                            style={{
                              backgroundColor: colors?.soft ?? "#f8fafc",
                              color: colors?.base ?? "#334155",
                              borderColor: colors?.base ?? "transparent",
                              borderWidth: "1px",
                            }}
                          >
                            <span
                              className="mr-1 inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: colors?.base ?? "#334155" }}
                            />
                            {entry.juror} • {formatPercent(entry.weight)}
                          </Badge>
                        );
                      })
                    ) : (
                      <span className="text-[11px] text-slate-400">No juror distribution available</span>
                    )}
                  </div>
                  {topSentence && (
                    <div className="mt-2 rounded-lg border border-slate-100 bg-white/80 p-2 text-xs text-slate-600">
                      <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                        <CircleDot className="h-3 w-3" />
                        Evidence
                      </div>
                      “{topSentence}”
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
