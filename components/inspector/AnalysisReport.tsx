"use client";

import React, { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { BarChart2, Layers, Users, Sparkles, CircleDot, RefreshCw, ListFilter, Filter, Plus, Minus, ChevronDown, ChevronUp } from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";
import type { JurorBlock } from "@/types/nlp";
import type { ConceptInsight } from "@/hooks/useConceptSummarizer";
import type { GraphNode } from "@/types/graph";
import { getPCColor, lightenColor, getAxisColors } from "@/lib/utils/graph-color-utils";
import { extractKeyphrases } from "@/lib/nlp/keyphrase-extractor";
import { resolveInsightLabel } from "@/lib/utils/label-utils";
import type { RawDataExportContext } from "./export-types";

type AxisPlotDatum = {
  axisIndex: number;
  key: string;
  positive?: string;
  negative?: string;
  value: number; // normalized [-1, 1]
  raw: number;
  color?: string;
};

function AxisAffinityChart({
  axes,
  color,
  scale = 1,
}: {
  axes: AxisPlotDatum[];
  color: string;
  scale?: number;
}) {
  const [hoveredAxisKey, setHoveredAxisKey] = useState<string | null>(null);
  const dotBaseSize = 18;
  const dotHoverSize = dotBaseSize + 4;
  const formatAxisPolarity = (axis: AxisPlotDatum) => {
    const negativeLabel = axis.negative?.trim() || "Negative";
    const positiveLabel = axis.positive?.trim() || "Positive";
    return `Negative: ${negativeLabel} | Positive: ${positiveLabel}`;
  };
  const getLuminanceFromHex = (hex: string) => {
    const cleaned = hex.replace(/^#/, "");
    const normalized = cleaned.length === 3
      ? cleaned.split("").map((c) => c + c).join("")
      : cleaned;
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return 0;
    const bigint = parseInt(normalized, 16);
    const r = ((bigint >> 16) & 255) / 255;
    const g = ((bigint >> 8) & 255) / 255;
    const b = (bigint & 255) / 255;
    const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return luminance;
  };
  const getSymbolColor = (axisColor?: string) => {
    if (!axisColor) return "#000";
    const luminance = getLuminanceFromHex(axisColor);
    return luminance < 0.5 ? "#fff" : "#000";
  };

  if (axes.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white text-slate-400">
        <p className="text-xs font-semibold">Axis data unavailable.</p>
        <p className="text-[11px]">Run analysis with axis labels to view this chart.</p>
      </div>
    );
  }

  const size = 220;
  const center = size / 2;
  const baseRadius = size * 0.38; // for labels (kept stable)
  const radius = baseRadius * scale; // for geometry (zoomable)
  const startAngle = -Math.PI / 2;
  const angleStep = (Math.PI * 2) / axes.length;

  const labelDistance = baseRadius + 22;
  const points = axes.map((axis, idx) => {
    const angle = startAngle + angleStep * idx;
    const x = center + Math.cos(angle) * radius * axis.value;
    const y = center + Math.sin(angle) * radius * axis.value;
    const posX = center + Math.cos(angle) * labelDistance;
    const posY = center + Math.sin(angle) * labelDistance;
    return {
      axis,
      angle,
      x,
      y,
      posX,
      posY,
    };
  });

  const polygonPoints = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

  const renderShape =
    axes.length >= 3 ? (
      <polygon
        points={polygonPoints}
        fill={`${color}22`}
        stroke={color}
        strokeWidth={2}
        className="transition-all duration-200"
      />
    ) : (
      <polyline
        points={polygonPoints}
        fill="none"
        stroke={color}
        strokeWidth={2}
        className="transition-all duration-200"
      />
    );

  return (
    <div className="relative h-[200px] w-full">
      <svg viewBox={`0 0 ${size} ${size}`} className="axis-affinity-chart absolute inset-0 h-full w-full">
        {[0.5, 1].map((r) => (
          <circle
            key={r}
            cx={center}
            cy={center}
            r={radius * r}
            fill="none"
            stroke="#e2e8f0"
            strokeDasharray="4 4"
            strokeWidth={1}
            opacity={r === 1 ? 0.6 : 0.35}
          />
        ))}
        {points.map((p) => (
          <line key={`axis-line-${p.axis.key}`} x1={center} y1={center} x2={center + Math.cos(p.angle) * radius} y2={center + Math.sin(p.angle) * radius} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="2 2" />
        ))}
        <circle cx={center} cy={center} r={3} fill="#94a3b8" />
          {renderShape}
          {points.map((p) => (
            <g key={`point-${p.axis.key}`} aria-label={`${p.axis.key} axis point`}>
              <circle
                cx={p.x}
                cy={p.y}
                r={4}
                fill={p.axis.color || color}
                stroke="#fff"
                strokeWidth={1.25}
              />
            </g>
          ))}
        </svg>

        {/* Labels rendered separately so zoom only affects geometry */}
        <div className="pointer-events-none absolute inset-0">
          {points.map((p) => {
            const isHovered = hoveredAxisKey === p.axis.key;
            const dotSize = isHovered ? dotHoverSize : dotBaseSize;
            const axisTooltip = formatAxisPolarity(p.axis);

            return (
              <div
                key={`label-group-${p.axis.key}`}
                className="absolute flex items-center justify-center"
                style={{
                  left: `${(p.posX / size) * 100}%`,
                  top: `${(p.posY / size) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div
                  className="pointer-events-auto rounded-full shadow-sm flex items-center justify-center"
                  style={{
                    backgroundColor: p.axis.color,
                    width: dotSize,
                    height: dotSize,
                    transition: "width 0.15s ease, height 0.15s ease",
                  }}
                  title={axisTooltip}
                  aria-label={axisTooltip}
                  onMouseEnter={() => setHoveredAxisKey(p.axis.key)}
                  onMouseLeave={() => setHoveredAxisKey((current) => (current === p.axis.key ? null : current))}
                >
                  <span
                    className="text-[16px] font-black leading-none pointer-events-none"
                    style={{ color: getSymbolColor(p.axis.color) }}
                  >
                    {p.axis.value >= 0 ? "+" : "-"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
}


type ExportSection = {
  title: string;
  description?: string;
  content: string; // Compact formatted text instead of JSON payload
};

function sanitizeForExport(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sanitizeForExport);
  if (value instanceof Date) return value.toISOString();
  if (ArrayBuffer.isView(value)) {
    return Array.from(value as unknown as ArrayLike<number>);
  }
  if (value instanceof Map) {
    return Object.fromEntries(
      Array.from(value.entries()).map(([key, val]) => [String(key), sanitizeForExport(val)])
    );
  }
  if (value instanceof Set) {
    return Array.from(value.values()).map(sanitizeForExport);
  }
  if (typeof value === "object") {
    const accumulator: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      accumulator[key] = sanitizeForExport(val);
    }
    return accumulator;
  }
  return value;
}

function resolveNodeReference(endpoint: string | GraphNode): string {
  if (typeof endpoint === "string") return endpoint;
  return endpoint?.id ?? "unknown";
}


interface AnalysisReportProps {
  analysis: AnalysisResult | null;
  jurorBlocks: JurorBlock[];
  axisLabels?: AnalysisResult["axisLabels"];
  enableAxisLabelAI?: boolean;
  isRefreshingAxisLabels?: boolean;
  insights?: Record<string, ConceptInsight>;
  rawExportContext?: RawDataExportContext;
}

function formatPercent(value: number | undefined, digits = 1): string {
  if (value === undefined || Number.isNaN(value)) return "0%";
  return `${(value * 100).toFixed(digits)}%`;
}

export function AnalysisReport({ analysis, jurorBlocks, axisLabels, enableAxisLabelAI, isRefreshingAxisLabels = false, insights, rawExportContext }: AnalysisReportProps) {
  const [isAxisSectionExpanded, setIsAxisSectionExpanded] = useState(true);
  const [expandedPrimaryConcepts, setExpandedPrimaryConcepts] = useState<Set<string>>(new Set());
  const [expandedJurorVectors, setExpandedJurorVectors] = useState<Record<string, boolean>>({});
  const renderHeading = (icon: React.ReactNode, iconBg: string, title: string, subtitle: string) => (
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
        {icon}
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-slate-900">{title}</span>
        <span className="text-[11px] font-semibold text-slate-500">{subtitle}</span>
      </div>
    </div>
  );

  const togglePrimaryConceptExpand = (id: string) => {
    setExpandedPrimaryConcepts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleJurorVectorExpand = (juror: string, conceptId: string) => {
    const key = `${juror}:${conceptId}`;
    setExpandedJurorVectors(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

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
        const resolvedLabel = resolveInsightLabel(insight?.shortLabel);
        return [
          c.id,
          { label: resolvedLabel ?? c.label, ai: Boolean(resolvedLabel), loading: insight?.isLoadingLabel },
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
        const soft = lightenColor(base, 0.85);
        map.set(n.id, { base, soft });
      });
    return map;
  }, [analysis]);

  const jurorColors = useMemo(() => {
    if (!analysis) return new Map<string, { base: string; soft: string }>();
    const map = new Map<string, { base: string; soft: string }>();
    analysis.nodes
      .filter((n) => n.type === "juror")
      .forEach((n) => {
        const base = getPCColor(n.pcValues, "#0f172a");
        const soft = lightenColor(base, 0.85);
        // node id formatted as juror:Name
        const name = n.id.replace(/^juror:/, "");
        map.set(name, { base, soft });
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
  const [showAllJurorContribs, setShowAllJurorContribs] = useState<Record<string, boolean>>({});
  const [showAllJurorConcepts, setShowAllJurorConcepts] = useState<Record<string, boolean>>({});
  const [showAllJurorRawTerms, setShowAllJurorRawTerms] = useState<Record<string, boolean>>({});
  const [jurorSort, setJurorSort] = useState<"links" | "concepts" | "sentences" | "alpha">("links");
  const [jurorSortMenuOpen, setJurorSortMenuOpen] = useState(false);

  const sortedConcepts = useMemo(() => {
    if (!analysis) return [];
    // Use primaryConcepts if available, otherwise concepts (backward compat)
    const base = [...(analysis.primaryConcepts || analysis.concepts)];
    const byWeight = (id: string) => conceptWeights.get(id) ?? 0;
    const jurorCounts = (id: string) => (conceptJurorDistribution.get(id) || []).length;
    const hasAi = (id: string) => Boolean(resolveInsightLabel(insights?.[id]?.shortLabel));

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

  const sortedJurors = useMemo(() => {
    if (!analysis) return [];
    const base = [...analysis.jurors];
    return base.sort((a, b) => {
      const sentencesA = sentencesByJuror.get(a) ?? 0;
      const sentencesB = sentencesByJuror.get(b) ?? 0;
      const vectorA = analysis.jurorVectors[a] || {};
      const vectorB = analysis.jurorVectors[b] || {};
      const totalLinksA = Object.values(vectorA).reduce((sum, v) => sum + v, 0);
      const totalLinksB = Object.values(vectorB).reduce((sum, v) => sum + v, 0);
      const conceptCountA = Object.keys(vectorA).length;
      const conceptCountB = Object.keys(vectorB).length;

      switch (jurorSort) {
        case "sentences":
          return sentencesB - sentencesA || a.localeCompare(b);
        case "concepts":
          return conceptCountB - conceptCountA || a.localeCompare(b);
        case "alpha":
          return a.localeCompare(b);
        case "links":
        default:
          return totalLinksB - totalLinksA || a.localeCompare(b);
      }
    });
  }, [analysis, sentencesByJuror, jurorSort]);

  const [axisScale, setAxisScale] = useState(1);
  const adjustAxisScale = (delta: number) => {
    setAxisScale((prev) => {
      const next = Math.min(3, Math.max(0.3, prev + delta));
      return Number(next.toFixed(2));
    });
  };

  const maxPcDim = useMemo(() => {
    if (!analysis) return 0;
    return analysis.nodes.reduce((max, n) => {
      const len = Array.isArray(n.pcValues) ? n.pcValues.length : 0;
      return Math.max(max, len);
    }, 0);
  }, [analysis]);

  const axisColorList = useMemo(
    () => getAxisColors(Math.max((analysis?.appliedNumDimensions || 0) || 3, 3)),
    [analysis?.appliedNumDimensions]
  );

  const dominanceThresholdValue = rawExportContext?.analysisParams?.autoDominanceCapThreshold ?? 0.35;
  const dominanceThresholdLabel =
    rawExportContext?.analysisParams?.autoDominanceCapThreshold !== undefined
      ? dominanceThresholdValue.toFixed(2)
      : `default (${dominanceThresholdValue.toFixed(2)})`;
  const autoDominanceCapEnabled = rawExportContext?.analysisParams?.autoDominanceCap ?? true;

  const nodeById = useMemo(() => {
    if (!analysis) return new Map<string, AnalysisResult["nodes"][number]>();
    return new Map(analysis.nodes.map((n) => [n.id, n]));
  }, [analysis]);

  const maxAbsByDim = useMemo(() => {
    if (!analysis) return [] as number[];
    const arr: number[] = [];
    analysis.nodes.forEach((n) => {
      if (!Array.isArray(n.pcValues)) return;
      n.pcValues.forEach((v, idx) => {
        const abs = Math.abs(v ?? 0);
        if (!Number.isFinite(abs)) return;
        arr[idx] = Math.max(arr[idx] ?? 0, abs);
      });
    });
    return arr;
  }, [analysis]);

  const stanceBadgeConfig = [
    { key: "praise", label: "Praise", color: "bg-emerald-400" },
    { key: "critique", label: "Critique", color: "bg-rose-400" },
    { key: "suggestion", label: "Suggestion", color: "bg-blue-400" },
    { key: "neutral", label: "Neutral", color: "bg-slate-300" },
  ] as const;

  const effectiveAxisLabels = axisLabels || analysis?.axisLabels || {};
  const axisKeys = Object.keys(effectiveAxisLabels);
  const exportSections = useMemo<ExportSection[]>(() => {
    if (!analysis || !rawExportContext) return [];

    const p = rawExportContext.analysisParams;
    const separator = "=".repeat(80);

    // Format parameters section
    const formatParameters = () => {
      const e = p.evidenceRankingParams || { semanticWeight: 0.7, frequencyWeight: 0.3 };
      return `ANALYSIS PARAMETERS
${separator}
kConcepts: ${p.kConcepts} | minEdgeWeight: ${p.minEdgeWeight} | similarityThreshold: ${p.similarityThreshold}
clusteringMode: ${p.clusteringMode} | autoK: ${p.autoK} | autoSeed: ${p.autoSeed ?? false} | clusterSeed: ${p.clusterSeed} | softMembership: ${p.softMembership}
autoMinClusterSize: ${p.autoMinClusterSize ?? false} | minClusterSize: ${p.minClusterSize ?? "auto"}
autoDominanceCap: ${p.autoDominanceCap ?? true} | dominanceCapThreshold: ${p.autoDominanceCapThreshold ?? "default"}
autoSeed params: candidates=${p.seedCandidates ?? "-"}, perturbations=${p.seedPerturbations ?? "-"}, weights(coh=${p.seedCoherenceWeight ?? "-"}, sep=${p.seedSeparationWeight ?? "-"}, stab=${p.seedStabilityWeight ?? "-"}, domPen=${p.seedDominancePenaltyWeight ?? "-"}, microPen=${p.seedMicroClusterPenaltyWeight ?? "-"}, labelPen=${p.seedLabelPenaltyWeight ?? "-"}), domThresh=${p.seedDominanceThreshold ?? "-"}
evidenceRanking: sem=${e.semanticWeight}, freq=${e.frequencyWeight} | dimensionMode: ${p.dimensionMode}
appliedDimensions: ${p.appliedNumDimensions} | varianceThreshold: ${p.varianceThreshold}
autoUnit: ${p.autoUnit ?? false} | recommendedUnitMode: ${p.recommendedUnitMode?.label ?? "-"}
autoWeights: ${p.autoWeights ?? false} | recommendedWeights: sem=${p.recommendedWeights?.semanticWeight ?? "-"}, freq=${p.recommendedWeights?.frequencyWeight ?? "-"}
Model: ${rawExportContext.selectedModel} | Export: ${rawExportContext.exportTimestamp || new Date().toISOString()}`;
    };

    // Format juror vectors (ALL weights, not just top 5)
    const formatJurorVectors = () => {
      const lines = analysis.jurors.map(juror => {
        const vec = analysis.jurorVectors[juror] || {};
        const weights = Object.entries(vec)
          .sort((a, b) => b[1] - a[1]) // Sort by weight descending
          .map(([cid, w]) => `${cid}:${(w * 100).toFixed(1)}%`)
          .join(' ');
        return `${juror.padEnd(25)} ${weights}`;
      });
      return `JUROR VECTORS (Concept Weights)
${separator}
${lines.join('\n')}`;
    };

    // Format concepts
    const formatConcepts = () => {
      const conceptMap = new Map(analysis.concepts.map((c, idx) => [c.id, { idx, concept: c }]));
      const lines = analysis.concepts.map((c, idx) => {
        const terms = c.topTerms.slice(0, 12).join(', ');
        return `concept-${idx} | ${c.label} (${c.size} sentences)\n    Terms: ${terms}`;
      });
      return `CONCEPTS
${separator}
${lines.join('\n\n')}`;
    };

    // Format graph structure summary
    const formatGraphStructure = () => {
      const jurorNodes = analysis.nodes.filter(n => n.type === 'juror').length;
      const conceptNodes = analysis.nodes.filter(n => n.type === 'concept').length;
      const jurorConceptLinks = analysis.links.filter(l => l.kind === 'jurorConcept').length;
      const jurorJurorLinks = analysis.links.filter(l => l.kind === 'jurorJuror').length;
      const conceptConceptLinks = analysis.links.filter(l => l.kind === 'conceptConcept').length;
      
      // Find top links
      const topLinks = analysis.links
        .filter(l => l.kind === 'jurorConcept' && l.evidenceIds && l.evidenceIds.length > 0)
        .sort((a, b) => (b.weight || 0) - (a.weight || 0))
        .slice(0, 3)
        .map(l => {
          const sourceId = resolveNodeReference(l.source);
          const targetId = resolveNodeReference(l.target);
          const sourceLabel = sourceId.replace('juror:', '');
          const targetLabel = analysis.concepts.find(c => c.id === targetId)?.label || targetId;
          return `${sourceLabel}→${targetLabel} (${((l.weight || 0) * 100).toFixed(1)}%, ${l.evidenceIds?.length || 0} evidence)`;
        })
        .join(', ');

      return `GRAPH STRUCTURE
${separator}
Nodes: ${analysis.nodes.length} (${jurorNodes} jurors, ${conceptNodes} concepts) | Links: ${analysis.links.length}
  juror-concept: ${jurorConceptLinks} | juror-juror: ${jurorJurorLinks} | concept-concept: ${conceptConceptLinks}
Top Links: ${topLinks || 'N/A'}`;
    };

    // Format statistics
    const formatStatistics = () => {
      const stats = analysis.stats;
      const jurorCounts = analysis.jurors.map(j => {
        const count = analysis.sentences.filter(s => s.juror === j).length;
        return `${j}:${count}`;
      }).join(', ');
      
      const stancePct = Object.entries(stats.stanceCounts).map(([s, c]) => 
        `${s}:${c} (${Math.round(c / stats.totalSentences * 100)}%)`
      ).join(', ');

      let varInfo = 'N/A';
      if (analysis.varianceStats && analysis.appliedNumDimensions) {
        const cumVar = analysis.varianceStats.cumulativeVariances[analysis.appliedNumDimensions - 1] || 0;
        const totalVar = analysis.varianceStats.totalVariance || 1;
        const pct = Math.round((cumVar / totalVar) * 100 * 10) / 10;
        const explained = analysis.varianceStats.explainedVariances.slice(0, analysis.appliedNumDimensions);
        varInfo = `${analysis.appliedNumDimensions} dimensions explain ${pct}% (${explained.map(v => v.toFixed(2)).join(', ')} / ${totalVar.toFixed(2)} total)`;
      }

      let kSearchInfo = '';
      if (analysis.recommendedK !== undefined) {
        const score = analysis.kSearchMetrics?.find(m => m.k === analysis.recommendedK)?.score;
        const scoreStr = score ? ` (score: ${score.toFixed(3)})` : '';
        const tested = analysis.kSearchMetrics ? `, tested k=${analysis.kSearchMetrics[0]?.k}-${analysis.kSearchMetrics[analysis.kSearchMetrics.length - 1]?.k}` : '';
        kSearchInfo = `\nK-search: recommended k=${analysis.recommendedK}${scoreStr}${tested}`;
      }

      let seedInfo = '';
      if (analysis.autoSeed && analysis.seedLeaderboard && analysis.seedLeaderboard.length > 0) {
        const bestSeed = analysis.seedLeaderboard.find(s => s.seed === analysis.seedChosen) || analysis.seedLeaderboard[0];
        const scoreStr = bestSeed?.score !== undefined ? bestSeed.score.toFixed(4) : '-';
        const evaluated = analysis.seedCandidatesEvaluated ?? analysis.seedLeaderboard.length;
        seedInfo = `seed=${analysis.seedChosen ?? bestSeed?.seed ?? "-"} score=${scoreStr} (evaluated ${evaluated})`;
      }

      const apiCost = rawExportContext.apiCostTotal > 0 
        ? `, $${rawExportContext.apiCostTotal.toFixed(4)} total cost`
        : '';

      return `STATISTICS
${separator}
Sentences: ${stats.totalSentences} (by juror: ${jurorCounts})
Stance: ${stancePct}
Variance: ${varInfo}${kSearchInfo}
AutoSeed: ${seedInfo ? seedInfo.trim() : 'disabled'}
API: ${rawExportContext.apiCallCount} calls${apiCost}`;
    };

    // Combine all sections into one compact export
    const content = [
      formatParameters(),
      '',
      formatJurorVectors(),
      '',
      formatConcepts(),
      '',
      formatGraphStructure(),
      '',
      formatStatistics()
    ].join('\n');

    return [{
      title: "Raw Data Export",
      description: "Compact formatted export",
      content
    }];
  }, [analysis, rawExportContext]);

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
  const orderedAxesAll = axisKeys
    .map((key, idx) => {
      const parsed = Number.parseInt(key, 10);
      const axisIndex = Number.isFinite(parsed) ? parsed : idx;
      return { key, axisIndex, originalIndex: idx };
    })
    .sort((a, b) => (a.axisIndex - b.axisIndex) || (a.originalIndex - b.originalIndex));
  const maxAxes = Math.max(
    0,
    Math.min(
      orderedAxesAll.length,
      analysis.appliedNumDimensions ?? Number.POSITIVE_INFINITY,
      analysis.varianceStats?.explainedVariances?.length ?? Number.POSITIVE_INFINITY,
      maxPcDim || Number.POSITIVE_INFINITY
    )
  );
  const orderedAxes = orderedAxesAll.slice(0, maxAxes || orderedAxesAll.length);

  const stanceCounts = analysis.stats.stanceCounts;
  const stanceTotal =
    stanceCounts.praise + stanceCounts.critique + stanceCounts.suggestion + stanceCounts.neutral || 1;

  const kSearchMetrics = analysis.kSearchMetrics ?? [];
  const seedLeaderboard = analysis.seedLeaderboard ?? [];
  const showAutoSeedSelection = analysis.autoSeed && seedLeaderboard.length > 0;
  const showAutoKSelection = kSearchMetrics.length > 0;

  const overviewBadges = [
    { label: "Sentences", value: analysis.stats.totalSentences },
    { label: "Concepts", value: analysis.stats.totalConcepts },
    { label: "Jurors", value: analysis.stats.totalJurors },
    { label: "Source Files", value: jurorBlocks.length },
  ];

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      {/* Top row: Corpus + auto selections */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
            {renderHeading(<BarChart2 className="h-5 w-5" />, "bg-indigo-50 text-indigo-700", "Corpus Summary", "Volume & stance mix")}
            <div className="flex flex-wrap items-center justify-end gap-2">
              {overviewBadges.map((item) => (
                <Badge
                  key={item.label}
                  variant="outline"
                  className="flex items-center gap-1 rounded-lg border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-sm"
                >
                  <span className="text-[9px] uppercase tracking-[0.15em] text-slate-500">{item.label}</span>
                  <span className="text-sm font-black text-slate-900">{item.value}</span>
                </Badge>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 px-5 py-4">
            {stanceBadgeConfig.map(({ key, label, color }) => {
              const count = stanceCounts[key] || 0;
              const percent = stanceTotal > 0 ? count / stanceTotal : 0;
              return (
                <div key={key} className="flex flex-col gap-1 rounded-lg border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                      <span>{label}</span>
                      <Badge
                        variant="outline"
                        className="border-slate-200 bg-white px-2 py-0 text-[10px] font-black text-slate-700 shadow-sm"
                      >
                        {count}
                      </Badge>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-slate-200 bg-white px-2 py-0 text-[10px] font-bold text-slate-600"
                    >
                      {formatPercent(percent, 0)}
                    </Badge>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-1.5 ${color}`}
                      style={{ width: `${Math.min(100, Math.max(percent * 100, 4))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {showAutoKSelection && (
          <div className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
              {renderHeading(<CircleDot className="h-5 w-5" />, "bg-indigo-50 text-indigo-700", "AutoK Selection", "Automatic cluster search")}
              {analysis.recommendedK !== undefined && (
                <Badge variant="outline" className="border-indigo-200 bg-indigo-50 px-2 py-0 text-[11px] font-black text-indigo-700">
                  Chosen K = {analysis.recommendedK}
                </Badge>
              )}
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="text-[12px] font-semibold text-slate-600">
                Tested K {kSearchMetrics[0]?.k} - {kSearchMetrics[kSearchMetrics.length - 1]?.k}
              </div>
              {analysis.autoKReasoning && (
                <p className="text-[12px] text-slate-600">
                  Reasoning: {analysis.autoKReasoning}
                </p>
              )}
              <div className="overflow-hidden rounded-lg border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-[12px]">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">K</th>
                      <th className="px-3 py-2 text-left font-semibold">Score</th>
                      <th className="px-3 py-2 text-left font-semibold">Dominance</th>
                      <th className="px-3 py-2 text-left font-semibold">Stability</th>
                      <th className="px-3 py-2 text-left font-semibold">Valid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kSearchMetrics.map((m) => {
                      const isSelected = analysis.recommendedK === m.k;
                      return (
                        <tr key={`k-${m.k}`} className={isSelected ? "bg-indigo-50/50" : ""}>
                          <td className="px-3 py-2 font-semibold text-slate-800">{m.k}</td>
                          <td className="px-3 py-2 text-slate-700">{m.valid && Number.isFinite(m.score) ? m.score.toFixed(3) : "-"}</td>
                          <td className="px-3 py-2 text-slate-700">
                            {m.maxClusterShare !== undefined ? `${(m.maxClusterShare * 100).toFixed(1)}%` : "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {m.stabilityScore !== undefined ? m.stabilityScore.toFixed(3) : "-"}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={m.valid ? "secondary" : "outline"} className={m.valid ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}>
                              {m.valid ? "Yes" : "No"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {showAutoSeedSelection && (
          <div className="h-full rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
              {renderHeading(<Sparkles className="h-5 w-5" />, "bg-emerald-50 text-emerald-700", "Auto-Seed Selection", "Seed stability exploration")}
              {analysis.seedChosen !== undefined && (
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 px-2 py-0 text-[11px] font-black text-emerald-700">
                  Chosen Seed = {analysis.seedChosen}
                </Badge>
              )}
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="text-[12px] font-semibold text-slate-600">
                Evaluated {analysis.seedCandidatesEvaluated ?? seedLeaderboard.length} candidate seeds
              </div>
              {analysis.autoSeedReasoning && (
                <p className="text-[12px] text-slate-600">
                  Reasoning: {analysis.autoSeedReasoning}
                </p>
              )}
              <div className="overflow-hidden rounded-lg border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-[12px]">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Seed</th>
                      <th className="px-3 py-2 text-left font-semibold">Score</th>
                      <th className="px-3 py-2 text-left font-semibold">Dominance</th>
                      <th className="px-3 py-2 text-left font-semibold">Micro-Clusters</th>
                      <th className="px-3 py-2 text-left font-semibold">Stability</th>
                      <th className="px-3 py-2 text-left font-semibold">Coherence</th>
                      <th className="px-3 py-2 text-left font-semibold">Separation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {seedLeaderboard.slice(0, 10).map((entry, idx) => {
                      const isSelected = analysis.seedChosen === entry.seed;
                      return (
                        <tr key={`seed-${entry.seed}-${idx}`} className={isSelected ? "bg-indigo-50/50" : ""}>
                          <td className="px-3 py-2 font-semibold text-slate-800">{entry.seed}</td>
                          <td className="px-3 py-2 text-slate-700">{Number.isFinite(entry.score) ? entry.score.toFixed(4) : "-"}</td>
                          <td className="px-3 py-2 text-slate-700">{(entry.maxClusterShare * 100).toFixed(1)}%</td>
                          <td className="px-3 py-2 text-slate-700">{entry.microClusters}</td>
                          <td className="px-3 py-2 text-slate-700">{entry.stability.toFixed(3)}</td>
                          <td className="px-3 py-2 text-slate-700">{entry.coherence !== undefined ? entry.coherence.toFixed(3) : "-"}</td>
                          <td className="px-3 py-2 text-slate-700">{entry.separation !== undefined ? entry.separation.toFixed(3) : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {analysis.unitSearchMetrics && analysis.unitSearchMetrics.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">
                Auto-Unit Selection
              </Badge>
              <span className="text-sm font-semibold text-slate-600">
                Tested {analysis.unitSearchMetrics.length} modes
              </span>
            </div>
            {analysis.recommendedUnitMode && (
              <Badge variant="outline" className="border-indigo-200 bg-indigo-50 px-2 py-0 text-[11px] font-black text-indigo-700">
                Selected: {analysis.recommendedUnitMode.label}
              </Badge>
            )}
          </div>
          <div className="px-5 py-4 space-y-3">
            {analysis.autoUnitReasoning && (
              <p className="text-[12px] text-slate-600">
                Reasoning: {analysis.autoUnitReasoning}
              </p>
            )}
            <div className="overflow-hidden rounded-lg border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100 text-[12px]">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Mode</th>
                    <th className="px-3 py-2 text-left font-semibold">Score</th>
                    <th className="px-3 py-2 text-left font-semibold">Coherence</th>
                    <th className="px-3 py-2 text-left font-semibold">Separation</th>
                    <th className="px-3 py-2 text-left font-semibold">Dominance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {analysis.unitSearchMetrics.map((m) => {
                    const isSelected = analysis.recommendedUnitMode?.windowSize === m.mode.windowSize;
                    return (
                      <tr key={`unit-${m.mode.windowSize}`} className={isSelected ? "bg-indigo-50/50" : ""}>
                        <td className="px-3 py-2 font-semibold text-slate-800">{m.mode.label}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {Number.isFinite(m.score) ? m.score.toFixed(3) : "-"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{(m.coherence ?? 0).toFixed(3)}</td>
                        <td className="px-3 py-2 text-slate-700">{(m.separation ?? 0).toFixed(3)}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {m.dominance !== undefined ? `${(m.dominance * 100).toFixed(1)}%` : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {analysis.weightSearchMetrics && analysis.weightSearchMetrics.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">
                Auto-Weights Selection
              </Badge>
              <span className="text-sm font-semibold text-slate-600">
                Tested {analysis.weightSearchMetrics.length} combinations
              </span>
            </div>
            {analysis.recommendedWeights && (
              <Badge variant="outline" className="border-indigo-200 bg-indigo-50 px-2 py-0 text-[11px] font-black text-indigo-700">
                Selected: {analysis.recommendedWeights.semanticWeight}/{analysis.recommendedWeights.frequencyWeight}
              </Badge>
            )}
          </div>
          <div className="px-5 py-4 space-y-3">
            {analysis.autoWeightsReasoning && (
              <p className="text-[12px] text-slate-600">
                Reasoning: {analysis.autoWeightsReasoning}
              </p>
            )}
            <div className="overflow-hidden rounded-lg border border-slate-100">
              <table className="min-w-full divide-y divide-slate-100 text-[12px]">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Weights</th>
                    <th className="px-3 py-2 text-left font-semibold">Score</th>
                    <th className="px-3 py-2 text-left font-semibold">Evidence Coherence</th>
                    <th className="px-3 py-2 text-left font-semibold">Evidence Separation</th>
                    <th className="px-3 py-2 text-left font-semibold">Dominance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {analysis.weightSearchMetrics.map((m, idx) => {
                    const isSelected =
                      analysis.recommendedWeights?.semanticWeight === m.weights.semanticWeight &&
                      analysis.recommendedWeights?.frequencyWeight === m.weights.frequencyWeight;
                    return (
                      <tr key={`weights-${m.weights.semanticWeight}-${m.weights.frequencyWeight}-${idx}`} className={isSelected ? "bg-indigo-50/50" : ""}>
                        <td className="px-3 py-2 font-semibold text-slate-800">
                          {m.weights.semanticWeight}/{m.weights.frequencyWeight}
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {Number.isFinite(m.score) ? m.score.toFixed(3) : "-"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{(m.evidenceCoherence ?? 0).toFixed(3)}</td>
                        <td className="px-3 py-2 text-slate-700">{(m.evidenceSeparation ?? 0).toFixed(3)}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {m.dominance !== undefined ? `${(m.dominance * 100).toFixed(1)}%` : "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {(analysis.minClusterSize !== undefined || analysis.dominanceSplitApplied) && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                Cluster Hygiene Results
              </Badge>
              <span className="text-sm font-semibold text-slate-600">Merge and split diagnostics</span>
            </div>
            <div className="flex items-center gap-2">
              {analysis.minClusterSize !== undefined && (
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 px-2 py-0 text-[11px] font-black text-emerald-700">
                  Min Size = {analysis.minClusterSize} {analysis.minClusterSizeAuto ? "(auto)" : "(manual)"}
                </Badge>
              )}
              <Badge variant="outline" className="border-slate-200 bg-white px-2 py-0 text-[11px] font-semibold text-slate-600">
                Dominance Cap: {autoDominanceCapEnabled ? "on" : "off"}
              </Badge>
            </div>
          </div>
          <div className="space-y-3 px-5 py-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                <div className="mb-1 text-[11px] font-bold uppercase text-slate-500">Min Cluster Size</div>
                <div className="text-sm font-semibold text-slate-700">
                  {analysis.minClusterSize !== undefined ? `Applied: ${analysis.minClusterSize}` : "Not enabled"}
                </div>
                <div className="text-[11px] text-slate-500">
                  Merged clusters: {analysis.minClusterSizeMerged ?? 0}
                </div>
                {analysis.minClusterSizeDetails && (
                  <div className="text-[11px] text-slate-500">
                    Clusters: {analysis.minClusterSizeDetails.beforeSize} → {analysis.minClusterSizeDetails.afterSize}
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                <div className="mb-1 text-[11px] font-bold uppercase text-slate-500">Dominance Cap</div>
                <div className="text-sm font-semibold text-slate-700">
                  Threshold: {dominanceThresholdLabel}
                </div>
                <div className="text-[11px] text-slate-500">
                  Splits applied: {analysis.dominanceSplitApplied ? "Yes" : "No"}
                </div>
              </div>
            </div>

            {(analysis.dominanceSplitDetails?.primary || analysis.dominanceSplitDetails?.detail) && (
              <div className="overflow-hidden rounded-lg border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100 text-[12px]">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Layer</th>
                      <th className="px-3 py-2 text-left font-semibold">Splits</th>
                      <th className="px-3 py-2 text-left font-semibold">Original Sizes</th>
                      <th className="px-3 py-2 text-left font-semibold">New Sizes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {[{ label: "Primary", data: analysis.dominanceSplitDetails?.primary }, { label: "Detail", data: analysis.dominanceSplitDetails?.detail }]
                      .filter((row) => row.data)
                      .map((row) => (
                        <tr key={row.label}>
                          <td className="px-3 py-2 font-semibold text-slate-800">{row.label}</td>
                          <td className="px-3 py-2 text-slate-700">{row.data?.splitCount ?? 0}</td>
                          <td className="px-3 py-2 text-slate-700">
                            {(row.data?.originalSizes ?? []).length > 0 ? row.data?.originalSizes.join(", ") : "-"}
                          </td>
                          <td className="px-3 py-2 text-slate-700">
                            {(row.data?.newSizes ?? []).length > 0 ? row.data?.newSizes.join(", ") : "-"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Three-column layout: Juror, Dimension, Concept */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Juror Analysis */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            {renderHeading(<Users className="h-5 w-5" />, "bg-indigo-50 text-indigo-700", "Juror Analysis", "Raw terms vs concept pull")}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-slate-200 bg-white text-[11px] font-semibold text-slate-600">
                {analysis.stats.totalJurors} jurors
              </Badge>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setJurorSortMenuOpen((prev) => !prev)}
                  className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  Sort
                </button>
                {jurorSortMenuOpen && (
                  <div className="absolute right-0 top-8 z-10 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                    {[
                      { value: "links", label: "Contribution weight" },
                      { value: "concepts", label: "# Concepts" },
                      { value: "sentences", label: "# Sentences" },
                      { value: "alpha", label: "Alphabetical" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setJurorSort(opt.value as any);
                          setJurorSortMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[12px] font-semibold ${
                          jurorSort === opt.value ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {jurorSort === opt.value && <span className="text-[10px] text-indigo-600">•</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-3 px-5 py-4">
            {sortedJurors.map((juror) => {
              const semanticTerms = analysis.jurorTopTerms?.[juror] || [];
              const vector = analysis.jurorVectors[juror] || {};
              const conceptWeights = Object.entries(vector)
                .filter(([, w]) => w > 0)
                .sort((a, b) => b[1] - a[1]);
              const showAllConcepts = showAllJurorConcepts[juror] ?? false;
              const visibleConceptWeights = showAllConcepts ? conceptWeights : conceptWeights.slice(0, 3);
              const jurorText = jurorBlocks.find((b) => b.juror === juror)?.text ?? "";
              const keyphrases = extractKeyphrases(jurorText);
              const semanticSet = new Set(semanticTerms.map((t) => t.toLowerCase()));

              const hasPartialMatch = (term: string, otherList: string[]): boolean => {
                const termWords = term.toLowerCase().split(/\s+/);
                return otherList.some((other) => {
                  const otherWords = other.toLowerCase().split(/\s+/);
                  const sharedWords = termWords.filter((w) => otherWords.includes(w));
                  return sharedWords.length > 0 && term.toLowerCase() !== other.toLowerCase();
                });
              };

              const allTerms: Array<{ term: string; matchType: "keyphrase-only" | "semantic-only" | "exact-match" | "partial-match" }> = [];
              const processed = new Set<string>();

              keyphrases.forEach((kp) => {
                const lower = kp.toLowerCase();
                if (processed.has(lower)) return;
                processed.add(lower);

                if (semanticSet.has(lower)) {
                  allTerms.push({ term: kp, matchType: "exact-match" });
                } else if (hasPartialMatch(kp, semanticTerms)) {
                  allTerms.push({ term: kp, matchType: "partial-match" });
                } else {
                  allTerms.push({ term: kp, matchType: "keyphrase-only" });
                }
              });

              semanticTerms.forEach((st) => {
                const lower = st.toLowerCase();
                if (processed.has(lower)) return;
                processed.add(lower);

                if (hasPartialMatch(st, keyphrases)) {
                  allTerms.push({ term: st, matchType: "partial-match" });
                } else {
                  allTerms.push({ term: st, matchType: "semantic-only" });
                }
              });

              const showAllRaw = showAllJurorRawTerms[juror] ?? false;
              const visibleRawTerms = showAllRaw ? allTerms : allTerms.slice(0, 6);
              const sentences = sentencesByJuror.get(juror) ?? 0;
              const conceptCoverage = Object.keys(vector).length;
              const jurorNode = nodeById.get(`juror:${juror}`);
              const pcValues = Array.isArray(jurorNode?.pcValues) ? jurorNode?.pcValues : null;
              const jurorAxes: AxisPlotDatum[] = [];
              if (pcValues && orderedAxes.length > 0) {
                const maxAllowed = Math.min(
                  orderedAxes.length,
                  pcValues.length,
                  analysis.appliedNumDimensions ?? Number.POSITIVE_INFINITY,
                  analysis.varianceStats?.explainedVariances?.length ?? Number.POSITIVE_INFINITY,
                  maxAbsByDim.length || Number.POSITIVE_INFINITY
                );
                orderedAxes.slice(0, maxAllowed).forEach(({ key, axisIndex }) => {
                  const axis = effectiveAxisLabels?.[key];
                  const raw = pcValues[axisIndex] ?? 0;
                  const maxAbs = maxAbsByDim[axisIndex] || 1;
                  const normalized = maxAbs > 0 ? Math.max(-1, Math.min(1, raw / maxAbs)) : 0;
                  jurorAxes.push({
                    axisIndex,
                    key,
                    positive: axis?.synthesizedPositive || axis?.positive,
                    negative: axis?.synthesizedNegative || axis?.negative,
                    value: normalized,
                    raw,
                    color: axisColorList[axisIndex % axisColorList.length],
                  });
                });
              }

              return (
                <div
                  key={juror}
                  className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
                >
                  <div className="mb-1 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-sm font-bold"
                        style={{
                          borderColor: jurorColors.get(juror)?.base ?? "#cbd5e1",
                          color: "#0f172a",
                          backgroundColor: jurorColors.get(juror)?.soft ?? "#f8fafc",
                        }}
                      >
                        <span
                          className="mr-1 inline-block h-2 w-2 rounded-full"
                        style={{ backgroundColor: jurorColors.get(juror)?.base ?? "#0f172a" }}
                      />
                      {juror}
                    </Badge>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>{sentences} sentences</span>
                      <span className="h-3 w-px bg-slate-200" />
                      <span>{conceptCoverage} concept links</span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Concept affinity
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-slate-200 bg-white text-[11px] font-semibold text-slate-600">
                        {conceptWeights.length} concepts
                      </Badge>
                      {conceptWeights.length > 3 && (
                        <button
                          type="button"
                          onClick={() =>
                            setShowAllJurorConcepts((prev) => ({
                              ...prev,
                              [juror]: !showAllConcepts,
                            }))
                          }
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                        >
                          {showAllConcepts ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {visibleConceptWeights.map(([id, weight]) => {
                      const labelInfo = conceptLabelMap.get(id);
                      const colors = conceptColors.get(id);
                      const isExpanded = expandedJurorVectors[`${juror}:${id}`];
                      const detailIds = analysis.conceptHierarchy?.[id] || [];
                      const hasDetails = detailIds.length > 0;

                      return (
                        <div key={id} className="flex flex-col gap-1.5">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-slate-900",
                              hasDetails && "cursor-pointer transition-all hover:opacity-80",
                              isExpanded && "ring-1 ring-indigo-400 ring-offset-1"
                            )}
                            style={{
                              backgroundColor: colors?.soft ?? "#eef2ff",
                              color: "#0f172a",
                              borderColor: colors?.base ?? "transparent",
                              borderWidth: "1px",
                            }}
                            onClick={() => hasDetails && toggleJurorVectorExpand(juror, id)}
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
                            {hasDetails && (
                              <span className="ml-1.5 opacity-40 text-[8px] font-bold">
                                {isExpanded ? "▲" : "▼"}
                              </span>
                            )}
                          </Badge>

                          {isExpanded && detailIds.length > 0 && (
                            <div className="ml-2 flex flex-wrap gap-1 border-l-2 border-indigo-100 pl-2">
                              {detailIds.map(dId => {
                                const dw = analysis.jurorVectorsDetail?.[juror]?.[dId] || 0;
                                if (dw <= 0) return null;
                                const detail = analysis.detailConcepts?.find(dc => dc.id === dId);
                                return (
                                  <Badge 
                                    key={dId} 
                                    variant="outline" 
                                    className="text-[9px] h-4 px-1.5 bg-white border-indigo-50 text-indigo-600 font-medium"
                                  >
                                    {detail?.label || dId} | {formatPercent(dw, 0)}
                                  </Badge>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {conceptWeights.length === 0 && (
                      <span className="text-[11px] text-slate-400">No concept weights available</span>
                    )}
                  </div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <section className="rounded-xl border border-slate-100 bg-white/90 shadow-sm">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full border border-slate-300"
                            style={{ backgroundColor: axisColorList[0] ?? "#9a859a" }}
                          />
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Axis affinity
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                            onClick={() => adjustAxisScale(-0.1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                            onClick={() => adjustAxisScale(0.1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <AxisAffinityChart
                        key={jurorAxes.map((a) => `${a.key}-${a.positive}-${a.negative}`).join("|")}
                        axes={jurorAxes}
                        color={jurorColors.get(juror)?.base ?? "#0f172a"}
                        scale={axisScale}
                      />
                    </section>
                    <section className="rounded-xl border border-slate-100 bg-slate-50/60 shadow-sm">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            BM25 Frequency Terms
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-slate-200 bg-white text-[11px] font-semibold text-slate-600">
                            {allTerms.length}
                          </Badge>
                          {allTerms.length > 6 && (
                            <button
                              type="button"
                              onClick={() =>
                                setShowAllJurorRawTerms((prev) => ({
                                  ...prev,
                                  [juror]: !showAllRaw,
                                }))
                              }
                              className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                            >
                              {showAllRaw ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {visibleRawTerms.map(({ term, matchType }) => {
                          let badgeClasses = "text-[10px] px-2 py-0.5 font-medium border";
                          if (matchType === "keyphrase-only") {
                            badgeClasses += " text-blue-700 border-blue-200 bg-blue-50";
                          } else if (matchType === "semantic-only") {
                            badgeClasses += " text-red-700 border-red-200 bg-red-50";
                          } else if (matchType === "exact-match") {
                            badgeClasses += " text-purple-100 border-purple-500 bg-purple-700";
                          } else {
                            badgeClasses += " text-purple-900 border-purple-200 bg-purple-100";
                          }
                          return (
                            <Badge key={`${juror}-${term}`} className={badgeClasses}>
                              {term}
                            </Badge>
                          );
                        })}
                    {allTerms.length === 0 && <span className="text-[11px] text-slate-400">No terms extracted</span>}
                  </div>
                </section>
              </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dimension Analysis */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
          <div className="border-b border-slate-100">
            <button
              onClick={() => setIsAxisSectionExpanded(!isAxisSectionExpanded)}
              className="flex w-full items-center justify-between px-5 py-3 transition-colors hover:bg-slate-50"
            >
              {renderHeading(<Layers className="h-5 w-5" />, "bg-amber-50 text-amber-600", "Dimension Analysis", "Why points sit where they do")}
              <div className="flex items-center gap-3">
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
                {isAxisSectionExpanded ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </div>
            </button>
          </div>

          {isAxisSectionExpanded && (
            <div className="px-5 py-4">
              <div className="space-y-3">
            {orderedAxes.length === 0 && <div className="text-xs text-slate-400">No axis labels available.</div>}
            {orderedAxes.map(({ key: axisKey, axisIndex }) => {
              const axis = effectiveAxisLabels?.[axisKey];
              const explained = analysis.varianceStats?.explainedVariances?.[axisIndex] ?? 0;
              const totalVar = analysis.varianceStats?.totalVariance ?? 0;
              const variance = totalVar > 0 ? explained / totalVar : explained || 0;
              const axisColor = axisColorList[axisIndex % axisColorList.length];

              const nodesWithPc = analysis.nodes.filter(
                (n) => Array.isArray(n.pcValues) && n.pcValues && n.pcValues.length > axisIndex
              );
              let min: { label: string; value: number } | null = null;
              let max: { label: string; value: number } | null = null;
              for (const node of nodesWithPc) {
                const value = node.pcValues?.[axisIndex] ?? 0;
                if (min === null || value < min.value) min = { label: node.label, value };
                if (max === null || value > max.value) max = { label: node.label, value };
              }

              return (
                <div key={axisKey} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-sm font-bold"
                      style={{
                        borderColor: axisColor,
                        color: "#0f172a",
                        backgroundColor: lightenColor(axisColor, 0.85),
                      }}
                    >
                      <span
                        className="mr-1 inline-block h-2 w-2 rounded-full border border-black flex-shrink-0"
                        style={{ backgroundColor: axisColor }}
                      />
                      <span className="whitespace-normal break-words">
                        {axis?.synthesizedName || axis?.name || `Axis ${axisIndex + 1}`}
                      </span>
                    </Badge>
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
                      className="bg-white text-slate-800"
                      style={{
                        backgroundColor: lightenColor(axisColorList[axisIndex % axisColorList.length], 0.93),
                        borderColor: "black",
                        borderWidth: "1px",
                      }}
                    >
                      <span
                        className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black text-white"
                        style={{ backgroundColor: axisColorList[axisIndex % axisColorList.length] }}
                      >
                        -
                      </span>
                      {axis?.synthesizedNegative || axis?.negative || "Negative"}
                    </Badge>
                    <span className="text-[11px] text-slate-400">vs</span>
                    <Badge
                      variant="secondary"
                      className="bg-white text-slate-800"
                      style={{
                        backgroundColor: lightenColor(axisColorList[axisIndex % axisColorList.length], 0.93),
                        borderColor: "black",
                        borderWidth: "1px",
                      }}
                    >
                      <span
                        className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-black text-white"
                        style={{ backgroundColor: axisColorList[axisIndex % axisColorList.length] }}
                      >
                        +
                      </span>
                      {axis?.synthesizedPositive || axis?.positive || "Positive"}
                    </Badge>
                  </div>
                  <div className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Extremes
                  </div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-800">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full border border-black"
                        style={{ backgroundColor: axisColorList[axisIndex % axisColorList.length] }}
                      />
                      <span>Low: {min?.label ?? "N/A"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full border border-black"
                        style={{ backgroundColor: axisColorList[axisIndex % axisColorList.length] }}
                      />
                      <span>High: {max?.label ?? "N/A"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
              </div>
            </div>
          )}
        </div>

        {analysis.anchorAxes && analysis.anchorAxes.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">Anchored Axes</Badge>
                <span className="text-xs font-semibold text-slate-500">User-defined semantic measurements</span>
              </div>
              <Badge variant="outline" className="border-slate-200 bg-white text-[11px] font-semibold text-slate-600">
                {analysis.anchorAxes.length} axes
              </Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {analysis.anchorAxes.map((axis, idx) => {
                const conceptScores = analysis.anchorAxisScores?.concepts || {};
                const jurorScores = analysis.anchorAxisScores?.jurors || {};
                const topConcept = Object.entries(conceptScores)
                  .sort((a, b) => (b[1]?.[axis.id] ?? 0) - (a[1]?.[axis.id] ?? 0))[0];
                const topJuror = Object.entries(jurorScores)
                  .sort((a, b) => (b[1]?.[axis.id] ?? 0) - (a[1]?.[axis.id] ?? 0))[0];

                return (
                  <div key={axis.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className="text-sm font-bold"
                        style={{
                          borderColor: axisColorList[idx % axisColorList.length],
                          color: "#0f172a",
                          backgroundColor: lightenColor(axisColorList[idx % axisColorList.length], 0.9),
                        }}
                      >
                        {axis.name}
                      </Badge>
                      <span className="text-[10px] text-slate-500">
                        {axis.negativePole.label} ↔ {axis.positivePole.label}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <div>
                        <div className="font-semibold text-slate-700">Top Concept</div>
                        <div className="text-slate-500">{topConcept?.[0] ?? "N/A"}</div>
                        <div className="font-bold text-indigo-600">{(topConcept?.[1]?.[axis.id] ?? 0).toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-700">Top Juror</div>
                        <div className="text-slate-500">{topJuror?.[0] ?? "N/A"}</div>
                        <div className="font-bold text-indigo-600">{(topJuror?.[1]?.[axis.id] ?? 0).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Concept Analysis */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            {renderHeading(<Sparkles className="h-5 w-5" />, "bg-emerald-50 text-emerald-700", "Concept Analysis", "Juror ownership & evidence")}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-slate-200 bg-white text-[11px] font-semibold text-slate-600">
                {analysis.stats.totalConcepts}
              </Badge>
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
            </div>
          </div>
          <div className="space-y-3 px-5 py-4">
            {visibleConcepts.map((concept) => {
              const distribution = (conceptJurorDistribution.get(concept.id) || [])
                .slice()
                .sort((a, b) => b.weight - a.weight)
                .slice();
              const showAll = showAllJurorContribs[concept.id] ?? false;
              const visibleDistribution = showAll ? distribution : distribution.slice(0, 3);
              const topSentence = concept.representativeSentences?.[0];
              const conceptInsight = insights?.[concept.id];
              const aiLabel = resolveInsightLabel(conceptInsight?.shortLabel);
              const isLoadingLabel = conceptInsight?.isLoadingLabel;
              const topTerms = Array.isArray(concept.topTerms) ? concept.topTerms : [];
              
              const isExpanded = expandedPrimaryConcepts.has(concept.id);
              const detailIds = analysis.conceptHierarchy?.[concept.id] || [];
              const hasDetails = detailIds.length > 0;

              return (
                <div key={concept.id} className="space-y-2">
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-sm font-bold"
                          style={{
                            borderColor: conceptColors.get(concept.id)?.base ?? "#cbd5e1",
                            color: "#0f172a",
                            backgroundColor: conceptColors.get(concept.id)?.soft ?? "#f8fafc",
                          }}
                        >
                          <span
                            className="mr-1 inline-block h-2 w-2 rounded-full border border-black flex-shrink-0"
                            style={{ backgroundColor: conceptColors.get(concept.id)?.base ?? "#334155" }}
                          />
                          {aiLabel || concept.label}
                        </Badge>
                        {aiLabel && (
                          <Badge variant="outline" className="border-indigo-100 bg-white text-[10px] font-semibold text-indigo-700">
                            AI label
                          </Badge>
                        )}
                        {isLoadingLabel && !aiLabel && (
                          <Badge variant="outline" className="border-slate-200 bg-white text-[10px] font-semibold text-slate-500">
                            Labeling...
                          </Badge>
                        )}
                        {hasDetails && (
                          <button 
                            onClick={() => togglePrimaryConceptExpand(concept.id)}
                            className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors ml-1"
                          >
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            {detailIds.length} subthemes
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Juror attribution
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="border-slate-200 bg-white text-[11px] font-semibold text-slate-600">
                          {distribution.length} jurors
                        </Badge>
                        {distribution.length > 3 && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowAllJurorContribs((prev) => ({
                                ...prev,
                                [concept.id]: !showAll,
                              }))
                            }
                            className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
                          >
                            {showAll ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {visibleDistribution.length > 0 ? (
                        visibleDistribution.map((entry) => {
                          const colors = conceptColors.get(concept.id);
                          const jurorColor = jurorColors.get(entry.juror);
                          return (
                            <Badge
                              key={entry.juror}
                              variant="secondary"
                              className="bg-white text-slate-700"
                              style={{
                                backgroundColor: jurorColor?.soft ?? colors?.soft ?? "#f8fafc",
                                color: jurorColor?.base ?? colors?.base ?? "#334155",
                                borderColor: jurorColor?.base ?? colors?.base ?? "transparent",
                                borderWidth: "1px",
                              }}
                            >
                              <span
                                className="mr-1 inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: jurorColor?.base ?? colors?.base ?? "#334155" }}
                            />
                            {entry.juror} | {formatPercent(entry.weight)}
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
                        "{topSentence}"
                      </div>
                    )}

                    {topTerms.length > 0 && (
                      <div className="mt-3 rounded-lg border border-slate-100 bg-white/80 p-2">
                        <div className="mb-1 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          <Sparkles className="h-3 w-3" />
                          BM25 Frequency Terms
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {topTerms.map((term) => (
                            <Badge
                              key={`${concept.id}-${term}`}
                              variant="secondary"
                              className="text-[10px] px-2 py-0.5 font-medium"
                              style={{
                                backgroundColor: conceptColors.get(concept.id)?.soft ?? "#f8fafc",
                                color: conceptColors.get(concept.id)?.base ?? "#334155",
                                borderColor: conceptColors.get(concept.id)?.base ?? "#e2e8f0",
                              }}
                            >
                              {term}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Detail Subthemes Expansion */}
                  {isExpanded && detailIds.length > 0 && (
                    <div className="ml-6 space-y-2 border-l-2 border-indigo-100 pl-4 py-1">
                      {detailIds.map(dId => {
                        const detail = analysis.detailConcepts?.find(dc => dc.id === dId);
                        if (!detail) return null;
                        
                        const detailDistribution = (analysis.jurorVectorsDetail ? Object.keys(analysis.jurorVectorsDetail).map(j => ({
                          juror: j,
                          weight: analysis.jurorVectorsDetail![j][dId] ?? 0
                        })).filter(d => d.weight > 0).sort((a, b) => b.weight - a.weight) : []).slice(0, 3);

                        return (
                          <div key={dId} className="rounded-lg border border-slate-100 bg-white p-2.5 shadow-sm">
                            <div className="mb-1.5 flex items-center gap-2">
                              <Badge variant="outline" className="text-[11px] font-bold py-0 h-5 border-indigo-200 text-indigo-700 bg-indigo-50/30">
                                {detail.label}
                              </Badge>
                              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-slate-100 text-slate-500 border-none">
                                Subtheme
                              </Badge>
                            </div>
                            
                            <div className="flex flex-wrap gap-1 mb-2">
                              {detailDistribution.map(entry => (
                                <span key={entry.juror} className="text-[9px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                  {entry.juror} | {formatPercent(entry.weight, 0)}
                                </span>
                              ))}
                            </div>

                            {detail.topTerms && detail.topTerms.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {detail.topTerms.slice(0, 5).map(term => (
                                  <span key={term} className="text-[9px] text-indigo-600/70 italic">
                                    #{term}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {exportSections.length > 0 && (
          <section
            aria-hidden="true"
            className="hidden print:block"
          >
            <div className="mx-auto max-w-5xl rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 print:border-slate-300 print:bg-white print:shadow-none print:p-5 print:break-inside-avoid">
              <div className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                  Raw Data Export
                </p>
                <p className="text-[10px] text-slate-500">
                  Compact formatted analysis data for reference
                </p>
              </div>
              {exportSections.map((section) => (
                <pre
                  key={section.title}
                  className="font-mono text-[9px] leading-tight text-slate-700 whitespace-pre-wrap break-words print:text-[8px]"
                >
                  {section.content}
                </pre>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
