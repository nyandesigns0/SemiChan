"use client";

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
  ChevronDown
} from "lucide-react";
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
  clusterSeed: number;
  onClusterSeedChange: (value: number) => void;
  softMembership: boolean;
  onSoftMembershipChange: (value: boolean) => void;
  cutType: "count" | "granularity";
  onCutTypeChange: (type: "count" | "granularity") => void;
  granularityPercent: number;
  onGranularityPercentChange: (value: number) => void;
  
  // Model selection
  selectedModel: string;
  onModelChange: (model: string) => void;
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
  clusterSeed,
  onClusterSeedChange,
  softMembership,
  onSoftMembershipChange,
  cutType,
  onCutTypeChange,
  granularityPercent,
  onGranularityPercentChange,
  selectedModel,
  onModelChange,
}: AnalysisControlsProps) {
  const models = [
    "GPT-5.1",
    "GPT-5",
    "GPT-4.1",
    "GPT-4.1 mini",
    "GPT-4.1-nano",
    "GPT-4o-mini"
  ];

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <div className="space-y-3">
        <Label 
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-help"
          title="Choose the AI model used for concept synthesis and axis label generation."
        >
          <Brain className="h-3.5 w-3.5" />
          Language Model
          <Info className="h-3 w-3 opacity-50" />
        </Label>
        <div className="relative group">
          <select 
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-100/50 px-4 py-2.5 text-xs font-bold uppercase tracking-tight text-slate-700 outline-none transition-all hover:border-slate-300 focus:ring-2 focus:ring-indigo-500/20"
          >
            {models.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-600">
            <ChevronDown className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      {/* Clustering Mode Selector */}
      <div className="space-y-3">
        <Label 
          className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-help"
          title="Choose the mathematical method for grouping sentences into themes."
        >
          <Layers className="h-3.5 w-3.5" />
          Clustering Engine
          <Info className="h-3 w-3 opacity-50" />
        </Label>
        <Tabs value={clusteringMode} onValueChange={(v) => onClusteringModeChange(v as any)}>
          <TabsList className="grid w-full grid-cols-3 bg-slate-100/50 p-1 border border-slate-200/60">
            <TabsTrigger 
              value="kmeans" 
              className="flex items-center gap-1.5 py-2 transition-all duration-200"
            >
              <Dices className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-tight">K-Means</span>
            </TabsTrigger>
            <TabsTrigger 
              value="hierarchical" 
              className="flex items-center gap-1.5 py-2 transition-all duration-200"
            >
              <GitMerge className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-tight">Tree</span>
            </TabsTrigger>
            <TabsTrigger 
              value="hybrid" 
              className="flex items-center gap-1.5 py-2 transition-all duration-200"
            >
              <Zap className="h-3.5 w-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-tight">Hybrid</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Cut Type Toggle - only show for hierarchical/hybrid modes */}
      {(clusteringMode === "hierarchical" || clusteringMode === "hybrid") && (
        <div className="space-y-3">
          <Label 
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 cursor-help"
            title="Determine how the conceptual hierarchy is split into distinct nodes."
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Cut Method
            <Info className="h-3 w-3 opacity-50" />
          </Label>
          <Tabs value={cutType} onValueChange={(v) => onCutTypeChange(v as "count" | "granularity")}>
            <TabsList className="grid w-full grid-cols-2 bg-slate-100/50 p-1 border border-slate-200/60">
              <TabsTrigger 
                value="count" 
                className="flex items-center gap-1.5 py-2 transition-all duration-200"
              >
                <Target className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Cut by K</span>
              </TabsTrigger>
              <TabsTrigger 
                value="granularity" 
                className="flex items-center gap-1.5 py-2 transition-all duration-200"
              >
                <Workflow className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Granularity</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/30 p-4 shadow-sm">
        {/* Auto-K Toggle */}
        <div className="flex items-center justify-between group">
          <div className="space-y-0.5">
            <Label 
              className="text-sm font-bold text-slate-700 flex items-center gap-1.5 cursor-help group-hover:text-slate-900 transition-colors"
              title="Automatically calculate the mathematically optimal number of concepts based on data density."
            >
              <Target className="h-3.5 w-3.5 text-indigo-500" />
              Auto-K Discovery
              <Info className="h-3 w-3 opacity-50" />
            </Label>
            <p className="text-[10px] text-slate-500">Recommend optimal concept count</p>
          </div>
          <Switch checked={autoK} onCheckedChange={onAutoKChange} className="hover:scale-105 transition-transform" />
        </div>

        <div className="h-px bg-slate-200/50" />

        {/* Soft Membership Toggle */}
        <div className="flex items-center justify-between group">
          <div className="space-y-0.5">
            <Label 
              className="text-sm font-bold text-slate-700 flex items-center gap-1.5 cursor-help group-hover:text-slate-900 transition-colors"
              title="Enable 'soft membership' where sentences can relate to multiple concepts simultaneously rather than just one."
            >
              <Fingerprint className="h-3.5 w-3.5 text-indigo-500" />
              Allow Overlap
              <Info className="h-3 w-3 opacity-50" />
            </Label>
            <p className="text-[10px] text-slate-500">Sentences can belong to 2+ concepts</p>
          </div>
          <Switch checked={softMembership} onCheckedChange={onSoftMembershipChange} className="hover:scale-105 transition-transform" />
        </div>

        <div className="h-px bg-slate-200/50" />

        {/* Clustering Seed Slider */}
        <div className="space-y-3 group">
          <div className="flex items-center justify-between">
            <Label 
              className="text-sm font-bold text-slate-700 flex items-center gap-1.5 cursor-help group-hover:text-slate-900 transition-colors"
              title="Adjust the 'random seed' used to initialize clusters. Changing this will give you a different but reproducible arrangement for the same data."
            >
              <Dices className="h-3.5 w-3.5 text-indigo-500" />
              Solution Seed
              <Info className="h-3 w-3 opacity-50" />
            </Label>
            <Badge variant="secondary" className="bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-200/50">
              {clusterSeed}
            </Badge>
          </div>
          <div className="space-y-1">
            <Slider 
              value={[clusterSeed]} 
              min={1} 
              max={100} 
              step={1} 
              onValueChange={(v) => onClusterSeedChange(v[0])} 
              className="py-1.5"
            />
            <p className="text-[8px] text-slate-400 italic font-medium">Pick a number to lock in a specific clustering arrangement.</p>
          </div>
        </div>
      </div>

      {/* Hybrid Analysis Weights */}
      <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="rounded-lg bg-indigo-100 p-1.5">
            <Brain className="h-4 w-4 text-indigo-600" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
            Feature Weights
          </span>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label 
                className="text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-help"
                title="Focus on the underlying meaning and intent of the feedback (e.g., grouping 'too dark' with 'insufficient light')."
              >
                Semantic weight
                <Info className="h-3 w-3 opacity-50" />
              </Label>
              <Badge variant="secondary" className="bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-200/50">
                {Math.round(semanticWeight * 100)}%
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label 
                className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-help"
                title="Focus on specific technical terminology and literal word usage (e.g., exact matches for 'sun path' or 'CLT')."
              >
                Frequency weight
                <Info className="h-3 w-3 opacity-50" />
              </Label>
              <Badge variant="secondary" className="bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200/50">
                {Math.round(frequencyWeight * 100)}%
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
      </div>

      {!autoK && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {/* Show K slider when cutType is "count" or not in hierarchical/hybrid mode */}
          {(cutType === "count" || (clusteringMode !== "hierarchical" && clusteringMode !== "hybrid")) && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label 
                  className="text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-help"
                  title="Set the exact number of concept nodes (themes) you want the system to generate."
                >
                  Manual Concepts (k)
                  <Info className="h-3 w-3 opacity-50" />
                </Label>
                <Badge variant="secondary" className="bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 ring-1 ring-slate-200/50">
                  {kConcepts}
                </Badge>
              </div>
              <Slider 
                value={[kConcepts]} 
                min={4} 
                max={30} 
                step={1} 
                onValueChange={(v) => onKConceptsChange(v[0])} 
                className="py-2"
              />
            </div>
          )}
          
          {/* Show granularity slider when cutType is "granularity" and in hierarchical/hybrid mode */}
          {cutType === "granularity" && (clusteringMode === "hierarchical" || clusteringMode === "hybrid") && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label 
                  className="text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-help"
                  title="Adjust how broad (high granularity) or specific (low granularity) the resulting concepts should be."
                >
                  Granularity
                  <Info className="h-3 w-3 opacity-50" />
                </Label>
                <Badge variant="secondary" className="bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 ring-1 ring-slate-200/50">
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
                  className="py-2"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-6 pt-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label 
              className="text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-help"
              title="Control the visibility of connections between jurors and concepts. Higher values filter out weak connections."
            >
              Link Density
              <Info className="h-3 w-3 opacity-50" />
            </Label>
            <Badge variant="secondary" className="bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 ring-1 ring-slate-200/50">
              {minEdgeWeight.toFixed(2)}
            </Badge>
          </div>
          <Slider
            value={[minEdgeWeight]}
            min={0.02}
            max={0.35}
            step={0.01}
            onValueChange={(v) => onMinEdgeWeightChange(v[0])}
            className="py-2"
          />
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label 
              className="text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-help"
              title="Set the minimum mathematical similarity required to draw a 'similarity link' between two jurors or two concepts."
            >
              Similarity Cutoff
              <Info className="h-3 w-3 opacity-50" />
            </Label>
            <Badge variant="secondary" className="bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 ring-1 ring-slate-200/50">
              {similarityThreshold.toFixed(2)}
            </Badge>
          </div>
          <Slider
            value={[similarityThreshold]}
            min={0.35}
            max={0.9}
            step={0.01}
            onValueChange={(v) => onSimilarityThresholdChange(v[0])}
            className="py-2"
          />
        </div>
      </div>
    </div>
  );
}
