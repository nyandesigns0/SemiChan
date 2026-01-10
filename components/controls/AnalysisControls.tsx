"use client";

import { Brain, BarChart3, Fingerprint, Layers, Maximize2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AnalysisControlsProps {
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

export function AnalysisControls({
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
}: AnalysisControlsProps) {
  return (
    <div className="space-y-6">
      {/* Clustering Mode Selector */}
      <div className="space-y-3">
        <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <Layers className="h-3.5 w-3.5" />
          Clustering Engine
        </Label>
        <Tabs value={clusteringMode} onValueChange={(v) => onClusteringModeChange(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="kmeans" className="text-[10px] font-bold">K-Means</TabsTrigger>
            <TabsTrigger value="hierarchical" className="text-[10px] font-bold">Tree</TabsTrigger>
            <TabsTrigger value="hybrid" className="text-[10px] font-bold">Hybrid</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Cut Type Toggle - only show for hierarchical/hybrid modes */}
      {(clusteringMode === "hierarchical" || clusteringMode === "hybrid") && (
        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Maximize2 className="h-3.5 w-3.5" />
            Cut Method
          </Label>
          <Tabs value={cutType} onValueChange={(v) => onCutTypeChange(v as "count" | "granularity")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="count" className="text-[10px] font-bold">Cut by K</TabsTrigger>
              <TabsTrigger value="granularity" className="text-[10px] font-bold">Cut by Granularity</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      <div className="space-y-4 rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
        {/* Auto-K Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-bold text-slate-700">Auto-K Discovery</Label>
            <p className="text-[10px] text-slate-500">Recommend optimal concept count</p>
          </div>
          <Switch checked={autoK} onCheckedChange={onAutoKChange} />
        </div>

        {/* Soft Membership Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-sm font-bold text-slate-700">Allow Overlap</Label>
            <p className="text-[10px] text-slate-500">Sentences can belong to 2+ concepts</p>
          </div>
          <Switch checked={softMembership} onCheckedChange={onSoftMembershipChange} />
        </div>
      </div>

      {/* Hybrid Analysis Weights */}
      <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-4">
        <div className="mb-4 flex items-center gap-2">
          <Brain className="h-4 w-4 text-indigo-600" />
          <span className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
            Feature Weights
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-bold text-slate-700">Semantic weight</Label>
            <Badge variant="secondary" className="bg-indigo-100 font-bold text-indigo-700">
              {semanticWeight.toFixed(2)}
            </Badge>
          </div>
          <Slider
            value={[semanticWeight]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={(v) => onSemanticWeightChange(v[0])}
            className="py-2"
          />
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
              <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
              Frequency weight
            </Label>
            <Badge variant="secondary" className="bg-emerald-100 font-bold text-emerald-700">
              {frequencyWeight.toFixed(2)}
            </Badge>
          </div>
          <Slider
            value={[frequencyWeight]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={(v) => onFrequencyWeightChange(v[0])}
            className="py-2"
          />
        </div>
      </div>

      {!autoK && (
        <>
          {/* Show K slider when cutType is "count" or not in hierarchical/hybrid mode */}
          {(cutType === "count" || (clusteringMode !== "hierarchical" && clusteringMode !== "hybrid")) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold text-slate-700">Manual Concepts (k)</Label>
                <Badge variant="secondary" className="bg-slate-100 font-bold text-slate-700">
                  {kConcepts}
                </Badge>
              </div>
              <Slider 
                value={[kConcepts]} 
                min={4} 
                max={30} 
                step={1} 
                onValueChange={(v) => onKConceptsChange(v[0])} 
                className="py-4"
              />
            </div>
          )}
          
          {/* Show granularity slider when cutType is "granularity" and in hierarchical/hybrid mode */}
          {cutType === "granularity" && (clusteringMode === "hierarchical" || clusteringMode === "hybrid") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-bold text-slate-700">Granularity</Label>
                <Badge variant="secondary" className="bg-slate-100 font-bold text-slate-700">
                  {granularityPercent}%
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500">0% = fine clusters, 100% = broad clusters</p>
                <Slider 
                  value={[granularityPercent]} 
                  min={0} 
                  max={100} 
                  step={1} 
                  onValueChange={(v) => onGranularityPercentChange(v[0])} 
                  className="py-4"
                />
              </div>
            </div>
          )}
        </>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold text-slate-700">Link Density</Label>
          <Badge variant="secondary" className="bg-slate-100 font-bold text-slate-700">
            {minEdgeWeight.toFixed(2)}
          </Badge>
        </div>
        <Slider
          value={[minEdgeWeight]}
          min={0.02}
          max={0.35}
          step={0.01}
          onValueChange={(v) => onMinEdgeWeightChange(v[0])}
          className="py-4"
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold text-slate-700">Similarity Cutoff</Label>
          <Badge variant="secondary" className="bg-slate-100 font-bold text-slate-700">
            {similarityThreshold.toFixed(2)}
          </Badge>
        </div>
        <Slider
          value={[similarityThreshold]}
          min={0.35}
          max={0.9}
          step={0.01}
          onValueChange={(v) => onSimilarityThresholdChange(v[0])}
          className="py-4"
        />
      </div>
    </div>
  );
}
