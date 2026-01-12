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
            {logs.map((log) => {
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

              return (
                <div key={log.id} className="group">
                  <div className={cn("flex gap-3 transition-colors hover:bg-white/5", isKeywordLog && "cursor-pointer")} onClick={() => isKeywordLog && toggleExpand(log.id)}>
                    <span className="w-14 flex-shrink-0 font-bold text-slate-600">{formatTime(log.timestamp)}</span>
                    <span className={cn("w-3 flex-shrink-0 text-center font-bold", getLogColor(log.type))}>
                      {getLogIcon(log.type)}
                    </span>
                    <div className="flex-1 flex items-start gap-2">
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
            })}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
