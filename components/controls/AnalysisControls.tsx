"use client";

import { useState } from "react";
import { 
  Brain,
  BarChart3, 
  Fingerprint, 
  Layers, 
  Maximize2, 
  Info, 
  Dices, 
  GitMerge, 
  Zap,
  Target,
  Workflow,
  ChevronDown,
  ChevronUp,
  Type,
  Scale,
  Sparkles,
  Settings2,
  Library,
  Gauge
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

interface AnalysisControlsProps {
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

export function AnalysisControls({
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
}: AnalysisControlsProps) {
  const [showClusteringSettings, setShowClusteringSettings] = useState(false);
  const [showAutoKSettings, setShowAutoKSettings] = useState(false);
  const [showAutoSeedSettings, setShowAutoSeedSettings] = useState(false);
  const [showAutoUnitSettings, setShowAutoUnitSettings] = useState(false);
  const [showAutoWeightsSettings, setShowAutoWeightsSettings] = useState(false);
  const [showClusterHygieneSettings, setShowClusterHygieneSettings] = useState(false);
  const [showEvidenceSettings, setShowEvidenceSettings] = useState(false);
  const [showNetworkSettings, setShowNetworkSettings] = useState(false);
  const [showDimensionSettings, setShowDimensionSettings] = useState(false);
  const effectiveAxes = appliedNumDimensions ?? numDimensions;
  const isAutoDimensionMode = dimensionMode !== "manual";
  const axisBadgeLabel = isAutoDimensionMode
    ? `${effectiveAxes} Axis${effectiveAxes === 1 ? "" : "es"} (auto)`
    : `${numDimensions} Axis${numDimensions === 1 ? "" : "es"}`;

  // Helper to determine the current evidence preset
  const currentEvidencePreset = (() => {
    const s = Math.round(evidenceRankingParams.semanticWeight * 10) / 10;
    const f = Math.round(evidenceRankingParams.frequencyWeight * 10) / 10;
    
    if (s === 0.9 && f === 0.1) return "coherence";
    if (s === 0.1 && f === 0.9) return "salience";
    if (s === 0.7 && f === 0.3) return "balanced";
    if (s === 1.0 && f === 1.0) return "comprehensive";
    return "custom";
  })();
  const evidenceControlsDisabled = autoWeights;

  return (
    <div className="space-y-4">
      {/* Category: Clustering Engine */}
      <div className="space-y-2">
        <Label 
          className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-900"
        >
          <Layers className="h-3 w-3" />
          Clustering Engine
        </Label>
        
        <Tabs value={clusteringMode} onValueChange={(v) => onClusteringModeChange(v as any)}>
          <TabsList className="grid w-full grid-cols-2 bg-slate-100/50 p-1 border border-slate-200/60 rounded-xl" style={{ height: 'auto' }}>
            <TabsTrigger 
              value="kmeans" 
              className="flex items-center gap-1.5 py-1.5 transition-all duration-200"
            >
              <Dices className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-tight">K-Means</span>
            </TabsTrigger>
            <TabsTrigger 
              value="hierarchical" 
              className="flex items-center gap-1.5 py-1.5 transition-all duration-200"
            >
              <GitMerge className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-tight">Tree</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Clustering Settings Accordion */}
        <div className="space-y-2">
          <button 
            onClick={() => setShowClusteringSettings(!showClusteringSettings)}
            className="flex w-full items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-500 transition-colors py-0.5 px-1 border-b border-dashed border-slate-200"
          >
            <div className="flex items-center gap-1.5">
              <Settings2 className="h-3 w-3" />
              Advanced Engine Settings
            </div>
            {showClusteringSettings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showClusteringSettings && (
            <div className="space-y-2.5 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
              {/* Cut Type Toggle */}
              {(clusteringMode === "hierarchical") && (
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold uppercase text-slate-400">Cut Method</Label>
                  <Tabs value={cutType} onValueChange={(v) => onCutTypeChange(v as "count" | "granularity")}>
                    <TabsList className="grid w-full grid-cols-2 bg-slate-100/30 p-1 border border-slate-200/60 rounded-lg" style={{ height: 'auto' }}>
                      <TabsTrigger value="count" className="py-1"><span className="text-[9px] font-bold uppercase">Cut by K</span></TabsTrigger>
                      <TabsTrigger value="granularity" className="py-1"><span className="text-[9px] font-bold uppercase">Granularity</span></TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              )}

              <div className="space-y-2.5 rounded-xl border border-slate-100 bg-slate-50/30 p-2.5">
                {/* Auto-K Toggle */}
                <div className="flex items-center justify-between group">
                  <div className="space-y-0.5">
                    <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Target className="h-3 w-3 text-indigo-500" />
                      Auto-K Discovery
                    </Label>
                  </div>
                  <Switch checked={autoK} onCheckedChange={onAutoKChange} className="scale-75" />
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => setShowAutoKSettings(!showAutoKSettings)}
                    className="flex w-full items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-500 transition-colors py-0.5 px-1"
                  >
                    <div className="flex items-center gap-1.5">
                      <Gauge className="h-3 w-3" />
                      Auto-K Settings
                    </div>
                    {showAutoKSettings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  {showAutoKSettings && (
                    <div className="space-y-2 rounded-lg border border-slate-100 bg-white/60 p-2">
                      <p className="text-[10px] text-slate-500">
                        Default range: sqrt(N) to N/4 (clamped 4-20). Overrides below tweak the search window.
                      </p>
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-indigo-500" />
                          Stability Check
                        </Label>
                        <Switch checked={autoKStability} onCheckedChange={onAutoKStabilityChange} className="scale-75" />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-bold text-slate-700">Dominance Threshold</Label>
                          <Badge variant="secondary" className="bg-indigo-50 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                            {autoKDominanceThreshold.toFixed(2)}
                          </Badge>
                        </div>
                        <Slider
                          value={[autoKDominanceThreshold]}
                          min={0.25}
                          max={0.5}
                          step={0.01}
                          onValueChange={(v) => onAutoKDominanceThresholdChange(v[0])}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-bold text-slate-700">K Penalty</Label>
                          <Badge variant="secondary" className="bg-indigo-50 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                            {autoKKPenalty.toFixed(4)}
                          </Badge>
                        </div>
                        <Slider
                          value={[autoKKPenalty]}
                          min={0.0001}
                          max={0.005}
                          step={0.0001}
                          onValueChange={(v) => onAutoKKPenaltyChange(Number(v[0].toFixed(4)))}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-bold text-slate-700">Epsilon (Tie Bias)</Label>
                          <Badge variant="secondary" className="bg-indigo-50 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                            {autoKEpsilon.toFixed(3)}
                          </Badge>
                        </div>
                        <Slider
                          value={[autoKEpsilon]}
                          min={0.005}
                          max={0.05}
                          step={0.001}
                          onValueChange={(v) => onAutoKEpsilonChange(Number(v[0].toFixed(3)))}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase text-slate-500">kMin Override</Label>
                          <Input
                            type="number"
                            value={kMinOverride ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              onKMinOverrideChange(val === "" ? undefined : Number(val));
                            }}
                            min={2}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase text-slate-500">kMax Override</Label>
                          <Input
                            type="number"
                            value={kMaxOverride ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              onKMaxOverrideChange(val === "" ? undefined : Number(val));
                            }}
                            min={3}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-100" />

                {/* Auto-Seed Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between group">
                    <div className="space-y-0.5">
                      <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Zap className="h-3 w-3 text-indigo-500" />
                        Auto-Seed Selection
                      </Label>
                      <p className="text-[10px] text-slate-400">
                        Optimizes k-means initialization with composite quality scoring.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {autoSeed && clusteringMode === "kmeans" && (
                        <Badge variant="secondary" className="bg-emerald-50 px-1.5 py-0 text-[9px] font-bold text-emerald-700">
                          Auto-Seed: ON
                        </Badge>
                      )}
                      <Switch
                        checked={autoSeed && clusteringMode === "kmeans"}
                        disabled={clusteringMode !== "kmeans"}
                        onCheckedChange={onAutoSeedChange}
                        className="scale-75"
                      />
                    </div>
                  </div>
                  {clusteringMode !== "kmeans" && (
                    <p className="text-[10px] font-semibold text-amber-600">
                      Auto-Seed is available only for k-means mode.
                    </p>
                  )}

                  {clusteringMode === "kmeans" && (
                    <div className="space-y-1">
                      {!autoSeed && (
                        <>
                          <div className="h-px bg-slate-100" />
                          {/* Clustering Seed Slider */}
                          <div className="space-y-1 group">
                            <div className="flex items-center justify-between">
                              <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                <Dices className="h-3 w-3 text-indigo-500" />
                                Solution Seed
                              </Label>
                              <Badge variant="secondary" className="bg-indigo-50 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                                {clusterSeed}
                              </Badge>
                            </div>
                            <Slider 
                              value={[clusterSeed]} 
                              min={1} 
                              max={100} 
                              step={1} 
                              onValueChange={(v) => onClusterSeedChange(v[0])} 
                            />
                          </div>
                        </>
                      )}
                      <button
                        onClick={() => setShowAutoSeedSettings(!showAutoSeedSettings)}
                        className="flex w-full items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-500 transition-colors py-0.5 px-1"
                      >
                        <div className="flex items-center gap-1.5">
                          <Gauge className="h-3 w-3" />
                          Auto-Seed Settings
                        </div>
                        {showAutoSeedSettings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>

                      {showAutoSeedSettings && (
                        <div className="space-y-2 rounded-lg border border-slate-100 bg-white/60 p-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <Label className="text-[11px] font-bold text-slate-700">Candidates</Label>
                                <Badge variant="secondary" className="bg-indigo-50 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                                  {seedCandidates}
                                </Badge>
                              </div>
                              <Slider
                                value={[seedCandidates]}
                                min={16}
                                max={128}
                                step={1}
                                onValueChange={(v) => onSeedCandidatesChange(v[0])}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <Label className="text-[11px] font-bold text-slate-700">Perturbations</Label>
                                <Badge variant="secondary" className="bg-indigo-50 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                                  {seedPerturbations}
                                </Badge>
                              </div>
                              <Slider
                                value={[seedPerturbations]}
                                min={1}
                                max={5}
                                step={1}
                                onValueChange={(v) => onSeedPerturbationsChange(v[0])}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-[11px] font-bold text-slate-700">Coherence Wt</Label>
                                <Badge variant="secondary" className="bg-indigo-50 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                                  {seedCoherenceWeight.toFixed(2)}
                                </Badge>
                              </div>
                              <Slider
                                value={[seedCoherenceWeight]}
                                min={0}
                                max={1}
                                step={0.05}
                                onValueChange={(v) => onSeedCoherenceWeightChange(Number(v[0].toFixed(2)))}
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-[11px] font-bold text-slate-700">Separation Wt</Label>
                                <Badge variant="secondary" className="bg-indigo-50 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                                  {seedSeparationWeight.toFixed(2)}
                                </Badge>
                              </div>
                              <Slider
                                value={[seedSeparationWeight]}
                                min={0}
                                max={1}
                                step={0.05}
                                onValueChange={(v) => onSeedSeparationWeightChange(Number(v[0].toFixed(2)))}
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-[11px] font-bold text-slate-700">Stability Wt</Label>
                                <Badge variant="secondary" className="bg-indigo-50 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                                  {seedStabilityWeight.toFixed(2)}
                                </Badge>
                              </div>
                              <Slider
                                value={[seedStabilityWeight]}
                                min={0}
                                max={1}
                                step={0.05}
                                onValueChange={(v) => onSeedStabilityWeightChange(Number(v[0].toFixed(2)))}
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-[11px] font-bold text-slate-700">Dominance Penalty</Label>
                                <Badge variant="secondary" className="bg-indigo-50 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                                  {seedDominancePenaltyWeight.toFixed(2)}
                                </Badge>
                              </div>
                              <Slider
                                value={[seedDominancePenaltyWeight]}
                                min={0}
                                max={0.5}
                                step={0.01}
                                onValueChange={(v) => onSeedDominancePenaltyWeightChange(Number(v[0].toFixed(2)))}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-[11px] font-bold text-slate-700">Micro-Cluster Penalty</Label>
                                <Badge variant="secondary" className="bg-indigo-50 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                                  {seedMicroClusterPenaltyWeight.toFixed(2)}
                                </Badge>
                              </div>
                              <Slider
                                value={[seedMicroClusterPenaltyWeight]}
                                min={0}
                                max={0.5}
                                step={0.01}
                                onValueChange={(v) => onSeedMicroClusterPenaltyWeightChange(Number(v[0].toFixed(2)))}
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <Label className="text-[11px] font-bold text-slate-700">Label Penalty</Label>
                                <Badge variant="secondary" className="bg-indigo-50 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                                  {seedLabelPenaltyWeight.toFixed(2)}
                                </Badge>
                              </div>
                              <Slider
                                value={[seedLabelPenaltyWeight]}
                                min={0}
                                max={0.5}
                                step={0.01}
                                onValueChange={(v) => onSeedLabelPenaltyWeightChange(Number(v[0].toFixed(2)))}
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-[11px] font-bold text-slate-700">Dominance Threshold</Label>
                              <Badge variant="secondary" className="bg-indigo-50 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                                {seedDominanceThreshold.toFixed(2)}
                              </Badge>
                            </div>
                            <Slider
                              value={[seedDominanceThreshold]}
                              min={0.25}
                              max={0.5}
                              step={0.01}
                              onValueChange={(v) => onSeedDominanceThresholdChange(Number(v[0].toFixed(2)))}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-100" />

                <div className="space-y-2.5">
                  {/* Auto-Unit Toggle */}
                  <div className="flex items-center justify-between group">
                    <div className="space-y-0.5">
                      <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Target className="h-3 w-3 text-indigo-500" />
                        Auto-Unit Discovery
                      </Label>
                      <p className="text-[9px] text-slate-500">Optimize contextual window size</p>
                    </div>
                    <Switch checked={autoUnit} onCheckedChange={onAutoUnitChange} className="scale-75" />
                  </div>

                  {autoUnit && (
                    <div className="space-y-1">
                      <button
                        onClick={() => setShowAutoUnitSettings(!showAutoUnitSettings)}
                        className="flex w-full items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-500 transition-colors py-0.5 px-1"
                      >
                        <div className="flex items-center gap-1.5">
                          <Gauge className="h-3 w-3" />
                          Auto-Unit Settings
                        </div>
                        {showAutoUnitSettings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      {showAutoUnitSettings && (
                        <div className="space-y-2 rounded-lg border border-slate-100 bg-white/60 p-2">
                          <p className="text-[10px] text-slate-500">
                            Tests sentence-only, window-3 (A1), and window-5 (A2) modes against the Auto-K range.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="h-px bg-slate-100" />

                  {/* Auto-Weights Toggle */}
                  <div className="flex items-center justify-between group">
                    <div className="space-y-0.5">
                      <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                        <Scale className="h-3 w-3 text-indigo-500" />
                        Auto-Weights Discovery
                      </Label>
                      <p className="text-[9px] text-slate-500">Optimize semantic/frequency balance</p>
                    </div>
                    <Switch checked={autoWeights} onCheckedChange={onAutoWeightsChange} className="scale-75" />
                  </div>

                  {autoWeights && (
                    <div className="space-y-1">
                      <button
                        onClick={() => setShowAutoWeightsSettings(!showAutoWeightsSettings)}
                        className="flex w-full items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-500 transition-colors py-0.5 px-1"
                      >
                        <div className="flex items-center gap-1.5">
                          <Gauge className="h-3 w-3" />
                          Auto-Weights Settings
                        </div>
                        {showAutoWeightsSettings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      {showAutoWeightsSettings && (
                        <div className="space-y-2 rounded-lg border border-slate-100 bg-white/60 p-2">
                          <p className="text-[10px] text-slate-500">
                            Evaluates 0.9/0.1, 0.8/0.2, 0.7/0.3, and 0.6/0.4 weight pairs for evidence ranking.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-100" />

                {/* Cluster Hygiene */}
                <div className="space-y-1">
                  <button
                    onClick={() => setShowClusterHygieneSettings(!showClusterHygieneSettings)}
                    className="flex w-full items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-500 transition-colors py-0.5 px-1"
                  >
                    <div className="flex items-center gap-1.5">
                      <Gauge className="h-3 w-3" />
                      Cluster Hygiene
                    </div>
                    {showClusterHygieneSettings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  {showClusterHygieneSettings && (
                    <div className="space-y-2 rounded-lg border border-slate-100 bg-white/60 p-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold text-slate-700">Auto Min Cluster Size</Label>
                        <Switch checked={autoMinClusterSize} onCheckedChange={onAutoMinClusterSizeChange} className="scale-75" />
                      </div>

                      {(autoMinClusterSize || minClusterSize !== undefined) && (
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold uppercase text-slate-500">Min Cluster Size Override</Label>
                          <Input
                            type="number"
                            value={minClusterSize ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              onMinClusterSizeChange(val === "" ? undefined : Number(val));
                            }}
                            min={2}
                            className="h-8 text-xs"
                          />
                          <p className="text-[9px] text-slate-400">Leave empty to auto-select 2-5.</p>
                        </div>
                      )}

                      <div className="h-px bg-slate-100" />

                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold text-slate-700">Auto Dominance Cap</Label>
                        <Switch checked={autoDominanceCap} onCheckedChange={onAutoDominanceCapChange} className="scale-75" />
                      </div>

                      {autoDominanceCap && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-[11px] font-bold text-slate-700">Dominance Threshold</Label>
                            <Badge variant="secondary" className="bg-indigo-50 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                              {(autoDominanceCapThreshold ?? 0.35).toFixed(2)}
                            </Badge>
                          </div>
                          <Slider
                            value={[autoDominanceCapThreshold ?? 0.35]}
                            min={0.25}
                            max={0.5}
                            step={0.01}
                            onValueChange={(v) => onAutoDominanceCapThresholdChange(Number(v[0].toFixed(2)))}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="h-px bg-slate-100" />

                {/* Soft Membership Toggle */}
                <div className="flex items-center justify-between group">
                  <div className="space-y-0.5">
                    <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                      <Fingerprint className="h-3 w-3 text-indigo-500" />
                      Allow Overlap
                    </Label>
                  </div>
                  <Switch checked={softMembership} onCheckedChange={onSoftMembershipChange} className="scale-75" />
                </div>

                {/* Manual Concept / Granularity when Auto-K is off */}
                {!autoK && (
                  <>
                    <div className="h-px bg-slate-100" />

                    {(cutType === "count" || (clusteringMode !== "hierarchical")) && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <Target className="h-3 w-3 text-indigo-500" />
                            Manual Concepts (k)
                          </Label>
                          <Badge variant="secondary" className="bg-indigo-50 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                            {kConcepts}
                          </Badge>
                        </div>
                        <Slider 
                          value={[kConcepts]} 
                          min={4} 
                          max={30} 
                          step={1} 
                          onValueChange={(v) => onKConceptsChange(v[0])} 
                        />
                      </div>
                    )}

                    {cutType === "granularity" && (clusteringMode === "hierarchical") && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                            <Scale className="h-3 w-3 text-indigo-500" />
                            Granularity
                          </Label>
                          <Badge variant="secondary" className="bg-indigo-50 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                            {granularityPercent}%
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[8px] text-slate-400 uppercase tracking-tighter">0% fine / 100% broad</p>
                          <Slider 
                            value={[granularityPercent]} 
                            min={0} 
                            max={100} 
                            step={1} 
                            onValueChange={(v) => onGranularityPercentChange(v[0])} 
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator className="bg-slate-100/80" />

      {/* Category: Evidence Ranking Settings */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-900">
            <Library className="h-3 w-3" />
            Evidence Ranking
          </Label>
          {autoWeights && (
            <Badge variant="outline" className="h-4 text-[8px] uppercase border-indigo-200 text-indigo-600 font-bold bg-indigo-50/60 px-1.5">
              Auto-Weights
            </Badge>
          )}
          {!autoWeights && currentEvidencePreset !== "custom" && (
            <Badge variant="outline" className="h-4 text-[8px] uppercase border-indigo-200 text-indigo-500 font-bold bg-indigo-50/50 px-1.5">
              {currentEvidencePreset}
            </Badge>
          )}
        </div>

        <div className="space-y-2">
          {/* Preset Tabs */}
          <Tabs 
            value={currentEvidencePreset} 
            onValueChange={(v) => {
              if (v === "coherence") { onEvidenceRankingParamsChange({ semanticWeight: 0.9, frequencyWeight: 0.1 }); }
              else if (v === "salience") { onEvidenceRankingParamsChange({ semanticWeight: 0.1, frequencyWeight: 0.9 }); }
              else if (v === "balanced") { onEvidenceRankingParamsChange({ semanticWeight: 0.7, frequencyWeight: 0.3 }); }
              else if (v === "comprehensive") { onEvidenceRankingParamsChange({ semanticWeight: 1.0, frequencyWeight: 1.0 }); }
            }}
          >
            <TabsList className="grid w-full grid-cols-4 bg-slate-100/50 p-1 border border-slate-200/60 rounded-xl" style={{ height: 'auto' }}>
              <TabsTrigger value="coherence" disabled={evidenceControlsDisabled} className="flex flex-col items-center gap-0.5 py-1.5 transition-all">
                <Brain className="h-3 w-3" />
                <span className="text-[8px] font-bold uppercase">Coherence</span>
              </TabsTrigger>
              <TabsTrigger value="salience" disabled={evidenceControlsDisabled} className="flex flex-col items-center gap-0.5 py-1.5 transition-all">
                <Type className="h-3 w-3" />
                <span className="text-[8px] font-bold uppercase">Salience</span>
              </TabsTrigger>
              <TabsTrigger value="balanced" disabled={evidenceControlsDisabled} className="flex flex-col items-center gap-0.5 py-1.5 transition-all">
                <Scale className="h-3 w-3" />
                <span className="text-[8px] font-bold uppercase">Balanced</span>
              </TabsTrigger>
              <TabsTrigger value="comprehensive" disabled={evidenceControlsDisabled} className="flex flex-col items-center gap-0.5 py-1.5 transition-all">
                <Sparkles className="h-3 w-3" />
                <span className="text-[8px] font-bold uppercase">Full</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {autoWeights && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-indigo-50 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                Semantic {Math.round(evidenceRankingParams.semanticWeight * 100)}%
              </Badge>
              <Badge variant="secondary" className="bg-emerald-50 px-1.5 py-0 text-[9px] font-bold text-emerald-700">
                Frequency {Math.round(evidenceRankingParams.frequencyWeight * 100)}%
              </Badge>
              <Badge variant="outline" className="border-slate-200 text-[9px] font-bold text-slate-500">
                Auto
              </Badge>
            </div>
          )}

          {/* Evidence Settings Accordion */}
          <div className="space-y-2">
            <button 
              onClick={() => setShowEvidenceSettings(!showEvidenceSettings)}
              className="flex w-full items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-500 transition-colors py-0.5 px-1 border-b border-dashed border-slate-200"
            >
              <div className="flex items-center gap-1.5">
                <Settings2 className="h-3 w-3" />
                Evidence Ranking Weights
              </div>
              {showEvidenceSettings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showEvidenceSettings && (
              <div className="space-y-3 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-slate-700">Semantic Coherence</Label>
                    <Badge variant="secondary" className="bg-indigo-100 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                      {Math.round(evidenceRankingParams.semanticWeight * 100)}%
                    </Badge>
                  </div>
                  <Slider
                    value={[evidenceRankingParams.semanticWeight]}
                    min={0}
                    max={1}
                    step={0.05}
                    disabled={evidenceControlsDisabled}
                    onValueChange={(v) => onEvidenceRankingParamsChange({ ...evidenceRankingParams, semanticWeight: v[0] })}
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-slate-700">Frequency Salience</Label>
                    <Badge variant="secondary" className="bg-emerald-100 px-1.5 py-0 text-[9px] font-bold text-emerald-700">
                      {Math.round(evidenceRankingParams.frequencyWeight * 100)}%
                    </Badge>
                  </div>
                  <Slider
                    value={[evidenceRankingParams.frequencyWeight]}
                    min={0}
                    max={1}
                    step={0.05}
                    disabled={evidenceControlsDisabled}
                    onValueChange={(v) => onEvidenceRankingParamsChange({ ...evidenceRankingParams, frequencyWeight: v[0] })}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator className="bg-slate-100/80" />

      {/* Category: Network Logic */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-900">
            <Workflow className="h-3 w-3" />
            Network Logic
          </Label>
          <Badge variant="outline" className="h-4 text-[8px] uppercase border-slate-200 text-slate-500 font-bold bg-slate-50 px-1.5">
            {(() => {
              if (minEdgeWeight === 0.25 && similarityThreshold === 0.75) return "Summary";
              if (minEdgeWeight === 0.12 && similarityThreshold === 0.55) return "Standard";
              if (minEdgeWeight === 0.06 && similarityThreshold === 0.45) return "Discover";
              if (minEdgeWeight === 0.02 && similarityThreshold === 0.35) return "Full Web";
              return "Custom";
            })()}
          </Badge>
        </div>

        <div className="space-y-2">
          {/* Preset Tabs */}
          <Tabs 
            value={(() => {
              if (minEdgeWeight === 0.25 && similarityThreshold === 0.75) return "summary";
              if (minEdgeWeight === 0.12 && similarityThreshold === 0.55) return "standard";
              if (minEdgeWeight === 0.06 && similarityThreshold === 0.45) return "discover";
              if (minEdgeWeight === 0.02 && similarityThreshold === 0.35) return "full";
              return "custom";
            })()} 
            onValueChange={(v) => {
              if (v === "summary") { onMinEdgeWeightChange(0.25); onSimilarityThresholdChange(0.75); }
              else if (v === "standard") { onMinEdgeWeightChange(0.12); onSimilarityThresholdChange(0.55); }
              else if (v === "discover") { onMinEdgeWeightChange(0.06); onSimilarityThresholdChange(0.45); }
              else if (v === "full") { onMinEdgeWeightChange(0.02); onSimilarityThresholdChange(0.35); }
            }}
          >
            <TabsList className="grid w-full grid-cols-4 bg-slate-100/50 p-1 border border-slate-200/60 rounded-xl" style={{ height: 'auto' }}>
              <TabsTrigger value="summary" className="py-1.5"><span className="text-[9px] font-bold uppercase">Summary</span></TabsTrigger>
              <TabsTrigger value="standard" className="py-1.5"><span className="text-[9px] font-bold uppercase">Standard</span></TabsTrigger>
              <TabsTrigger value="discover" className="py-1.5"><span className="text-[9px] font-bold uppercase">Discover</span></TabsTrigger>
              <TabsTrigger value="full" className="py-1.5"><span className="text-[9px] font-bold uppercase">Full</span></TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Network Settings Accordion */}
          <div className="space-y-2">
            <button 
              onClick={() => setShowNetworkSettings(!showNetworkSettings)}
              className="flex w-full items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-500 transition-colors py-0.5 px-1 border-b border-dashed border-slate-200"
            >
              <div className="flex items-center gap-1.5">
                <Settings2 className="h-3 w-3" />
                Advanced Network Settings
              </div>
              {showNetworkSettings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showNetworkSettings && (
              <div className="space-y-4 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-slate-700">Link Density</Label>
                    <Badge variant="secondary" className="bg-slate-100 px-1.5 py-0 text-[9px] font-bold text-slate-700">
                      {Math.round((0.35 - minEdgeWeight) / (0.35 - 0.02) * 100)}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <Slider
                      value={[minEdgeWeight]}
                      min={0.02}
                      max={0.35}
                      step={0.01}
                      onValueChange={(v) => onMinEdgeWeightChange(v[0])}
                    />
                    <div className="flex justify-between text-[7px] font-bold uppercase tracking-widest text-slate-400">
                      <span>Minimalist</span>
                      <span>Exploratory</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-slate-700">Similarity Bar</Label>
                    <Badge variant="secondary" className="bg-slate-100 px-1.5 py-0 text-[9px] font-bold text-slate-700">
                      {Math.round((similarityThreshold - 0.35) / (0.9 - 0.35) * 100)}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <Slider
                      value={[similarityThreshold]}
                      min={0.35}
                      max={0.9}
                      step={0.01}
                      onValueChange={(v) => onSimilarityThresholdChange(v[0])}
                    />
                    <div className="flex justify-between text-[7px] font-bold uppercase tracking-widest text-slate-400">
                      <span>Broad</span>
                      <span>Strict</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Separator className="bg-slate-100/80" />

      {/* Category: Visualization Dimensions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label 
            className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-900"
          >
            <Maximize2 className="h-3 w-3" />
            Visualization Dimensions
          </Label>
          <Badge
            variant="outline"
            className="rounded-full border-indigo-200 bg-indigo-50/50 px-2.5 py-1 text-[9px] font-bold uppercase leading-tight text-indigo-500 whitespace-nowrap"
          >
            {axisBadgeLabel}
          </Badge>
        </div>
        
        <div className="space-y-2">
          {/* Dimension Mode Tabs */}
          <Tabs value={dimensionMode} onValueChange={(v) => onDimensionModeChange(v as any)}>
            <TabsList className="grid w-full grid-cols-3 bg-slate-100/50 p-1 border border-slate-200/60 rounded-xl" style={{ height: 'auto' }}>
              <TabsTrigger value="manual" className="flex items-center gap-1.5 py-1.5 transition-all">
                <Settings2 className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Manual</span>
              </TabsTrigger>
              <TabsTrigger value="elbow" className="flex items-center gap-1.5 py-1.5 transition-all">
                <Workflow className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Elbow</span>
              </TabsTrigger>
              <TabsTrigger value="threshold" className="flex items-center gap-1.5 py-1.5 transition-all">
                <Target className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Threshold</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Dimension Settings Accordion */}
          <div className="space-y-2">
            <button 
              onClick={() => setShowDimensionSettings(!showDimensionSettings)}
              className="flex w-full items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-500 transition-colors py-0.5 px-1 border-b border-dashed border-slate-200"
            >
              <div className="flex items-center gap-1.5">
                <Settings2 className="h-3 w-3" />
                Advanced Dimension Settings
              </div>
              {showDimensionSettings ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {showDimensionSettings && (
              <div className="space-y-3 pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                {dimensionMode === "manual" && (
                  <div className="space-y-3 px-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-slate-700">Dimensions</Label>
                      <Badge variant="secondary" className="bg-indigo-50 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                        {numDimensions} Axis
                      </Badge>
                    </div>
                    <Slider 
                      value={[numDimensions]} 
                      onValueChange={([v]) => onNumDimensionsChange(v)} 
                      min={2} 
                      max={10} 
                      step={1} 
                      className="py-1"
                    />
                    <div className="relative h-3 w-full text-[9px] font-bold uppercase text-slate-400">
                      <span className="absolute left-0">2D</span>
                      <span className="absolute -translate-x-1/2" style={{ left: '12.5%' }}>3D</span>
                      <span className="absolute right-0">10D</span>
                    </div>
                  </div>
                )}

                {dimensionMode === "threshold" && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-slate-700">Variance Threshold</Label>
                      <Badge variant="secondary" className="bg-indigo-50 px-1.5 py-0 text-[9px] font-bold text-indigo-700">
                        {Math.round(varianceThreshold * 100)}%
                      </Badge>
                    </div>
                    <Slider 
                      value={[varianceThreshold]} 
                      onValueChange={([v]) => onVarianceThresholdChange(v)} 
                      min={0.5} 
                      max={0.99} 
                      step={0.01} 
                      className="py-1"
                    />
                    <div className="flex justify-between text-[7px] font-bold uppercase tracking-widest text-slate-400">
                      <span>More Compression</span>
                      <span>More Accuracy</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span>Applied Axes</span>
                      <Badge variant="secondary" className="bg-white px-1.5 py-0 text-[9px] font-bold text-indigo-700 border border-indigo-100">
                        {effectiveAxes} axis{effectiveAxes === 1 ? "" : "es"}
                      </Badge>
                    </div>
                  </div>
                )}

                {dimensionMode === "elbow" && (
                  <div className="flex flex-col gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[9px] font-medium leading-relaxed text-slate-500 italic">
                      Automated dimension selection using the Scree Plot Elbow method. Finds the "sweet spot" where adding more axes yields diminishing returns in explained variance.
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                      <span>Applied Axes</span>
                      <Badge variant="secondary" className="bg-white px-1.5 py-0 text-[9px] font-bold text-indigo-700 border border-indigo-100">
                        {effectiveAxes} axis{effectiveAxes === 1 ? "" : "es"}
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
