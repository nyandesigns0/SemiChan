"use client";

import { X, Activity, BarChart3, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { NodeInspector } from "./NodeInspector";
import { LinkInspector } from "./LinkInspector";
import type { GraphNode, GraphLink } from "@/types/graph";
import type { AnalysisResult, SentenceRecord } from "@/types/analysis";
import type { JurorBlock } from "@/types/nlp";
import { cn } from "@/lib/utils/cn";
import type { ConceptInsight } from "@/hooks/useConceptSummarizer";

interface FloatingDetailsPanelProps {
  selectedNode: GraphNode | null;
  selectedLink: GraphLink | null;
  analysis: AnalysisResult | null;
  jurorBlocks: JurorBlock[];
  insights: Record<string, ConceptInsight>;
  evidence: SentenceRecord[];
  onFetchSummary: (conceptId: string) => void;
  onClose: () => void;
}

export function FloatingDetailsPanel({
  selectedNode,
  selectedLink,
  analysis,
  jurorBlocks,
  insights,
  evidence,
  onFetchSummary,
  onClose,
}: FloatingDetailsPanelProps) {
  if (!selectedNode && !selectedLink) return null;
  if (!analysis) return null;

  return (
    <div className="absolute top-4 right-4 z-50 w-96 rounded-2xl border border-slate-200 bg-white/95 p-0 shadow-2xl backdrop-blur-sm transition-all duration-300 animate-in fade-in slide-in-from-right-4 max-h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-slate-50/50">
        <div className="flex items-center gap-3 min-w-0">
          <div className="rounded-lg bg-white p-1.5 text-indigo-600 shadow-sm border border-slate-100 shrink-0">
            {selectedNode ? <Activity className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <div className="flex items-center gap-2 mb-0.5">
              <Badge variant="outline" className="border-blue-100 bg-blue-50/50 text-blue-600 px-1.5 py-0 text-[8px] font-bold uppercase h-3.5 shrink-0">
                {selectedNode ? selectedNode.type : selectedLink?.kind.replace(/([A-Z])/g, ' $1')}
              </Badge>
            </div>
            <div className="relative overflow-hidden mask-fade-edges">
              <h3 
                className={cn(
                  "text-sm font-black tracking-tight text-slate-900 leading-tight",
                  selectedNode && selectedNode.label.length > 30 ? "animate-marquee" : "truncate"
                )} 
                title={selectedNode ? selectedNode.label : ""}
              >
                {selectedNode ? selectedNode.label : (
                  <span className="flex items-center gap-1">
                    {typeof selectedLink?.source === "string" ? selectedLink.source : selectedLink?.source.id} 
                    <Link2 className="h-3 w-3 text-slate-400" /> 
                    {typeof selectedLink?.target === "string" ? selectedLink.target : selectedLink?.target.id}
                  </span>
                )}
              </h3>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          className="h-8 w-8 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 shrink-0"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {selectedNode ? (
          <div className="w-full">
            <NodeInspector
              node={selectedNode}
              analysis={analysis}
              jurorBlocks={jurorBlocks}
              insight={insights[selectedNode.id]}
              onFetchSummary={onFetchSummary}
            />
          </div>
        ) : selectedLink ? (
          <div className="w-full">
            <LinkInspector link={selectedLink} evidence={evidence} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

