"use client";

import { useEffect, useRef, useState } from "react";
import { Terminal, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface LogEntry {
  id: string;
  timestamp: Date;
  type: "node" | "link" | "keyword" | "analysis" | "info" | "api_request" | "api_response" | "api_error" | "quality" | "hierarchy";
  message: string;
  data?: unknown;
}

export type LogPhase = "segment" | "analysis" | "quality" | "dimensions" | "axis" | "report" | "general";
export type LogSubPhase = "AutoK+Seed";

const PHASE_ORDER: LogPhase[] = ["segment", "analysis", "quality", "dimensions", "axis", "report", "general"];
const PHASE_LABELS: Record<LogPhase, string> = {
  segment: "Segment",
  analysis: "Analysis",
  quality: "Quality",
  dimensions: "Dimensions",
  axis: "Axis labels",
  report: "Report",
  general: "General",
};
const DEFAULT_PHASE_EXPANDED: Record<LogPhase, boolean> = {
  segment: true,
  analysis: true,
  quality: true,
  dimensions: true,
  axis: true,
  report: true,
  general: false,
};
const DEFAULT_SUBPHASE_EXPANDED: Record<LogSubPhase, boolean> = {
  "AutoK+Seed": false,
};

const normalizePhase = (phase?: string): LogPhase | null => {
  if (!phase) return null;
  const normalized = phase.trim().toLowerCase();
  switch (normalized) {
    case "segment":
      return "segment";
    case "analysis":
      return "analysis";
    case "quality":
      return "quality";
    case "dimensions":
      return "dimensions";
    case "axis":
    case "axis label":
    case "axis labels":
      return "axis";
    case "report":
      return "report";
    case "general":
      return "general";
    default:
      return null;
  }
};

const normalizeSubPhase = (subPhase?: string): LogSubPhase | null => {
  if (!subPhase) return null;
  const normalized = subPhase.trim().toLowerCase();
  if (normalized === "autok+seed") return "AutoK+Seed";
  return null;
};

export const getPhaseFromMessage = (type: LogEntry["type"], message: string): { phase: LogPhase; subPhase?: LogSubPhase } => {
  const trimmed = message.trim();
  const autoKSeedPrefixes = [
    "Auto-Seed progress",
    "AutoK+Seed K=",
    "AutoK+Seed selected",
    "Auto-Seed leaderboard",
  ];
  if (autoKSeedPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
    return { phase: "analysis", subPhase: "AutoK+Seed" };
  }

  const segmentPrefixes = ["Segmenting", "Text segmented"];
  if (segmentPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
    return { phase: "segment" };
  }

  const qualityPrefixes = ["Primary cut quality", "Quality warning"];
  if (qualityPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
    return { phase: "quality" };
  }

  const dimensionPrefixes = ["Visualization uses", "Auto dimension"];
  if (dimensionPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
    return { phase: "dimensions" };
  }

  const axisPrefixes = ["Enhancing axis labels", "Axis labels enhanced"];
  if (axisPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
    return { phase: "axis" };
  }

  const reportPrefixes = ["Report saved", "Loaded report"];
  if (reportPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
    return { phase: "report" };
  }

  const analysisPrefixes = [
    "Preparing sentences",
    "Chunking feedback",
    "Embedding text",
    "Optimizing cluster count",
    "Clustering concepts",
    "Labeling concepts",
    "Computing juror vectors",
    "PCA + 3D",
    "Building graph",
    "AutoK+Seed testing K range",
    "Two-layer",
    "Detail granularity",
    "Built hierarchy",
    "Concepts:",
    "Analysis complete",
  ];
  if (analysisPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
    return { phase: "analysis" };
  }

  if (type === "quality") return { phase: "quality" };
  if (type === "analysis" || type === "hierarchy") return { phase: "analysis" };
  if (type === "node" || type === "link") return { phase: "general" };
  if (type === "api_error" || type === "info") return { phase: "general" };
  return { phase: "general" };
};

const getPhaseFromData = (data: unknown): { phase?: LogPhase; subPhase?: LogSubPhase } => {
  if (!data || typeof data !== "object") return {};
  const record = data as Record<string, unknown>;
  const phaseValue = typeof record.phase === "string" ? normalizePhase(record.phase) : null;
  const subPhaseValue = typeof record.subPhase === "string" ? normalizeSubPhase(record.subPhase) : null;
  return {
    phase: phaseValue ?? undefined,
    subPhase: subPhaseValue ?? undefined,
  };
};

const getPhaseForLog = (log: LogEntry): { phase: LogPhase; subPhase?: LogSubPhase } => {
  const inferred = getPhaseFromMessage(log.type, log.message);
  const fromData = getPhaseFromData(log.data);
  return {
    phase: fromData.phase ?? inferred.phase,
    subPhase: fromData.subPhase ?? inferred.subPhase,
  };
};

const getRunIdFromData = (data: unknown) => {
  if (!data || typeof data !== "object") return null;
  const record = data as Record<string, unknown>;
  if (typeof record.runId !== "string") return null;
  return record.runId.trim() ? record.runId : null;
};

interface InspectorConsoleProps {
  logs: LogEntry[];
  isEmbedded?: boolean;
}

export function InspectorConsole({
  logs,
  isEmbedded = false,
}: InspectorConsoleProps) {
  const logEndRef = useRef<HTMLDivElement>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [expandedPhases, setExpandedPhases] = useState<Record<LogPhase, boolean>>(() => ({ ...DEFAULT_PHASE_EXPANDED }));
  const [expandedSubPhases, setExpandedSubPhases] = useState<Record<LogSubPhase, boolean>>(() => ({ ...DEFAULT_SUBPHASE_EXPANDED }));

  // Scroll to bottom when new logs are added
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const toggleExpand = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const togglePhase = (phase: LogPhase) => {
    setExpandedPhases((prev) => ({ ...prev, [phase]: !prev[phase] }));
  };

  const toggleSubPhase = (subPhase: LogSubPhase) => {
    setExpandedSubPhases((prev) => ({ ...prev, [subPhase]: !prev[subPhase] }));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const getLogIcon = (type: LogEntry["type"]) => {
    switch (type) {
      case "node":
        return "●";
      case "link":
        return "→";
      case "keyword":
        return "🔑";
      case "analysis":
        return "⚙";
      case "api_request":
        return "↑";
      case "api_response":
        return "↓";
      case "api_error":
        return "⚠";
      case "quality":
        return "✓";
      case "hierarchy":
        return "⊞";
      default:
        return "ℹ";
    }
  };

  const getLogColor = (type: LogEntry["type"]) => {
    switch (type) {
      case "node":
        return "text-blue-400";
      case "link":
        return "text-purple-400";
      case "keyword":
        return "text-emerald-400";
      case "analysis":
        return "text-orange-400";
      case "api_request":
        return "text-cyan-400";
      case "api_response":
        return "text-indigo-400";
      case "api_error":
        return "text-red-400";
      case "quality":
        return "text-green-400";
      case "hierarchy":
        return "text-fuchsia-400";
      default:
        return "text-slate-500";
    }
  };

  const phaseBuckets: Record<LogPhase, LogEntry[]> = {
    segment: [],
    analysis: [],
    quality: [],
    dimensions: [],
    axis: [],
    report: [],
    general: [],
  };
  const autoKSeedLogs: LogEntry[] = [];
  const runIds = new Set<string>();

  logs.forEach((log) => {
    const { phase, subPhase } = getPhaseForLog(log);
    const runId = getRunIdFromData(log.data);
    if (runId) runIds.add(runId);
    if (phase === "analysis" && subPhase === "AutoK+Seed") {
      autoKSeedLogs.push(log);
    } else {
      phaseBuckets[phase].push(log);
    }
  });

  const showRunId = runIds.size > 1;

  const renderLogRow = (log: LogEntry) => {
    const keywordData =
      log.type === "keyword" &&
      log.data !== null &&
      typeof log.data === "object" &&
      "keywords" in log.data
        ? (log.data as { keywords: string[] })
        : null;
    const isKeywordLog = Boolean(keywordData);
    const keywords = keywordData?.keywords ?? null;
    const isExpanded = expandedLogs.has(log.id);
    const runId = showRunId ? getRunIdFromData(log.data) : null;

    return (
      <div key={log.id} className="group">
        <div
          className={cn("flex gap-3 transition-colors hover:bg-white/5", isKeywordLog && "cursor-pointer")}
          onClick={() => isKeywordLog && toggleExpand(log.id)}
        >
          <span className="w-14 flex-shrink-0 font-bold text-slate-600">{formatTime(log.timestamp)}</span>
          <span className={cn("w-3 flex-shrink-0 text-center font-bold", getLogColor(log.type))}>
            {getLogIcon(log.type)}
          </span>
          <div className="flex-1 flex items-start gap-2">
            {runId && (
              <span className="mt-0.5 rounded bg-slate-800/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                {runId.slice(0, 8)}
              </span>
            )}
            <span className="text-slate-300 group-hover:text-white">{log.message}</span>
            {isKeywordLog && (
              <span className="flex-shrink-0 text-slate-500 mt-0.5">
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </span>
            )}
          </div>
        </div>
        {isKeywordLog && isExpanded && keywords && (
          <div className="ml-[5.75rem] mt-1 mb-2 pl-5 text-slate-400 border-l-2 border-slate-700">
            <div className="flex flex-wrap gap-1.5">
              {keywords.map((keyword, idx) => (
                <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded bg-slate-800/50 text-[10px]">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex h-full flex-col overflow-hidden bg-[#0c111d]", !isEmbedded && "border-t border-slate-200")}>
      <div className="flex-1 overflow-y-auto p-5 font-mono text-[11px] leading-relaxed">
        {logs.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-600">
            <Terminal className="mb-4 h-8 w-8 opacity-20" />
            <p>System initialized. Waiting for interaction...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {PHASE_ORDER.map((phase) => {
              const entries = phase === "analysis" ? phaseBuckets.analysis : phaseBuckets[phase];
              const count = phase === "analysis" ? entries.length + autoKSeedLogs.length : entries.length;
              if (count === 0) return null;
              const isExpanded = expandedPhases[phase] ?? true;
              const showSubPhase = phase === "analysis" && autoKSeedLogs.length > 0;
              const isSubPhaseExpanded = expandedSubPhases["AutoK+Seed"] ?? false;

              return (
                <div key={phase} className="rounded-md border border-slate-800/70 bg-slate-900/30">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:bg-white/5"
                    onClick={() => togglePhase(phase)}
                  >
                    {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                    <span className="flex-1">{PHASE_LABELS[phase]}</span>
                    <span className="rounded-full bg-slate-800/70 px-2 py-0.5 text-[9px] text-slate-300">{count}</span>
                  </button>
                  {isExpanded && (
                    <div className="space-y-1.5 px-2.5 pb-2">
                      {entries.map(renderLogRow)}
                      {showSubPhase && (
                        <div className="mt-2 rounded-md border border-slate-800/60 bg-slate-950/40">
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 hover:bg-white/5"
                            onClick={() => toggleSubPhase("AutoK+Seed")}
                          >
                            {isSubPhaseExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            <span className="flex-1">AutoK+Seed</span>
                            <span className="rounded-full bg-slate-800/70 px-2 py-0.5 text-[9px] text-slate-300">
                              {autoKSeedLogs.length}
                            </span>
                          </button>
                          {isSubPhaseExpanded && (
                            <div className="space-y-1.5 px-2.5 pb-2">
                              {autoKSeedLogs.map(renderLogRow)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
