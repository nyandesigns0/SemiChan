"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { formatCostReadable } from "@/lib/utils/api-utils";
import { Terminal, BarChart3, ChevronDown, ChevronUp, Users, MessageSquare, Lightbulb, Layers, Activity, Hash, Link as LinkIcon, FileText } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { InspectorConsole, type LogEntry } from "./InspectorConsole";
import { AnalysisReport } from "@/components/inspector/AnalysisReport";
import type { RawDataExportContext } from "@/components/inspector/export-types";
import type { AnalysisResult } from "@/types/analysis";
import type { JurorBlock } from "@/types/nlp";
import type { ConceptInsight } from "@/hooks/useConceptSummarizer";
import { ReportsList } from "./ReportsList";
import type { SavedReport } from "@/types/analysis";
import { getAllReports } from "@/lib/utils/report-storage";

export type InspectorTab = "console" | "analysis" | "reports";

interface InspectorPanelProps {
  logs: LogEntry[];
  analysis: AnalysisResult | null;
  jurorBlocks: JurorBlock[];
  axisLabels?: AnalysisResult["axisLabels"];
  enableAxisLabelAI?: boolean;
  isRefreshingAxisLabels?: boolean;
  insights?: Record<string, ConceptInsight>;
  filteredNodesCount?: number;
  filteredLinksCount?: number;
  numDimensions?: number;
  apiCallCount?: number;
  apiCostTotal?: number;
  /** When provided, the panel will follow this tab value. */
  activeTab?: InspectorTab;
  /** Notify parent when a tab changes. */
  onTabChange?: (tab: InspectorTab) => void;
  /** If true, expanding happens automatically when switching to the analysis tab. */
  autoExpandOnAnalysis?: boolean;
  /** Ref to the scrollable analysis container for export/snapshot purposes. */
  analysisContainerRef?: React.RefObject<HTMLDivElement>;
  /** Optional context used by hidden export sections */
  rawExportContext?: RawDataExportContext;
  /** Load a saved report */
  onLoadReport?: (report: SavedReport) => void;
  /** External trigger to refresh report list */
  reportRefreshToken?: number;
  /** Notify when a report is saved */
  onReportSaved?: (report: SavedReport) => void;
}

const MIN_HEIGHT = 40;
const DEFAULT_HEIGHT = 350;
const MAX_HEIGHT = 800;

