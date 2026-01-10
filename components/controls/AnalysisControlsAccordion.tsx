"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { AnalysisControls } from "./AnalysisControls";

interface AnalysisControlsAccordionProps {
  kConcepts: number;
  onKConceptsChange: (value: number) => void;
  minEdgeWeight: number;
  onMinEdgeWeightChange: (value: number) => void;
  similarityThreshold: number;
  onSimilarityThresholdChange: (value: number) => void;
  semanticWeight: number;
  onSemanticWeightChange: (value: number) => void;
  frequencyWeight: number;
  onFrequencyWeightChange: (value: number) => void;
  
  // New props
  clusteringMode: "kmeans" | "hierarchical" | "hybrid";
  onClusteringModeChange: (mode: "kmeans" | "hierarchical" | "hybrid") => void;
  autoK: boolean;
  onAutoKChange: (value: boolean) => void;
  softMembership: boolean;
  onSoftMembershipChange: (value: boolean) => void;
  cutType: "count" | "granularity";
  onCutTypeChange: (type: "count" | "granularity") => void;
  granularityPercent: number;
  onGranularityPercentChange: (value: number) => void;
}

export function AnalysisControlsAccordion({
  kConcepts,
  onKConceptsChange,
  minEdgeWeight,
  onMinEdgeWeightChange,
  similarityThreshold,
  onSimilarityThresholdChange,
  semanticWeight,
  onSemanticWeightChange,
  frequencyWeight,
  onFrequencyWeightChange,
  clusteringMode,
  onClusteringModeChange,
  autoK,
  onAutoKChange,
  softMembership,
  onSoftMembershipChange,
  cutType,
  onCutTypeChange,
  granularityPercent,
  onGranularityPercentChange,
}: AnalysisControlsAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 ring-1 ring-indigo-100/50">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-bold text-slate-800">Analysis Controls</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 p-4">
          <AnalysisControls
            kConcepts={kConcepts}
            onKConceptsChange={onKConceptsChange}
            minEdgeWeight={minEdgeWeight}
            onMinEdgeWeightChange={onMinEdgeWeightChange}
            similarityThreshold={similarityThreshold}
            onSimilarityThresholdChange={onSimilarityThresholdChange}
            semanticWeight={semanticWeight}
            onSemanticWeightChange={onSemanticWeightChange}
            frequencyWeight={frequencyWeight}
            onFrequencyWeightChange={onFrequencyWeightChange}
            clusteringMode={clusteringMode}
            onClusteringModeChange={onClusteringModeChange}
            autoK={autoK}
            onAutoKChange={onAutoKChange}
            softMembership={softMembership}
            onSoftMembershipChange={onSoftMembershipChange}
            cutType={cutType}
            onCutTypeChange={onCutTypeChange}
            granularityPercent={granularityPercent}
            onGranularityPercentChange={onGranularityPercentChange}
          />
        </div>
      )}
    </div>
  );
}
