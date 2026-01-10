"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { 
  Terminal, 
  Book, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Maximize2,
  Activity,
  BarChart3
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils/cn";
import { NodeInspector } from "./NodeInspector";
import { LinkInspector } from "./LinkInspector";
import { InspectorConsole } from "./InspectorConsole";
import { SchemaExplanation } from "@/components/schema/SchemaExplanation";
import type { GraphNode, GraphLink } from "@/types/graph";
import type { AnalysisResult } from "@/types/analysis";
import type { JurorBlock } from "@/types/nlp";
import type { SentenceRecord } from "@/types/analysis";
import type { ConceptInsight } from "@/hooks/useConceptSummarizer";

interface InspectorPanelProps {
  analysis: AnalysisResult | null;
  selectedNode: GraphNode | null;
  selectedLink: GraphLink | null;
  evidence: SentenceRecord[];
  jurorBlocks: JurorBlock[];
  empty: boolean;
  insights?: Record<string, ConceptInsight>;
  onFetchSummary?: (conceptId: string) => void;
}

type TabType = "console" | "details" | "schema";

const MIN_HEIGHT = 40;
const DEFAULT_HEIGHT = 350;
const MAX_HEIGHT = 800;

export function InspectorPanel({
  analysis,
  selectedNode,
  selectedLink,
  evidence,
  jurorBlocks,
  empty,
  insights = {},
  onFetchSummary,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("console");
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Auto-switch to details when something is selected
  useEffect(() => {
    if (selectedNode || selectedLink) {
      setActiveTab("details");
      if (isCollapsed) {
        setIsCollapsed(false);
        setHeight(DEFAULT_HEIGHT);
      }
    }
  }, [selectedNode, selectedLink]);

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
            active={activeTab === "console"}
            onClick={() => { setActiveTab("console"); setIsCollapsed(false); }}
            icon={<Terminal className="h-3.5 w-3.5" />}
            label="Console"
            count={0} // We'll need to pass log count here later if possible
          />
          <TabButton
            active={activeTab === "details"}
            onClick={() => { setActiveTab("details"); setIsCollapsed(false); }}
            icon={<Activity className="h-3.5 w-3.5" />}
            label="Details"
            isActiveSelection={!!(selectedNode || selectedLink)}
          />
          <TabButton
            active={activeTab === "schema"}
            onClick={() => { setActiveTab("schema"); setIsCollapsed(false); }}
            icon={<Book className="h-3.5 w-3.5" />}
            label="Schema"
          />
        </div>

        {/* Center: Current Status (Visible when collapsed or for context) */}
        {isCollapsed && (
          <div className="flex flex-1 items-center justify-center px-4 overflow-hidden">
            <span className="truncate text-[10px] font-medium text-slate-400 uppercase tracking-tight">
              {activeTab === "console" ? "System Logs Active" : 
               activeTab === "details" ? (selectedNode ? `Node: ${selectedNode.label}` : selectedLink ? `Edge Selected` : "No Selection") : 
               "Explainable NLP Schema"}
            </span>
          </div>
        )}

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
          {activeTab === "console" && (
            <InspectorConsole
              analysis={analysis}
              selectedNode={selectedNode}
              selectedLink={selectedLink}
              evidence={evidence}
              jurorBlocks={jurorBlocks}
              empty={empty}
              isEmbedded={true}
            />
          )}

          {activeTab === "details" && (
            <div className="flex h-full overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 pt-6 pb-0">
                {empty || !analysis ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                    <Info className="mb-4 h-12 w-12 opacity-10" />
                    <p className="max-w-[200px] text-sm font-medium leading-relaxed">
                      Run analysis to see detailed node and edge properties.
                    </p>
                  </div>
                ) : selectedNode ? (
                  <div className="w-full">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500/70">
                          <BarChart3 className="h-3 w-3" />
                          {selectedNode.type} Properties
                        </div>
                        <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-900">{selectedNode.label}</h2>
                      </div>
                      <Badge variant="outline" className="border-blue-100 bg-blue-50/50 text-blue-600 px-3 py-1 font-bold">
                        ACTIVE
                      </Badge>
                    </div>
                    <Separator className="bg-slate-200/60 mb-3" />
                    <NodeInspector 
                      node={selectedNode} 
                      analysis={analysis} 
                      jurorBlocks={jurorBlocks} 
                      insight={insights[selectedNode.id]} 
                      onFetchSummary={onFetchSummary}
                    />
                  </div>
                ) : selectedLink ? (
                  <div className="w-full space-y-8">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-500/70">
                        Relationship Analysis
                      </div>
                      <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-900 capitalize">
                        {selectedLink.kind.replace(/([A-Z])/g, ' $1')}
                      </h2>
                    </div>
                    <Separator className="bg-slate-200/60" />
                    <LinkInspector link={selectedLink} evidence={evidence} />
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                    <div className="mb-6 rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/50">
                      <Activity className="h-8 w-8 text-blue-500/40" />
                    </div>
                    <p className="text-sm font-bold text-slate-500">No element selected</p>
                    <p className="mt-2 text-xs text-slate-400">Click a node or edge on the graph to inspect its properties.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "schema" && (
            <div className="h-full overflow-y-auto p-8 bg-white">
              <div className="mx-auto max-w-5xl">
                <SchemaExplanation />
              </div>
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
  isActiveSelection?: boolean;
}

function TabButton({ active, onClick, icon, label, count, isActiveSelection }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex h-8 items-center gap-2 rounded-lg px-3 transition-all",
        active 
          ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <span className={cn(active ? "text-white" : "text-slate-400 group-hover:text-slate-900")}>
        {icon}
      </span>
      <span className="text-xs font-bold tracking-tight">{label}</span>
      {isActiveSelection && !active && (
        <span className="absolute -right-1 -top-1 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
        </span>
      )}
      {typeof count === "number" && count > 0 && (
        <span className={cn(
          "ml-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-black",
          active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
