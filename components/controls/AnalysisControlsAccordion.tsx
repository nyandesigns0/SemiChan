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
  evidenceRankingParams: { semanticWeight: number; frequencyWeight: number };
  onEvidenceRankingParamsChange: (value: { semanticWeight: number; frequencyWeight: number }) => void;
  
  // New props
  clusteringMode: "kmeans" | "hierarchical";
  onClusteringModeChange: (mode: "kmeans" | "hierarchical") => void;
  autoK: boolean;
  onAutoKChange: (value: boolean) => void;
  autoUnit: boolean;
  onAutoUnitChange: (value: boolean) => void;
  autoWeights: boolean;
  onAutoWeightsChange: (value: boolean) => void;
  autoSeed: boolean;
  onAutoSeedChange: (value: boolean) => void;
  seedCandidates: number;
  onSeedCandidatesChange: (value: number) => void;
  seedPerturbations: number;
  onSeedPerturbationsChange: (value: number) => void;
  seedCoherenceWeight: number;
  onSeedCoherenceWeightChange: (value: number) => void;
  seedSeparationWeight: number;
  onSeedSeparationWeightChange: (value: number) => void;
  seedStabilityWeight: number;
  onSeedStabilityWeightChange: (value: number) => void;
  seedDominancePenaltyWeight: number;
  onSeedDominancePenaltyWeightChange: (value: number) => void;
  seedMicroClusterPenaltyWeight: number;
  onSeedMicroClusterPenaltyWeightChange: (value: number) => void;
  seedLabelPenaltyWeight: number;
  onSeedLabelPenaltyWeightChange: (value: number) => void;
  seedDominanceThreshold: number;
  onSeedDominanceThresholdChange: (value: number) => void;
  clusterSeed: number;
  onClusterSeedChange: (value: number) => void;
  softMembership: boolean;
  onSoftMembershipChange: (value: boolean) => void;
  cutType: "count" | "granularity";
  onCutTypeChange: (type: "count" | "granularity") => void;
  granularityPercent: number;
  onGranularityPercentChange: (value: number) => void;
  autoKStability: boolean;
  onAutoKStabilityChange: (value: boolean) => void;
  autoKDominanceThreshold: number;
  onAutoKDominanceThresholdChange: (value: number) => void;
  autoKKPenalty: number;
  onAutoKKPenaltyChange: (value: number) => void;
  autoKEpsilon: number;
  onAutoKEpsilonChange: (value: number) => void;
  autoMinClusterSize: boolean;
  onAutoMinClusterSizeChange: (value: boolean) => void;
  minClusterSize?: number;
  onMinClusterSizeChange: (value?: number) => void;
  autoDominanceCap: boolean;
  onAutoDominanceCapChange: (value: boolean) => void;
  autoDominanceCapThreshold?: number;
  onAutoDominanceCapThresholdChange: (value?: number) => void;
  kMinOverride?: number;
  kMaxOverride?: number;
  onKMinOverrideChange: (value?: number) => void;
  onKMaxOverrideChange: (value?: number) => void;

  // Visualization Dimensions
  numDimensions: number;
  onNumDimensionsChange: (value: number) => void;
  dimensionMode: "manual" | "elbow" | "threshold";
  onDimensionModeChange: (mode: "manual" | "elbow" | "threshold") => void;
  varianceThreshold: number;
  onVarianceThresholdChange: (value: number) => void;
  appliedNumDimensions?: number;
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
  autoUnit,
  onAutoUnitChange,
  autoWeights,
  onAutoWeightsChange,
  autoSeed,
  onAutoSeedChange,
  seedCandidates,
  onSeedCandidatesChange,
  seedPerturbations,
  onSeedPerturbationsChange,
  seedCoherenceWeight,
  onSeedCoherenceWeightChange,
  seedSeparationWeight,
  onSeedSeparationWeightChange,
  seedStabilityWeight,
  onSeedStabilityWeightChange,
  seedDominancePenaltyWeight,
  onSeedDominancePenaltyWeightChange,
  seedMicroClusterPenaltyWeight,
  onSeedMicroClusterPenaltyWeightChange,
  seedLabelPenaltyWeight,
  onSeedLabelPenaltyWeightChange,
  seedDominanceThreshold,
  onSeedDominanceThresholdChange,
  clusterSeed,
  onClusterSeedChange,
  softMembership,
  onSoftMembershipChange,
  cutType,
  onCutTypeChange,
  granularityPercent,
  onGranularityPercentChange,
  autoKStability,
  onAutoKStabilityChange,
  autoKDominanceThreshold,
  onAutoKDominanceThresholdChange,
  autoKKPenalty,
  onAutoKKPenaltyChange,
  autoKEpsilon,
  onAutoKEpsilonChange,
  autoMinClusterSize,
  onAutoMinClusterSizeChange,
  minClusterSize,
  onMinClusterSizeChange,
  autoDominanceCap,
  onAutoDominanceCapChange,
  autoDominanceCapThreshold,
  onAutoDominanceCapThresholdChange,
  kMinOverride,
  kMaxOverride,
  onKMinOverrideChange,
  onKMaxOverrideChange,
  numDimensions,
  onNumDimensionsChange,
  dimensionMode,
  onDimensionModeChange,
  varianceThreshold,
  onVarianceThresholdChange,
  appliedNumDimensions,
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
            autoUnit={autoUnit}
            onAutoUnitChange={onAutoUnitChange}
            autoWeights={autoWeights}
            onAutoWeightsChange={onAutoWeightsChange}
            autoSeed={autoSeed}
            onAutoSeedChange={onAutoSeedChange}
            seedCandidates={seedCandidates}
            onSeedCandidatesChange={onSeedCandidatesChange}
            seedPerturbations={seedPerturbations}
            onSeedPerturbationsChange={onSeedPerturbationsChange}
            seedCoherenceWeight={seedCoherenceWeight}
            onSeedCoherenceWeightChange={onSeedCoherenceWeightChange}
            seedSeparationWeight={seedSeparationWeight}
            onSeedSeparationWeightChange={onSeedSeparationWeightChange}
            seedStabilityWeight={seedStabilityWeight}
            onSeedStabilityWeightChange={onSeedStabilityWeightChange}
            seedDominancePenaltyWeight={seedDominancePenaltyWeight}
            onSeedDominancePenaltyWeightChange={onSeedDominancePenaltyWeightChange}
            seedMicroClusterPenaltyWeight={seedMicroClusterPenaltyWeight}
            onSeedMicroClusterPenaltyWeightChange={onSeedMicroClusterPenaltyWeightChange}
            seedLabelPenaltyWeight={seedLabelPenaltyWeight}
            onSeedLabelPenaltyWeightChange={onSeedLabelPenaltyWeightChange}
            seedDominanceThreshold={seedDominanceThreshold}
            onSeedDominanceThresholdChange={onSeedDominanceThresholdChange}
            clusterSeed={clusterSeed}
            onClusterSeedChange={onClusterSeedChange}
            softMembership={softMembership}
            onSoftMembershipChange={onSoftMembershipChange}
            cutType={cutType}
            onCutTypeChange={onCutTypeChange}
            granularityPercent={granularityPercent}
            onGranularityPercentChange={onGranularityPercentChange}
            autoKStability={autoKStability}
            onAutoKStabilityChange={onAutoKStabilityChange}
            autoKDominanceThreshold={autoKDominanceThreshold}
            onAutoKDominanceThresholdChange={onAutoKDominanceThresholdChange}
            autoKKPenalty={autoKKPenalty}
            onAutoKKPenaltyChange={onAutoKKPenaltyChange}
            autoKEpsilon={autoKEpsilon}
            onAutoKEpsilonChange={onAutoKEpsilonChange}
            autoMinClusterSize={autoMinClusterSize}
            onAutoMinClusterSizeChange={onAutoMinClusterSizeChange}
            minClusterSize={minClusterSize}
            onMinClusterSizeChange={onMinClusterSizeChange}
            autoDominanceCap={autoDominanceCap}
            onAutoDominanceCapChange={onAutoDominanceCapChange}
            autoDominanceCapThreshold={autoDominanceCapThreshold}
            onAutoDominanceCapThresholdChange={onAutoDominanceCapThresholdChange}
            kMinOverride={kMinOverride}
            kMaxOverride={kMaxOverride}
            onKMinOverrideChange={onKMinOverrideChange}
            onKMaxOverrideChange={onKMaxOverrideChange}
            numDimensions={numDimensions}
            onNumDimensionsChange={onNumDimensionsChange}
            dimensionMode={dimensionMode}
            onDimensionModeChange={onDimensionModeChange}
            varianceThreshold={varianceThreshold}
            onVarianceThresholdChange={onVarianceThresholdChange}
            appliedNumDimensions={appliedNumDimensions}
          />
        </div>
      )}
    </div>
  );
}