export function InspectorPanel({
  logs,
  analysis,
  filteredNodesCount = 0,
  filteredLinksCount = 0,
  numDimensions = 0,
  apiCallCount = 0,
  apiCostTotal = 0,
  jurorBlocks,
  axisLabels,
  enableAxisLabelAI,
  isRefreshingAxisLabels,
  insights,
  activeTab,
  onTabChange,
  autoExpandOnAnalysis = false,
  analysisContainerRef,
  rawExportContext,
  onLoadReport,
  reportRefreshToken = 0,
  onReportSaved,
}: InspectorPanelProps) {
  const [internalTab, setInternalTab] = useState<InspectorTab>("console");
  const [height, setHeight] = useState(MIN_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [savedReportCount, setSavedReportCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const expandPanel = useCallback(() => {
    setIsCollapsed(false);
    setHeight((prev) => (prev < DEFAULT_HEIGHT ? DEFAULT_HEIGHT : prev));
  }, []);

  useEffect(() => {
    setSavedReportCount(getAllReports().length);
  }, [reportRefreshToken]);

  // Resizing logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      const clampedHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));
      setHeight(clampedHeight);
      if (clampedHeight < 60) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const currentTab = activeTab ?? internalTab;
  const { amount: formattedCost, unit: costUnit } = formatCostReadable(apiCostTotal);
  const stats = analysis?.stats;
  const prevActiveTabRef = useRef<InspectorTab | null>(null);
  const hasSyncedActiveTabRef = useRef(false);

  useEffect(() => {
    if (!activeTab) return;
    if (!hasSyncedActiveTabRef.current) {
      setInternalTab(activeTab);
      prevActiveTabRef.current = activeTab;
      hasSyncedActiveTabRef.current = true;
      return;
    }

    if (activeTab !== internalTab) {
      setInternalTab(activeTab);
    }
    if (prevActiveTabRef.current !== activeTab) {
      expandPanel();
      if (activeTab === "analysis" && autoExpandOnAnalysis) {
        setHeight((prev) => (prev < DEFAULT_HEIGHT ? DEFAULT_HEIGHT : prev));
      }
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab, internalTab, autoExpandOnAnalysis, expandPanel]);

  const handleTabChange = (tab: InspectorTab) => {
    setInternalTab(tab);
    onTabChange?.(tab);
    expandPanel();
  };

  const toggleCollapse = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setHeight(DEFAULT_HEIGHT);
    } else {
      setIsCollapsed(true);
      setHeight(MIN_HEIGHT);
    }
  };

  return (
    <div
      ref={panelRef}
      className={cn(
        "flex flex-col border-t border-slate-200 bg-white transition-shadow duration-300",
        !isCollapsed && "shadow-[0_-8px_30px_rgb(0,0,0,0.04)]"
      )}
      style={{ height: isCollapsed ? `${MIN_HEIGHT}px` : `${height}px` }}
    >
      {/* Resizer Handle + Navigation Bar */}
      <div 
        className={cn(
          "group relative flex h-10 flex-shrink-0 items-center justify-between border-b border-slate-100 px-4 transition-colors",
          isResizing ? "bg-slate-50" : "bg-white hover:bg-slate-50/50"
        )}
      >
        {/* Resize trigger area */}
        <div 
          className="absolute inset-x-0 -top-1 h-2 cursor-row-resize transition-all group-hover:bg-blue-500/20"
          onMouseDown={handleMouseDown}
        />

        {/* Left Side: Tabs */}
        <div className="flex items-center gap-1">
          <TabButton
            active={currentTab === "console"}
            onClick={() => handleTabChange("console")}
            icon={<Terminal className="h-3.5 w-3.5" />}
            label="Console"
            count={logs.length}
          />
          <TabButton
            active={currentTab === "analysis"}
            onClick={() => handleTabChange("analysis")}
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            label="Analysis"
          />
          <TabButton
            active={currentTab === "reports"}
            onClick={() => handleTabChange("reports")}
            icon={<FileText className="h-3.5 w-3.5" />}
            label="Reports"
            count={savedReportCount}
          />
        </div>

        <div className="flex flex-1 flex-wrap items-center justify-center gap-2 overflow-x-auto px-3">
          {stats && (
            <Badge variant="outline" className="flex items-center gap-1.5 border-slate-200 bg-white px-3 py-1 text-slate-500 shadow-sm">
              <Users className="h-3.5 w-3.5" />
              <span className="flex items-center gap-1">
                <strong className="text-xs font-semibold text-slate-700">{stats.totalJurors}</strong>
                <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-tight text-slate-500">
                  jurors
                </span>
              </span>
            </Badge>
          )}
          {stats && (
            <Badge variant="outline" className="flex items-center gap-1.5 border-slate-200 bg-white px-3 py-1 text-slate-500 shadow-sm">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="flex items-center gap-1">
                <strong className="text-xs font-semibold text-slate-700">{stats.totalSentences}</strong>
                <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-tight text-slate-500">
                  sentences
                </span>
              </span>
            </Badge>
          )}
          {stats && (
            <Badge variant="outline" className="flex items-center gap-1.5 border-slate-200 bg-white px-3 py-1 text-slate-500 shadow-sm">
              <Lightbulb className="h-3.5 w-3.5" />
              <span className="flex items-center gap-1">
                <strong className="text-xs font-semibold text-slate-700">{stats.totalConcepts}</strong>
                <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-tight text-slate-500">
                  concepts
                </span>
              </span>
            </Badge>
          )}
          <Badge variant="outline" className="flex items-center gap-1.5 border-slate-200 bg-white px-3 py-1 text-slate-500 shadow-sm">
            <Layers className="h-3.5 w-3.5" />
            <span className="flex items-center gap-1">
              <strong className="text-xs font-semibold text-slate-700">{numDimensions}</strong>
              <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-tight text-slate-500">
                axes
              </span>
            </span>
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1.5 border-slate-200 bg-white px-3 py-1 text-slate-500 shadow-sm">
            <Activity className="h-3.5 w-3.5" />
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1">
                <strong className="font-semibold text-slate-700">{apiCallCount}</strong>
                <span className="hidden sm:inline text-slate-500">calls</span>
              </span>
              <span className="h-4 w-px bg-slate-200" />
              <span className="flex items-center gap-1">
                <strong className="font-semibold text-slate-700">{formattedCost}</strong>
                <span className="hidden sm:inline text-slate-500">{costUnit}</span>
              </span>
            </div>
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1.5 border border-indigo-100 bg-indigo-50 px-3 py-1 text-indigo-700 shadow-sm">
            <Hash className="h-3.5 w-3.5" />
            <span className="flex items-center gap-1">
              <strong className="text-xs font-semibold text-indigo-700">{filteredNodesCount}</strong>
              <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-tight">Nodes</span>
            </span>
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-1.5 border border-emerald-100 bg-emerald-50 px-3 py-1 text-emerald-700">
            <LinkIcon className="h-3.5 w-3.5" />
            <span className="flex flex-col gap-0.5 text-[10px]">
              <span className="flex items-center gap-1">
                <strong className="font-semibold text-emerald-700">{filteredLinksCount}</strong>
                <span className="hidden sm:inline font-semibold uppercase tracking-tight">Edges</span>
              </span>
              <span className="hidden sm:inline text-emerald-600">
                ({analysis?.links.length ?? 0} total)
              </span>
            </span>
          </Badge>
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCollapse}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden bg-slate-50/30">
          {currentTab === "console" && (
            <InspectorConsole
              logs={logs}
              isEmbedded={true}
            />
          )}

        {currentTab === "analysis" && (
            <div ref={analysisContainerRef} className="h-full overflow-y-auto bg-white">
              <AnalysisReport 
                analysis={analysis} 
                jurorBlocks={jurorBlocks} 
                axisLabels={axisLabels}
                enableAxisLabelAI={enableAxisLabelAI}
                isRefreshingAxisLabels={isRefreshingAxisLabels}
                insights={insights}
                rawExportContext={rawExportContext}
                onReportSaved={onReportSaved}
              />
          </div>
        )}
          {currentTab === "reports" && (
            <div className="h-full overflow-y-auto bg-white">
              <ReportsList
                onLoadReport={(report) => {
                  onLoadReport?.(report);
                  handleTabChange("analysis");
                }}
                refreshToken={reportRefreshToken}
                onCountChange={setSavedReportCount}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}

function TabButton({ active, onClick, icon, label, count }: TabButtonProps) {
  const accessibleLabel = count ? `${label} (${count})` : label;

  return (
    <button
      onClick={onClick}
      aria-label={accessibleLabel}
      className={cn(
        "group relative flex h-8 items-center gap-2 rounded-lg px-3 transition-all",
        active
          ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <span className={cn(active ? "text-white" : "text-slate-400 group-hover:text-slate-900")}>
        {icon}
      </span>
      <span className="hidden sm:inline text-xs font-bold tracking-tight">{label}</span>
      {typeof count === "number" && count > 0 && (
        <span
          className={cn(
            "ml-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-black",
            active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}
