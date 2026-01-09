"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Terminal } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { GraphNode, GraphLink } from "@/types/graph";
import type { AnalysisResult } from "@/types/analysis";
import type { JurorBlock } from "@/types/nlp";
import type { SentenceRecord } from "@/types/analysis";

interface InspectorConsoleProps {
  analysis: AnalysisResult | null;
  selectedNode: GraphNode | null;
  selectedLink: GraphLink | null;
  evidence: SentenceRecord[];
  jurorBlocks: JurorBlock[];
  empty: boolean;
  isEmbedded?: boolean;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  type: "node" | "link" | "keyword" | "analysis" | "info";
  message: string;
  data?: unknown;
}

export function InspectorConsole({
  analysis,
  selectedNode,
  selectedLink,
  isEmbedded = false,
}: InspectorConsoleProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new logs are added
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Add log entry helper
  const addLog = useCallback((type: LogEntry["type"], message: string, data?: unknown) => {
    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type,
      message,
      data,
    };
    setLogs((prev) => [...prev, entry]);
  }, []);

  // Log node selection
  useEffect(() => {
    if (selectedNode) {
      addLog("node", `Selected node: ${selectedNode.label} (${selectedNode.type})`, selectedNode);
    }
  }, [selectedNode, addLog]);

  // Log link selection
  useEffect(() => {
    if (selectedLink) {
      addLog("link", `Selected link: ${selectedLink.kind}`, selectedLink);
    }
  }, [selectedLink, addLog]);

  // Log keywords when analysis completes
  useEffect(() => {
    if (analysis && analysis.stats.totalConcepts > 0) {
      const conceptLabels = analysis.nodes
        .filter((n) => n.type === "concept")
        .slice(0, 10)
        .map((n) => n.label)
        .join(", ");
      addLog("keyword", `Keywords extracted: ${conceptLabels}${analysis.stats.totalConcepts > 10 ? "..." : ""}`);
      addLog("analysis", `Analysis complete: ${analysis.stats.totalSentences} sentences, ${analysis.stats.totalConcepts} concepts`);
    }
  }, [analysis, addLog]);

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
      default:
        return "text-slate-500";
    }
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
          <div className="space-y-1.5">
            {logs.map((log) => (
              <div key={log.id} className="group flex gap-3 transition-colors hover:bg-white/5">
                <span className="w-14 flex-shrink-0 font-bold text-slate-600">{formatTime(log.timestamp)}</span>
                <span className={cn("w-3 flex-shrink-0 text-center font-bold", getLogColor(log.type))}>
                  {getLogIcon(log.type)}
                </span>
                <span className="text-slate-300 group-hover:text-white">{log.message}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
