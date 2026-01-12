"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { AnalysisControls } from "./AnalysisControls";
import { AnchorAxesPanel } from "./AnchorAxesPanel";
import type { AnchorAxis } from "@/types/anchor-axes";

interface AnalysisControlsAccordionProps {
  kConcepts: number;
  onKConceptsChange: (value: number) => void;
  minEdgeWeight: number;
  onMinEdgeWeightChange: (value: number) => void;
  similarityThreshold: number;
  onSimilarityThresholdChange: (value: number) => void;
  evidenceRankingParams: { semanticWeight: number; frequencyWeight: number };
  onEvidenceRankingParamsChange: (value: { semanticWeight: number; frequencyWeight: number }) => void;
  
  // New props
  clusteringMode: "kmeans" | "hierarchical";
  onClusteringModeChange: (mode: "kmeans" | "hierarchical" | "hybrid") => void;
  autoK: boolean;
  onAutoKChange: (value: boolean) => void;
  clusterSeed: number;
  onClusterSeedChange: (value: number) => void;
  softMembership: boolean;
  onSoftMembershipChange: (value: boolean) => void;
  cutType: "count" | "granularity";
  onCutTypeChange: (type: "count" | "granularity") => void;
  granularityPercent: number;
  onGranularityPercentChange: (value: number) => void;

  // Visualization Dimensions
  numDimensions: number;
  onNumDimensionsChange: (value: number) => void;
  dimensionMode: "manual" | "elbow" | "threshold";
  onDimensionModeChange: (mode: "manual" | "elbow" | "threshold") => void;
  varianceThreshold: number;
  onVarianceThresholdChange: (value: number) => void;
  appliedNumDimensions?: number;
  anchorAxes: AnchorAxis[];
  onAnchorAxesChange: (axes: AnchorAxis[]) => void;
}

export function AnalysisControlsAccordion({
  kConcepts,
  onKConceptsChange,
  minEdgeWeight,
  onMinEdgeWeightChange,
  similarityThreshold,
  onSimilarityThresholdChange,
  evidenceRankingParams,
  onEvidenceRankingParamsChange,
  clusteringMode,
  onClusteringModeChange,
  autoK,
  onAutoKChange,
  clusterSeed,
  onClusterSeedChange,
  softMembership,
  onSoftMembershipChange,
  cutType,
  onCutTypeChange,
  granularityPercent,
  onGranularityPercentChange,
  numDimensions,
  onNumDimensionsChange,
  dimensionMode,
  onDimensionModeChange,
  varianceThreshold,
  onVarianceThresholdChange,
  appliedNumDimensions,
  anchorAxes,
  onAnchorAxesChange,
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
        <div className="border-t border-slate-100 p-3 pt-2">
          <AnalysisControls
            kConcepts={kConcepts}
            onKConceptsChange={onKConceptsChange}
            minEdgeWeight={minEdgeWeight}
            onMinEdgeWeightChange={onMinEdgeWeightChange}
            similarityThreshold={similarityThreshold}
            onSimilarityThresholdChange={onSimilarityThresholdChange}
            evidenceRankingParams={evidenceRankingParams}
            onEvidenceRankingParamsChange={onEvidenceRankingParamsChange}
            clusteringMode={clusteringMode}
            onClusteringModeChange={onClusteringModeChange}
            autoK={autoK}
            onAutoKChange={onAutoKChange}
            clusterSeed={clusterSeed}
            onClusterSeedChange={onClusterSeedChange}
            softMembership={softMembership}
            onSoftMembershipChange={onSoftMembershipChange}
            cutType={cutType}
            onCutTypeChange={onCutTypeChange}
            granularityPercent={granularityPercent}
            onGranularityPercentChange={onGranularityPercentChange}
            numDimensions={numDimensions}
            onNumDimensionsChange={onNumDimensionsChange}
            dimensionMode={dimensionMode}
            onDimensionModeChange={onDimensionModeChange}
            varianceThreshold={varianceThreshold}
            onVarianceThresholdChange={onVarianceThresholdChange}
            appliedNumDimensions={appliedNumDimensions}
          />
          <div className="mt-4">
            <AnchorAxesPanel axes={anchorAxes} onChange={onAnchorAxesChange} />
          </div>
        </div>
      )}
    </div>
  );
}
