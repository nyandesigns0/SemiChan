"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Download, FileText, Network, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DataInputPanel } from "@/components/ingest/DataInputPanel";
import { IngestModal } from "@/components/ingest/IngestModal";
import { AnalysisControlsAccordion } from "@/components/controls/AnalysisControlsAccordion";
import { AlignmentControls } from "@/components/controls/AlignmentControls";
import { AIControlsAccordion } from "@/components/controls/AIControlsAccordion";
import { SearchBarAccordion } from "@/components/controls/SearchBarAccordion";
import { GraphFiltersAccordion } from "@/components/controls/GraphFiltersAccordion";
import { GraphCanvas3D } from "@/components/graph/GraphCanvas3D";
import { InspectorPanel, type InspectorTab } from "@/components/inspector/InspectorPanel";
import type { RawDataExportContext } from "@/components/inspector/export-types";
import { FloatingDetailsPanel } from "@/components/inspector/FloatingDetailsPanel";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { useConceptSummarizer } from "@/hooks/useConceptSummarizer";
import { useAxisLabelEnhancer } from "@/hooks/useAxisLabelEnhancer";
import { segmentByJuror } from "@/lib/segmentation/juror-segmenter";
import { downloadJson, downloadPdfServer } from "@/lib/utils/download";
import { cn } from "@/lib/utils/cn";
import { DEFAULT_SAMPLE, DEFAULT_MODEL } from "@/constants/nlp-constants";
import { calculateCost, formatCost } from "@/lib/utils/api-utils";
import type { JurorBlock, DesignerBlock, DesignerAnalysisResult } from "@/types/nlp";
import type { AnalysisResult, SentenceRecord } from "@/types/analysis";
import type { GraphNode, GraphLink } from "@/types/graph";
import type { Stance } from "@/types/nlp";
import type { LogEntry } from "@/components/inspector/InspectorConsole";
import type { TokenUsage } from "@/types/api";
import type { AnchorAxis } from "@/types/anchor-axes";

export default function HomePage() {
  // Sidebar state defaults to closed on load
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  // Ingest
  const [rawText, setRawText] = useState("");
  const [jurorBlocks, setJurorBlocks] = useState<JurorBlock[]>([]);
  const [ingestModalOpen, setIngestModalOpen] = useState(false);
  const [designerModalOpen, setDesignerModalOpen] = useState(false);
  const [sampleLoadPending, setSampleLoadPending] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [sampleProgress, setSampleProgress] = useState(0);
  const [sampleStep, setSampleStep] = useState("");
  const [sampleProgressId, setSampleProgressId] = useState<string | null>(null);
  const [samplePhase, setSamplePhase] = useState<"idle" | "loading" | "ready">("idle");
  const [autoRotateDisabled, setAutoRotateDisabled] = useState(false);
  const [turntableEnabled, setTurntableEnabled] = useState(true);
  const sampleEventSourceRef = useRef<EventSource | null>(null);
  const sampleLoadPendingRef = useRef(false);
  const sampleProgressIdRef = useRef<string | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);

  // Analysis params
  const [kConcepts, setKConcepts] = useState(10);
  const [numDimensions, setNumDimensions] = useState(3);
  const [dimensionMode, setDimensionMode] = useState<"manual" | "elbow" | "threshold">("elbow");
  const [varianceThreshold, setVarianceThreshold] = useState(0.9);
  const [minEdgeWeight, setMinEdgeWeight] = useState(0.02);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.35);

  // Adaptive mode state
  const [adaptiveMode, setAdaptiveMode] = useState(false);
  const [adaptiveSelectedNodeIds, setAdaptiveSelectedNodeIds] = useState<Set<string>>(new Set());
  const [adaptiveSelectedLinkIds, setAdaptiveSelectedLinkIds] = useState<Set<string>>(new Set());

  // Graph filter toggles
  const [showJurorNodes, setShowJurorNodes] = useState(true);
  const [showConceptNodes, setShowConceptNodes] = useState(true);
  const [showDesignerNodes, setShowDesignerNodes] = useState(false);
  const [showJurorConceptLinks, setShowJurorConceptLinks] = useState(true);
  const [showJurorJurorLinks, setShowJurorJurorLinks] = useState(true);
  const [showConceptConceptLinks, setShowConceptConceptLinks] = useState(true);
  const [showPraise, setShowPraise] = useState(true);
  const [showCritique, setShowCritique] = useState(true);
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [showNeutral, setShowNeutral] = useState(true);

  // New algorithm state
  const [clusteringMode, setClusteringMode] = useState<"kmeans" | "hierarchical">("kmeans");
  const [autoK, setAutoK] = useState(true);
  const [autoKStability, setAutoKStability] = useState(false);
  const [autoKDominanceThreshold, setAutoKDominanceThreshold] = useState(0.35);
  const [autoKKPenalty, setAutoKKPenalty] = useState(0.001);
  const [autoKEpsilon, setAutoKEpsilon] = useState(0.02);
  const [autoMinClusterSize, setAutoMinClusterSize] = useState(false);
  const [minClusterSize, setMinClusterSize] = useState<number | undefined>(undefined);
  const [autoDominanceCap, setAutoDominanceCap] = useState(true);
  const [autoDominanceCapThreshold, setAutoDominanceCapThreshold] = useState<number | undefined>(undefined);
  const [autoSeed, setAutoSeed] = useState(true);
  const [autoUnit, setAutoUnit] = useState(false);
  const [autoWeights, setAutoWeights] = useState(false);
  const [seedCandidates, setSeedCandidates] = useState(32);
  const [seedPerturbations, setSeedPerturbations] = useState(3);
  const [seedCoherenceWeight, setSeedCoherenceWeight] = useState(0.3);
  const [seedSeparationWeight, setSeedSeparationWeight] = useState(0.25);
  const [seedStabilityWeight, setSeedStabilityWeight] = useState(0.2);
  const [seedDominancePenaltyWeight, setSeedDominancePenaltyWeight] = useState(0.15);
  const [seedMicroClusterPenaltyWeight, setSeedMicroClusterPenaltyWeight] = useState(0.05);
  const [seedLabelPenaltyWeight, setSeedLabelPenaltyWeight] = useState(0.05);
  const [seedDominanceThreshold, setSeedDominanceThreshold] = useState(0.35);
  const [kMinOverride, setKMinOverride] = useState<number | undefined>(undefined);
  const [kMaxOverride, setKMaxOverride] = useState<number | undefined>(undefined);
  const [clusterSeed, setClusterSeed] = useState(42);
  const [softMembership, setSoftMembership] = useState(true);
  const [evidenceRankingParams, setEvidenceRankingParams] = useState({ semanticWeight: 0.7, frequencyWeight: 0.3 });
  const [cutType, setCutType] = useState<"count" | "granularity">("count");
  const [granularityPercent, setGranularityPercent] = useState(60);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL);
  const [search, setSearch] = useState("");

  // Selection
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);
  const [expandedPrimaryConcepts, setExpandedPrimaryConcepts] = useState<Set<string>>(new Set());

  const handlePrimaryConceptExpand = useCallback((id: string) => {
    setExpandedPrimaryConcepts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Analysis state
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [anchorAxes, setAnchorAxes] = useState<AnchorAxis[]>([]);
  const [selectedAnchorAxisId, setSelectedAnchorAxisId] = useState<string | null>(null);

  // Designer analysis state
  const [designerBlocks, setDesignerBlocks] = useState<DesignerBlock[]>([]);
  const [designerAnalysis, setDesignerAnalysis] = useState<DesignerAnalysisResult | null>(null);
  const [designerLoading, setDesignerLoading] = useState(false);
  const [designerKConcepts, setDesignerKConcepts] = useState(6);
  const [alignmentLinks, setAlignmentLinks] = useState<GraphLink[]>([]);
  const [aligning, setAligning] = useState(false);

  // Use the actual number of dimensions from the analysis if available, otherwise the manual setting
  const appliedNumDimensions = useMemo(() => {
    if (analysis?.appliedNumDimensions) return analysis.appliedNumDimensions;
    if (analysis?.varianceStats?.explainedVariances.length) return analysis.varianceStats.explainedVariances.length;
    return numDimensions;
  }, [analysis, numDimensions]);

  // AI controls
  const [enableAxisLabelAI, setEnableAxisLabelAI] = useState(false);
  const [autoSynthesize, setAutoSynthesize] = useState(false);
  
  // Pipeline checkpoint state
  const [checkpointIndex, setCheckpointIndex] = useState(-1);
  
  // Graph view toggles
  const [showAxes, setShowAxes] = useState(true);
  const [showGraph, setShowGraph] = useState(true);

  // Console logging state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [apiCallCount, setApiCallCount] = useState(0);
  const [apiCostTotal, setApiCostTotal] = useState(0);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("console");
  const analysisContainerRef = useRef<HTMLDivElement | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportTimestamp, setExportTimestamp] = useState<string | null>(null);
  const lastVarianceLogSignature = useRef<string | null>(null);
  const dataInputPanelRef = useRef<HTMLDivElement>(null);
  const addLog = useCallback((type: LogEntry["type"], message: string, data?: any) => {
    let finalMessage = message;
    let incrementalCost = 0;
    
    // Add cost info if available in data
    if (data?.usage && data?.model) {
      incrementalCost = calculateCost(data.model, data.usage);
      finalMessage += ` [Cost: ${formatCost(incrementalCost)}]`;
    }

    if (type === "api_request") {
      setApiCallCount((prev) => prev + 1);
    }
    if (type === "api_response" && incrementalCost > 0) {
      setApiCostTotal((prev) => prev + incrementalCost);
    }

    const entry: LogEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
      type,
      message: finalMessage,
      data,
    };
    setLogs((prev) => [...prev, entry]);
  }, []);

  // Log node selection
  useEffect(() => {
    if (selectedNodeId && analysis) {
      const node = analysis.nodes.find(n => n.id === selectedNodeId);
      if (node) {
        addLog("node", `Selected node: ${node.label} (${node.type})`, node);
      }
    }
  }, [selectedNodeId, analysis, addLog]);

  // Log link selection
  useEffect(() => {
    if (selectedLinkId && analysis) {
      const link = analysis.links.find(l => l.id === selectedLinkId);
      if (link) {
        addLog("link", `Selected link: ${link.kind}`, link);
      }
    }
  }, [selectedLinkId, analysis, addLog]);

  useEffect(() => {
    if (!selectedAnchorAxisId && anchorAxes.length > 0) {
      setSelectedAnchorAxisId(anchorAxes[0].id);
    }
  }, [anchorAxes, selectedAnchorAxisId]);

  // Log keywords when analysis completes
  useEffect(() => {
    if (analysis && analysis.stats.totalConcepts > 0) {
      const allKeywords = analysis.nodes
        .filter((n) => n.type === "concept")
        .map((n) => n.label);
      addLog(
        "keyword",
        `Keywords extracted: ${allKeywords.length} keywords from ${analysis.stats.totalSentences} sentences`,
        { keywords: allKeywords, sentenceCount: analysis.stats.totalSentences }
      );
      addLog("analysis", `Analysis complete: ${analysis.stats.totalSentences} sentences, ${analysis.stats.totalConcepts} concepts`);
      
      if (analysis.minClusterSizeMerged && analysis.minClusterSizeMerged > 0) {
        addLog(
          "quality",
          `Cluster hygiene: merged ${analysis.minClusterSizeMerged} small clusters (minSize=${analysis.minClusterSize})`
        );
      }
      if (analysis.dominanceSplitApplied) {
        const primarySplits = analysis.dominanceSplitDetails?.primary?.splitCount ?? 0;
        const detailSplits = analysis.dominanceSplitDetails?.detail?.splitCount ?? 0;
        if (primarySplits > 0 || detailSplits > 0) {
          addLog("quality", `Cluster hygiene: applied dominance splits (primary: ${primarySplits}, detail: ${detailSplits})`);
        }
      }

      if (analysis.varianceStats) {
        const cumulative = analysis.varianceStats.cumulativeVariances;
        const total = analysis.varianceStats.totalVariance;
        const lastCumulative = cumulative[cumulative.length - 1];
        const percent = Math.round((lastCumulative / total) * 100);
        addLog("analysis", `Visualization uses ${cumulative.length} dimensions, capturing ${percent}% of data variance.`);
      }
    }
  }, [analysis, addLog]);
  
  useEffect(() => {
    if (analysis?.anchorAxes && analysis.anchorAxes.length > 0 && anchorAxes.length === 0) {
      setAnchorAxes(analysis.anchorAxes);
    }
  }, [analysis?.anchorAxes, anchorAxes.length]);
  
  // Log how automatic dimension selection behaved (even if it kept the manual value)
  useEffect(() => {
    if (!analysis?.varianceStats) return;
    if (dimensionMode === "manual") return;
    if (analysis.dimensionMode && analysis.dimensionMode !== dimensionMode) return;
    const applied = appliedNumDimensions;
    const requested = analysis.requestedNumDimensions ?? numDimensions;
    const signature = `${analysis.varianceStats.explainedVariances.join(",")}:${applied}:${requested}`;
    if (lastVarianceLogSignature.current === signature) return;
    lastVarianceLogSignature.current = signature;

    const cumulativeValue = analysis.varianceStats.cumulativeVariances[applied - 1] 
      ?? analysis.varianceStats.cumulativeVariances[analysis.varianceStats.cumulativeVariances.length - 1] 
      ?? 0;
    const percent = analysis.varianceStats.totalVariance > 0 
      ? Math.round((cumulativeValue / analysis.varianceStats.totalVariance) * 100) 
      : 0;

    if (applied === requested) {
      addLog("analysis", `Auto dimension (${dimensionMode}) kept ${applied} axes (~${percent}% variance).`);
    } else {
      addLog("analysis", `Auto dimension (${dimensionMode}) chose ${applied} axes (requested ${requested}, ~${percent}% variance).`);
    }
  }, [analysis, dimensionMode, appliedNumDimensions, numDimensions, addLog]);

  // Concept Summarization
  const { insights, fetchSummary } = useConceptSummarizer(analysis, selectedModel, autoSynthesize, addLog);
  
  // Axis Label Enhancement
  const { enhancedLabels, isLoading: isRefreshingAxisLabels, refreshAxisLabels } =
    useAxisLabelEnhancer(analysis, enableAxisLabelAI, selectedModel, addLog);
  
  // Merge enhanced axis labels with analysis axis labels
  const displayAxisLabels = useMemo(() => {
    if (!analysis?.axisLabels) return undefined;
    
    const labels: Record<string, any> = { ...analysis.axisLabels };
    
    if (enhancedLabels) {
      Object.keys(enhancedLabels).forEach(key => {
        if (labels[key] && (enhancedLabels as any)[key]) {
          labels[key] = {
            ...labels[key],
            synthesizedNegative: (enhancedLabels as any)[key].synthesizedNegative,
            synthesizedPositive: (enhancedLabels as any)[key].synthesizedPositive,
            name: (enhancedLabels as any)[key].name ?? labels[key].name,
            synthesizedName: (enhancedLabels as any)[key].synthesizedName ?? labels[key].synthesizedName,
          };
        }
      });
    }
    
    return labels as AnalysisResult["axisLabels"];
  }, [analysis?.axisLabels, enhancedLabels]);

  // Raw data export context for analysis report
  const rawDataExportContext = useMemo(() => {
    return {
      rawText,
      jurorBlocks,
      analysisParams: {
        kConcepts,
        minEdgeWeight,
        similarityThreshold,
        evidenceRankingParams,
        clusteringMode,
        autoK,
        autoUnit,
        autoWeights,
        autoSeed,
        autoKStability,
        autoKDominanceThreshold,
        autoKKPenalty,
        autoKEpsilon,
        autoMinClusterSize,
        minClusterSize,
        autoDominanceCap,
        autoDominanceCapThreshold,
        seedCandidates,
        seedPerturbations,
        seedCoherenceWeight,
        seedSeparationWeight,
        seedStabilityWeight,
        seedDominancePenaltyWeight,
        seedMicroClusterPenaltyWeight,
        seedLabelPenaltyWeight,
        seedDominanceThreshold,
        kMinOverride,
        kMaxOverride,
        clusterSeed,
        softMembership,
        cutType,
        granularityPercent,
        numDimensions,
        appliedNumDimensions,
        dimensionMode,
        varianceThreshold,
        showAxes,
        showGraph,
        enableAxisLabelAI,
        autoSynthesize,
        recommendedUnitMode: analysis?.recommendedUnitMode,
        recommendedWeights: analysis?.recommendedWeights,
      },
      logs: logs.map(log => ({
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        type: log.type,
        message: log.message,
        data: log.data,
      })),
      apiCallCount,
      apiCostTotal,
      selectedModel,
      exportTimestamp,
      autoSeed: analysis?.autoSeed,
      seedChosen: analysis?.seedChosen,
      seedCandidatesEvaluated: analysis?.seedCandidatesEvaluated,
    };
  }, [
    rawText,
    jurorBlocks,
    kConcepts,
    minEdgeWeight,
    similarityThreshold,
    evidenceRankingParams,
    clusteringMode,
    autoK,
    autoUnit,
    autoWeights,
    autoSeed,
    autoKStability,
    autoKDominanceThreshold,
    autoKKPenalty,
    autoKEpsilon,
    autoMinClusterSize,
    minClusterSize,
    autoDominanceCap,
    autoDominanceCapThreshold,
    seedCandidates,
    seedPerturbations,
    seedCoherenceWeight,
    seedSeparationWeight,
    seedStabilityWeight,
    seedDominancePenaltyWeight,
    seedMicroClusterPenaltyWeight,
    seedLabelPenaltyWeight,
    seedDominanceThreshold,
    kMinOverride,
    kMaxOverride,
    clusterSeed,
    softMembership,
    cutType,
    granularityPercent,
    numDimensions,
    appliedNumDimensions,
    dimensionMode,
    varianceThreshold,
    showAxes,
    showGraph,
    enableAxisLabelAI,
    autoSynthesize,
    logs,
    apiCallCount,
    apiCostTotal,
    selectedModel,
    exportTimestamp,
  ]);

  // Call segment API when rawText changes
  useEffect(() => {
    const segmentText = async () => {
      // Set initial blocks immediately for quick feedback
      setJurorBlocks(segmentByJuror(rawText));

      if (sampleLoadPendingRef.current) {
        setSampleProgress((prev) => Math.max(prev, 20));
        setSampleStep("Chunking feedback");
      }
      
      addLog("api_request", "Segmenting input text...");
      try {
        const response = await fetch("/api/segment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: rawText }),
        });
        if (response.ok) {
          const data = await response.json();
          addLog("api_response", `Text segmented into ${data.blocks.length} juror blocks`);
          setJurorBlocks(data.blocks);
          if (sampleLoadPendingRef.current) {
            setSampleProgress((prev) => Math.max(prev, 35));
            setSampleStep("Preparing analysis");
          }
        } else {
          addLog("api_error", "Segmentation failed");
          if (sampleLoadPendingRef.current) {
            setSampleLoading(false);
            setSampleLoadPending(false);
            sampleLoadPendingRef.current = false;
            setSampleStep("Segmentation failed");
            setSamplePhase("idle");
          }
        }
      } catch (error) {
        console.error("Error segmenting text:", error);
        addLog("api_error", "Network error during segmentation");
        if (sampleLoadPendingRef.current) {
          setSampleLoading(false);
          setSampleLoadPending(false);
          sampleLoadPendingRef.current = false;
          setSampleStep("Segmentation failed");
        }
      }
    };
    segmentText();
  }, [rawText, addLog]);

  // Call analyze API when blocks or params change
  useEffect(() => {
    const analyze = async () => {
      if (jurorBlocks.length === 0) {
        setAnalysis(null);
        return;
      }

      if (sampleLoadPendingRef.current) {
        setSampleProgress((prev) => Math.max(prev, 55));
        setSampleStep("Processing embeddings");
      }

      setLoadingAnalysis(true);
      console.log(`[Analysis] Starting analysis with model: ${selectedModel}`, { kConcepts, clusteringMode });
      addLog("api_request", `Starting semantic analysis (k=${kConcepts}, mode=${clusteringMode})`);
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blocks: jurorBlocks,
            kConcepts,
            similarityThreshold,
            evidenceRankingParams,
            clusteringMode,
            progressId: sampleLoadPendingRef.current ? sampleProgressIdRef.current ?? undefined : undefined,
            autoK,
            autoUnit,
            autoWeights,
            autoKStability,
            autoKDominanceThreshold,
            autoKKPenalty,
            autoKEpsilon,
            autoMinClusterSize,
            minClusterSize,
            autoDominanceCap,
            autoDominanceCapThreshold,
            autoSeed,
            seedCandidates,
            seedPerturbations,
            seedCoherenceWeight,
            seedSeparationWeight,
            seedStabilityWeight,
            seedDominancePenaltyWeight,
            seedMicroClusterPenaltyWeight,
            seedLabelPenaltyWeight,
            seedDominanceThreshold,
            kMin: kMinOverride,
            kMax: kMaxOverride,
            clusterSeed,
            softMembership,
            cutType,
            granularityPercent: cutType === "granularity" ? granularityPercent : undefined,
            numDimensions,
            dimensionMode,
            varianceThreshold,
            model: selectedModel,
            anchorAxes,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          console.log(`[Analysis] Analysis successful`, data);
          addLog("api_response", `Analysis complete`, data);
          if (sampleLoadPendingRef.current) {
            setSampleProgress((prev) => Math.max(prev, 80));
            setSampleStep("Clustering concepts");
          }
          
          // Add any server-side logs to the console
          if (data.logs && Array.isArray(data.logs)) {
            data.logs.forEach((l: any) => {
              addLog(l.type, l.message, l.data);
            });
          }
          
          setAnalysis(data.analysis);
        } else {
          const errorData = await response.json();
          console.error(`[Analysis] Analysis failed`, errorData);
          addLog("api_error", `Analysis failed: ${errorData.error || response.statusText}`);
          if (sampleLoadPendingRef.current) {
            setSampleLoading(false);
            setSampleLoadPending(false);
            sampleLoadPendingRef.current = false;
            setSampleStep("Analysis failed");
            setSamplePhase("idle");
          }
        }
      } catch (error) {
        console.error("[Analysis] Network error:", error);
        addLog("api_error", `Network error during analysis`);
        setAnalysis(null);
        if (sampleLoadPendingRef.current) {
          setSampleLoading(false);
          setSampleLoadPending(false);
          sampleLoadPendingRef.current = false;
          setSampleStep("Analysis failed");
          setSamplePhase("idle");
        }
      } finally {
        setLoadingAnalysis(false);
      }
    };

    analyze();
  }, [jurorBlocks, kConcepts, similarityThreshold, evidenceRankingParams, clusteringMode, autoK, autoUnit, autoWeights, autoKStability, autoKDominanceThreshold, autoKKPenalty, autoKEpsilon, autoMinClusterSize, minClusterSize, autoDominanceCap, autoDominanceCapThreshold, autoSeed, seedCandidates, seedPerturbations, seedCoherenceWeight, seedSeparationWeight, seedStabilityWeight, seedDominancePenaltyWeight, seedMicroClusterPenaltyWeight, seedLabelPenaltyWeight, seedDominanceThreshold, kMinOverride, kMaxOverride, clusterSeed, softMembership, cutType, granularityPercent, numDimensions, selectedModel, dimensionMode, varianceThreshold, anchorAxes, addLog]);

  useEffect(() => {
    if (!sampleProgressId || !sampleLoadPending) return;
    if (sampleEventSourceRef.current) {
      sampleEventSourceRef.current.close();
      sampleEventSourceRef.current = null;
    }
    const source = new EventSource(`/api/analyze/progress?id=${encodeURIComponent(sampleProgressId)}`);
    sampleEventSourceRef.current = source;

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (typeof payload.progress === "number") {
          setSampleProgress((prev) => Math.max(prev, payload.progress));
        }
        if (typeof payload.step === "string") {
          setSampleStep(payload.step);
        }
        if (payload.error) {
          setSampleStep("Analysis failed");
          setSampleLoading(false);
          setSampleLoadPending(false);
          sampleLoadPendingRef.current = false;
          setSampleProgressId(null);
          sampleProgressIdRef.current = null;
          setSamplePhase("idle");
          source.close();
          sampleEventSourceRef.current = null;
        }
        if (payload.done) {
          setSampleProgress(100);
          setSampleStep("Rendering 3D map");
          setTimeout(() => {
            setSampleLoading(false);
            setSampleLoadPending(false);
            sampleLoadPendingRef.current = false;
            setSamplePhase("ready");
            setSampleProgressId(null);
            sampleProgressIdRef.current = null;
          }, 600);
          setTimeout(() => {
            source.close();
            sampleEventSourceRef.current = null;
          }, 650);
        }
      } catch (err) {
        console.error("[SampleProgress] Failed to parse SSE payload", err);
      }
    };

    source.onerror = () => {
      setSampleStep("Progress stream disconnected");
      setSamplePhase("idle");
      source.close();
      sampleEventSourceRef.current = null;
    };

    return () => {
      source.close();
      if (sampleEventSourceRef.current === source) {
        sampleEventSourceRef.current = null;
      }
    };
  }, [sampleProgressId, sampleLoadPending]);

  // Helper function to get node network (node + connected links + connected nodes)
  const getNodeNetwork = useCallback((nodeId: string, nodes: GraphNode[], links: GraphLink[]) => {
    const nodeIds = new Set<string>([nodeId]);
    const linkIds = new Set<string>();

    // Find all links connected to this node
    for (const link of links) {
      const sourceId = typeof link.source === "string" ? link.source : link.source.id;
      const targetId = typeof link.target === "string" ? link.target : link.target.id;

      if (sourceId === nodeId || targetId === nodeId) {
        linkIds.add(link.id);
        // Add the other node
        nodeIds.add(sourceId === nodeId ? targetId : sourceId);
      }
    }

    return { nodeIds, linkIds };
  }, []);

  // Helper function to get link network (link + its two nodes)
  const getLinkNetwork = useCallback((linkId: string, links: GraphLink[]) => {
    const link = links.find((l) => l.id === linkId);
    if (!link) return { nodeIds: new Set<string>(), linkIds: new Set<string>() };

    const sourceId = typeof link.source === "string" ? link.source : link.source.id;
    const targetId = typeof link.target === "string" ? link.target : link.target.id;

    return {
      nodeIds: new Set([sourceId, targetId]),
      linkIds: new Set([linkId]),
    };
  }, []);

  // Apply filters and calculate visibility maps (opacity: 0 = grayed out, 0.7 = connected, 1.0 = selected/visible)
  const { filteredNodes, filteredLinks, nodeVisibility, linkVisibility } = useMemo(() => {
    if (!analysis) {
      return {
        filteredNodes: [] as GraphNode[],
        filteredLinks: [] as GraphLink[],
        nodeVisibility: new Map<string, number>(),
        linkVisibility: new Map<string, number>(),
      };
    }

    const searchTerm = search.trim().toLowerCase();

    const nodeOk = (n: GraphNode) => {
      if (!searchTerm) return true;
      const topTerms = n.meta?.topTerms;
      const hay = `${n.label} ${Array.isArray(topTerms) ? topTerms.join(" ") : ""}`.toLowerCase();
      return hay.includes(searchTerm);
    };

    // Start with all nodes and links (only search and weight filters apply)
    const nodes = analysis.nodes.filter(nodeOk);
    const links = analysis.links.filter((l) => l.weight >= minEdgeWeight);

    // Calculate visibility maps (opacity values: 0 = grayed out, 0.7 = connected, 1.0 = selected/visible)
    const linkVisibility = new Map<string, number>();
    const nodeVisibility = new Map<string, number>();

    if (adaptiveMode) {
      // Adaptive mode: everything starts grayed out, only selected networks are visible
      // Start with all nodes/links grayed out (opacity 0)
      for (const node of nodes) {
        nodeVisibility.set(node.id, 0);
      }
      for (const link of links) {
        linkVisibility.set(link.id, 0);
      }

      // Helper to check if a node passes current manual filters
      const nodePassesFilters = (nId: string) => {
        const node = analysis.nodes.find((n) => n.id === nId);
        if (!node) return false;
        // Search filter
        if (!nodeOk(node)) return false;
        // Manual toggles
        if (node.type === "juror" && !showJurorNodes) return false;
        if (node.type === "concept" && !showConceptNodes) return false;
        return true;
      };

      // Helper to check if a link passes current manual filters
      const linkPassesFilters = (lId: string) => {
        const link = analysis.links.find((l) => l.id === lId);
        if (!link) return false;
        // Weight filter
        if (link.weight < minEdgeWeight) return false;
        // Manual toggles
        if (link.kind === "jurorConcept" && !showJurorConceptLinks) return false;
        if (link.kind === "jurorJuror" && !showJurorJurorLinks) return false;
        if (link.kind === "conceptConcept" && !showConceptConceptLinks) return false;

        if (link.kind === "jurorConcept") {
          const stance = link.stance ?? "neutral";
          if (stance === "praise" && !showPraise) return false;
          if (stance === "critique" && !showCritique) return false;
          if (stance === "suggestion" && !showSuggestion) return false;
          if (stance === "neutral" && !showNeutral) return false;
        }
        return true;
      };

      // 1. Directly selected nodes and links always get 1.0 opacity (regardless of filters)
      for (const nodeId of adaptiveSelectedNodeIds) {
        nodeVisibility.set(nodeId, 1.0);
      }
      for (const linkId of adaptiveSelectedLinkIds) {
        linkVisibility.set(linkId, 1.0);
      }

      // 2. Expand networks from selected nodes
      for (const nodeId of adaptiveSelectedNodeIds) {
        // Use FULL analysis data for network discovery to ensure we don't skip nodes/links
        const network = getNodeNetwork(nodeId, analysis.nodes, analysis.links);
        
        for (const nId of network.nodeIds) {
          // If not already set to 1.0 and passes filters, set to 0.7
          if (!adaptiveSelectedNodeIds.has(nId) && nodePassesFilters(nId)) {
            nodeVisibility.set(nId, 0.7);
          }
        }
        for (const lId of network.linkIds) {
          if (!adaptiveSelectedLinkIds.has(lId) && linkPassesFilters(lId)) {
            linkVisibility.set(lId, 0.7);
          }
        }
      }

      // 3. Expand networks from selected links
      for (const linkId of adaptiveSelectedLinkIds) {
        // Use FULL analysis data for network discovery
        const network = getLinkNetwork(linkId, analysis.links);
        
        for (const nId of network.nodeIds) {
          if (!adaptiveSelectedNodeIds.has(nId) && nodePassesFilters(nId)) {
            nodeVisibility.set(nId, 0.7);
          }
        }
        for (const lId of network.linkIds) {
          if (!adaptiveSelectedLinkIds.has(lId) && linkPassesFilters(lId)) {
            linkVisibility.set(lId, 0.7);
          }
        }
      }
    } else {
      // Manual mode: existing toggle-based filtering logic (opacity 1.0 for visible, 0 for not visible)
      // Calculate link visibility
      for (const link of links) {
        let visible = true;

        // Check link type toggle
        if (link.kind === "jurorConcept" && !showJurorConceptLinks) visible = false;
        if (link.kind === "jurorJuror" && !showJurorJurorLinks) visible = false;
        if (link.kind === "conceptConcept" && !showConceptConceptLinks) visible = false;

        // For jurorConcept links, also check stance
        if (link.kind === "jurorConcept") {
          const stance = link.stance ?? "neutral";
          if (stance === "praise" && !showPraise) visible = false;
          if (stance === "critique" && !showCritique) visible = false;
          if (stance === "suggestion" && !showSuggestion) visible = false;
          if (stance === "neutral" && !showNeutral) visible = false;
        }

        linkVisibility.set(link.id, visible ? 1.0 : 0);
      }

      // Calculate node visibility (independent of links - based only on node type toggles)
      for (const node of nodes) {
        let visible = true;

        // Check node type toggle only
        if (node.type === "juror" && !showJurorNodes) visible = false;
        if (node.type === "concept" && !showConceptNodes) visible = false;

        nodeVisibility.set(node.id, visible ? 1.0 : 0);
      }
    }

    return { filteredNodes: nodes, filteredLinks: links, nodeVisibility, linkVisibility };
  }, [
    analysis,
    minEdgeWeight,
    adaptiveMode,
    adaptiveSelectedNodeIds,
    adaptiveSelectedLinkIds,
    showJurorNodes,
    showConceptNodes,
    showJurorConceptLinks,
    showJurorJurorLinks,
    showConceptConceptLinks,
    showPraise,
    showCritique,
    showSuggestion,
    showNeutral,
    search,
    getNodeNetwork,
    getLinkNetwork,
  ]);

  const combinedNodes = useMemo(
    () => [
      ...filteredNodes,
      ...(showDesignerNodes && designerAnalysis?.nodes ? designerAnalysis.nodes : []),
    ],
    [filteredNodes, showDesignerNodes, designerAnalysis]
  );
  const combinedLinks = useMemo(
    () => [
      ...filteredLinks,
      ...(showDesignerNodes && designerAnalysis?.links ? designerAnalysis.links : []),
      ...(showDesignerNodes ? alignmentLinks || [] : []),
    ],
    [filteredLinks, showDesignerNodes, designerAnalysis, alignmentLinks]
  );
  const combinedNodeVisibility = useMemo(() => {
    const map = new Map(nodeVisibility);
    if (showDesignerNodes && designerAnalysis?.nodes) {
      designerAnalysis.nodes.forEach((n) => map.set(n.id, 1));
    }
    return map;
  }, [nodeVisibility, showDesignerNodes, designerAnalysis]);
  const combinedLinkVisibility = useMemo(() => {
    const map = new Map(linkVisibility);
    if (showDesignerNodes && designerAnalysis?.links) {
      designerAnalysis.links.forEach((l) => map.set(l.id, 1));
    }
    if (showDesignerNodes && alignmentLinks) alignmentLinks.forEach((l) => map.set(l.id, 1));
    return map;
  }, [linkVisibility, showDesignerNodes, designerAnalysis, alignmentLinks]);

  // Selection helpers
  const selectedNode = useMemo(() => {
    if (!analysis || !selectedNodeId) return null;
    return analysis.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [analysis, selectedNodeId]);

  const selectedLink = useMemo(() => {
    if (!analysis || !selectedLinkId) return null;
    return analysis.links.find((l) => l.id === selectedLinkId) || null;
  }, [analysis, selectedLinkId]);

  const evidence = useMemo(() => {
    if (!analysis) return [] as SentenceRecord[];
    const ids = selectedLink?.evidenceIds ?? [];
    if (!ids.length) return [];
    const m = new Map(analysis.sentences.map((s) => [s.id, s] as const));
    return ids.map((id) => m.get(id)).filter(Boolean) as SentenceRecord[];
  }, [analysis, selectedLink]);

  function resetSample(): void {
    setRawText(DEFAULT_SAMPLE);
    setSearch("");
    setSelectedNodeId(null);
    setSelectedLinkId(null);
    setSamplePhase("idle");
    setSampleProgress(0);
    setSampleStep("");
    setSampleLoading(false);
    setSampleLoadPending(false);
    sampleLoadPendingRef.current = false;
    setSampleProgressId(null);
    sampleProgressIdRef.current = null;
    if (sampleEventSourceRef.current) {
      sampleEventSourceRef.current.close();
      sampleEventSourceRef.current = null;
    }
  }

  // Graph interactivity
  function onNodeClick(n: GraphNode, event?: MouseEvent): void {
    if (adaptiveMode && analysis) {
      const isShiftHeld = event?.shiftKey || false;

      if (isShiftHeld) {
        // Add just this node to selection
        setAdaptiveSelectedNodeIds((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(n.id)) {
            newSet.delete(n.id);
          } else {
            newSet.add(n.id);
          }
          return newSet;
        });
        // For shift-click, we keep the last clicked node in the inspector
        setSelectedNodeId(n.id);
        setSelectedLinkId(null);
      } else {
        // Single click: replace selection or deselect
        setAdaptiveSelectedNodeIds((prev) => {
          if (prev.size === 1 && prev.has(n.id)) {
            setSelectedNodeId(null); // Deselect from inspector too
            return new Set();
          }
          setSelectedNodeId(n.id); // Set for inspector
          return new Set([n.id]);
        });
        setAdaptiveSelectedLinkIds(new Set());
        setSelectedLinkId(null);
      }
    } else {
      // Existing behavior: toggle selection for inspector
      setSelectedLinkId(null);
      setSelectedNodeId((prev) => (prev === n.id ? null : n.id));
    }
  }

  function onLinkClick(l: GraphLink, event?: MouseEvent): void {
    if (adaptiveMode && analysis) {
      const isShiftHeld = event?.shiftKey || false;

      if (isShiftHeld) {
        // Add just this link to selection
        setAdaptiveSelectedLinkIds((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(l.id)) {
            newSet.delete(l.id);
          } else {
            newSet.add(l.id);
          }
          return newSet;
        });
        // For shift-click, keep link in inspector
        setSelectedLinkId(l.id);
        setSelectedNodeId(null);
      } else {
        // Single click: replace selection or deselect
        setAdaptiveSelectedLinkIds((prev) => {
          if (prev.size === 1 && prev.has(l.id)) {
            setSelectedLinkId(null); // Deselect from inspector
            return new Set();
          }
          setSelectedLinkId(l.id); // Set for inspector
          return new Set([l.id]);
        });
        setAdaptiveSelectedNodeIds(new Set());
        setSelectedNodeId(null);
      }
    } else {
      // Existing behavior
      setSelectedNodeId(null);
      setSelectedLinkId((prev) => (prev === l.id ? null : l.id));
    }
  }

  function onNodeDoubleClick(n: GraphNode): void {
    // In 3D mode, double-click can be used to focus on a node
    // For now, just toggle selection
    setSelectedLinkId(null);
    setSelectedNodeId((prev) => (prev === n.id ? null : n.id));
  }

  function onDeselect(): void {
    setSelectedNodeId(null);
    setSelectedLinkId(null);
    if (adaptiveMode) {
      setAdaptiveSelectedNodeIds(new Set());
      setAdaptiveSelectedLinkIds(new Set());
    }
  }

  const emptyState = (!analysis || analysis.stats.totalSentences === 0) &&
    (!designerAnalysis || (designerAnalysis.sentences?.length ?? 0) === 0);

  const handleExportPdf = useCallback(async () => {
    if (!analysis || emptyState) return;
    const timestamp = new Date().toISOString();
    setExportTimestamp(timestamp);
    setInspectorTab("analysis");
    setExportingPdf(true);
    try {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
      const container = analysisContainerRef.current;
      if (!container) throw new Error("Analysis panel not ready");
      await downloadPdfServer(container, `analysis-report-${timestamp.slice(0, 10)}.pdf`);
    } catch (error) {
      console.error("[Export PDF] Failed to export analysis report", error);
    } finally {
      setExportingPdf(false);
    }
  }, [analysis, emptyState]);

  const handleDesignerAnalysis = useCallback(async () => {
    if (designerBlocks.length === 0) return;
    setDesignerLoading(true);
    try {
      const response = await fetch("/api/analyze-designer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: designerBlocks, kConcepts: designerKConcepts }),
      });
      if (response.ok) {
        const data = await response.json();
        setDesignerAnalysis(data.analysis);
        addLog("analysis", "Designer analysis complete");
      } else {
        addLog("api_error", "Designer analysis failed");
      }
    } catch (error) {
      console.error("[DesignerAnalysis] Network error:", error);
      addLog("api_error", "Network error during designer analysis");
    } finally {
      setDesignerLoading(false);
    }
  }, [designerBlocks, designerKConcepts, addLog]);

  const handleAlignment = useCallback(async () => {
    if (!analysis || !designerAnalysis) return;
    setAligning(true);
    try {
      const response = await fetch("/api/align", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jurorAnalysis: analysis, designerAnalysis, threshold: similarityThreshold }),
      });
      if (response.ok) {
        const data = await response.json();
        setAlignmentLinks(data.links || []);
        addLog("analysis", `Alignment complete: ${data.links?.length ?? 0} links`);
      } else {
        addLog("api_error", "Alignment failed");
      }
    } catch (error) {
      console.error("[Alignment] error", error);
      addLog("api_error", "Network error during alignment");
    } finally {
      setAligning(false);
    }
  }, [analysis, designerAnalysis, similarityThreshold, addLog]);

  const handleAddDesignerBlock = useCallback((block: DesignerBlock) => {
    setDesignerBlocks((prev) => [...prev, block]);
  }, []);

  const handleLoadSample = useCallback(() => {
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setSampleLoadPending(true);
    sampleLoadPendingRef.current = true;
    setSampleLoading(true);
    setSampleProgress(5);
    setSampleStep("Cleaning text");
    setSampleProgressId(id);
    sampleProgressIdRef.current = id;
    setRawText(DEFAULT_SAMPLE);
    setIngestError(null);
    setSamplePhase("loading");
  }, []);

  const handleAutoRotateDisabled = useCallback(() => {
    setAutoRotateDisabled(true);
    setTurntableEnabled(false);
    addLog("info", "User interacted with 3D canvas - turntable disabled");
  }, [addLog]);

  const handleToggleTurntable = useCallback(() => {
    setTurntableEnabled((prev) => {
      const newValue = !prev;
      // When enabling turntable, clear the auto-rotate disabled flag so rotation can start
      if (newValue) {
        setAutoRotateDisabled(false);
      }
      return newValue;
    });
  }, []);

  const handleOpenUploadSidebar = useCallback(() => {
    // Open the left sidebar
    setLeftSidebarOpen(true);
    
    // Scroll to DataInputPanel after sidebar animation
    setTimeout(() => {
      if (dataInputPanelRef.current) {
        dataInputPanelRef.current.scrollIntoView({ 
          behavior: "smooth", 
          block: "start" 
        });
      }
    }, 550); // Wait for sidebar animation (500ms) + small buffer
    
    addLog("info", "User opened upload sidebar from welcome screen");
  }, [addLog]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900">
      {/* Left Sidebar */}
      <CollapsibleSidebar
        side="left"
        isOpen={leftSidebarOpen}
        onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
        width={400}
        disableOutsideClick={ingestModalOpen || designerModalOpen}
      >
        <div className="space-y-4" ref={dataInputPanelRef}>
          <DataInputPanel
            jurorBlocks={jurorBlocks}
            onOpenJurorModal={() => setIngestModalOpen(true)}
            ingestError={ingestError}
            onOpenDesignerModal={() => setDesignerModalOpen(true)}
            designerBlocks={designerBlocks}
            onDesignerBlocksChange={setDesignerBlocks}
            designerKConcepts={designerKConcepts}
            onDesignerKConceptsChange={setDesignerKConcepts}
            designerLoading={designerLoading}
            onAnalyzeDesigner={handleDesignerAnalysis}
          />

          <AIControlsAccordion
            enableAxisLabelAI={enableAxisLabelAI}
            onToggleAxisLabelAI={setEnableAxisLabelAI}
            autoSynthesize={autoSynthesize}
            onToggleAutoSynthesize={setAutoSynthesize}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />

          <AnalysisControlsAccordion
            kConcepts={kConcepts}
            onKConceptsChange={setKConcepts}
            minEdgeWeight={minEdgeWeight}
            onMinEdgeWeightChange={setMinEdgeWeight}
            similarityThreshold={similarityThreshold}
            onSimilarityThresholdChange={setSimilarityThreshold}
            evidenceRankingParams={evidenceRankingParams}
            onEvidenceRankingParamsChange={setEvidenceRankingParams}
            clusteringMode={clusteringMode}
            onClusteringModeChange={setClusteringMode}
            autoK={autoK}
            onAutoKChange={setAutoK}
            autoUnit={autoUnit}
            onAutoUnitChange={setAutoUnit}
            autoWeights={autoWeights}
            onAutoWeightsChange={setAutoWeights}
            autoSeed={autoSeed}
            onAutoSeedChange={setAutoSeed}
            seedCandidates={seedCandidates}
            onSeedCandidatesChange={setSeedCandidates}
            seedPerturbations={seedPerturbations}
            onSeedPerturbationsChange={setSeedPerturbations}
            seedCoherenceWeight={seedCoherenceWeight}
            onSeedCoherenceWeightChange={setSeedCoherenceWeight}
            seedSeparationWeight={seedSeparationWeight}
            onSeedSeparationWeightChange={setSeedSeparationWeight}
            seedStabilityWeight={seedStabilityWeight}
            onSeedStabilityWeightChange={setSeedStabilityWeight}
            seedDominancePenaltyWeight={seedDominancePenaltyWeight}
            onSeedDominancePenaltyWeightChange={setSeedDominancePenaltyWeight}
            seedMicroClusterPenaltyWeight={seedMicroClusterPenaltyWeight}
            onSeedMicroClusterPenaltyWeightChange={setSeedMicroClusterPenaltyWeight}
            seedLabelPenaltyWeight={seedLabelPenaltyWeight}
            onSeedLabelPenaltyWeightChange={setSeedLabelPenaltyWeight}
            seedDominanceThreshold={seedDominanceThreshold}
            onSeedDominanceThresholdChange={setSeedDominanceThreshold}
            autoKStability={autoKStability}
            onAutoKStabilityChange={setAutoKStability}
            autoKDominanceThreshold={autoKDominanceThreshold}
            onAutoKDominanceThresholdChange={setAutoKDominanceThreshold}
            autoKKPenalty={autoKKPenalty}
            onAutoKKPenaltyChange={setAutoKKPenalty}
            autoKEpsilon={autoKEpsilon}
            onAutoKEpsilonChange={setAutoKEpsilon}
            autoMinClusterSize={autoMinClusterSize}
            onAutoMinClusterSizeChange={setAutoMinClusterSize}
            minClusterSize={minClusterSize}
            onMinClusterSizeChange={setMinClusterSize}
            autoDominanceCap={autoDominanceCap}
            onAutoDominanceCapChange={setAutoDominanceCap}
            autoDominanceCapThreshold={autoDominanceCapThreshold}
            onAutoDominanceCapThresholdChange={setAutoDominanceCapThreshold}
            kMinOverride={kMinOverride}
            kMaxOverride={kMaxOverride}
            onKMinOverrideChange={setKMinOverride}
            onKMaxOverrideChange={setKMaxOverride}
            clusterSeed={clusterSeed}
            onClusterSeedChange={setClusterSeed}
            softMembership={softMembership}
            onSoftMembershipChange={setSoftMembership}
            cutType={cutType}
            onCutTypeChange={setCutType}
            granularityPercent={granularityPercent}
            onGranularityPercentChange={setGranularityPercent}
            numDimensions={numDimensions}
            onNumDimensionsChange={setNumDimensions}
            dimensionMode={dimensionMode}
            onDimensionModeChange={setDimensionMode}
            varianceThreshold={varianceThreshold}
            onVarianceThresholdChange={setVarianceThreshold}
            appliedNumDimensions={appliedNumDimensions}
            anchorAxes={anchorAxes}
            onAnchorAxesChange={setAnchorAxes}
          />

        </div>
      </CollapsibleSidebar>

      {/* Main Content */}
      <main
        className={cn(
          "flex flex-1 flex-col overflow-hidden",
          !leftSidebarOpen && !rightSidebarOpen && "w-full"
        )}
      >
        {/* Header */}
        <header className="flex-shrink-0 border-b border-slate-200 bg-white px-8 py-2.5">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-slate-900 p-1.5 text-white">
                <Network className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Jury Concept Graph</h1>
                <p className="text-xs text-slate-500 font-medium">Explainable juror-concept mapping</p>
              </div>
            </div>
            
            {/* Middle: Pipeline Controls */}
            <div className="flex items-center gap-4">
              {/* Pipeline Controls */}
              {analysis?.checkpoints && analysis.checkpoints.length > 0 && (
                <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-1.5 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pipeline Trace</span>
                  <div className="flex items-center gap-1">
                    {analysis.checkpoints.map((cp, idx) => (
                      <button
                        key={cp.id}
                        onClick={() => setCheckpointIndex(idx)}
                        className={cn(
                          "h-2 w-8 rounded-full transition-all",
                          idx === checkpointIndex ? "bg-indigo-600" : "bg-slate-200 hover:bg-slate-300"
                        )}
                        title={cp.label}
                      />
                    ))}
                  </div>
                  <span className="min-w-[100px] text-[10px] font-bold text-slate-700">
                    {analysis.checkpoints[checkpointIndex]?.label ?? "Final Result"}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              {analysis?.anchorAxes && analysis.anchorAxes.length > 0 && (
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Anchor Axis</span>
                  <select
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700"
                    value={selectedAnchorAxisId ?? ""}
                    onChange={(e) => setSelectedAnchorAxisId(e.target.value || null)}
                  >
                    <option value="">None</option>
                    {analysis.anchorAxes.map((axis) => (
                      <option key={axis.id} value={axis.id}>
                        {axis.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <Button
                variant="outline"
                className="h-9 rounded-xl border-slate-200 px-4 font-semibold shadow-sm transition-all hover:bg-slate-50 hover:shadow-md active:scale-95 text-xs"
                onClick={handleExportPdf}
                disabled={!analysis || emptyState || exportingPdf}
              >
                <FileText className="mr-2 h-4 w-4" />
                {exportingPdf ? "Preparing..." : "Export PDF"}
              </Button>
              <Button
                variant="outline"
                className="h-9 rounded-xl border-slate-200 px-4 font-semibold shadow-sm transition-all hover:bg-slate-50 hover:shadow-md active:scale-95 text-xs"
                onClick={() => {
                  if (!analysis) return;
                  downloadJson(analysis, `jury-concept-graph-${new Date().toISOString().slice(0, 10)}.json`);
                }}
                disabled={!analysis || emptyState}
              >
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </Button>
              <Button
                variant="outline"
                className="h-9 rounded-xl border-slate-200 px-4 font-semibold shadow-sm transition-all hover:bg-slate-50 hover:shadow-md active:scale-95 text-xs"
                onClick={resetSample}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </header>

        {/* Graph Area with Console */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-1 flex-col overflow-hidden p-0">
            <div className="flex flex-1 flex-col overflow-hidden relative bg-white">
              <div className="flex flex-1 flex-col overflow-hidden p-0">
                <GraphCanvas3D
                  nodes={combinedNodes}
                  links={combinedLinks}
                  nodeVisibility={combinedNodeVisibility}
                  linkVisibility={combinedLinkVisibility}
                  selectedNodeId={selectedNodeId}
                  selectedLinkId={selectedLinkId}
                  onNodeClick={onNodeClick}
                  onLinkClick={onLinkClick}
                  onNodeDoubleClick={onNodeDoubleClick}
                  onDeselect={onDeselect}
                  empty={emptyState}
                  checkpoints={analysis?.checkpoints}
                  insights={insights}
                  axisLabels={displayAxisLabels}
                enableAxisLabelAI={enableAxisLabelAI}
                onToggleAxisLabelAI={setEnableAxisLabelAI}
                onRefreshAxisLabels={enableAxisLabelAI ? refreshAxisLabels : undefined}
                isRefreshingAxisLabels={isRefreshingAxisLabels}
                analysis={analysis}
                filteredNodesCount={combinedNodes.length}
                filteredLinksCount={combinedLinks.length}
                checkpointIndex={checkpointIndex}
                onCheckpointIndexChange={setCheckpointIndex}
                showAxes={showAxes}
                onToggleAxes={setShowAxes}
                showGraph={showGraph}
                onToggleGraph={setShowGraph}
                numDimensions={appliedNumDimensions}
                apiCallCount={apiCallCount}
                apiCostTotal={apiCostTotal}
                anchorAxes={analysis?.anchorAxes}
                anchorAxisScores={analysis?.anchorAxisScores}
                selectedAnchorAxisId={selectedAnchorAxisId}
                alignmentLinks={alignmentLinks}
                  onLoadSample={handleLoadSample}
                  loadingSample={sampleLoading}
                  loadingProgress={sampleProgress}
                  loadingStep={sampleStep}
                  samplePhase={samplePhase}
                  autoRotateDisabled={autoRotateDisabled}
                  onAutoRotateDisabled={handleAutoRotateDisabled}
                  turntableEnabled={turntableEnabled}
                  onToggleTurntable={handleToggleTurntable}
                  onOpenUploadSidebar={handleOpenUploadSidebar}
              />
              </div>

              {/* Floating Details Panel */}
              <FloatingDetailsPanel
                selectedNode={selectedNode}
                selectedLink={selectedLink}
                analysis={analysis}
                jurorBlocks={jurorBlocks}
                insights={insights}
                evidence={evidence}
                onFetchSummary={(id) => fetchSummary(id, addLog)}
                onClose={onDeselect}
              />
            </div>
          </div>

          {/* Bottom Integrated Inspector Panel */}
          <InspectorPanel
            logs={logs}
            analysis={analysis}
            jurorBlocks={jurorBlocks}
            axisLabels={displayAxisLabels}
            enableAxisLabelAI={enableAxisLabelAI}
            isRefreshingAxisLabels={isRefreshingAxisLabels}
            insights={insights}
            activeTab={inspectorTab}
            onTabChange={setInspectorTab}
            autoExpandOnAnalysis
            analysisContainerRef={analysisContainerRef}
            rawExportContext={rawDataExportContext}
          />

        </div>
      </main>

      {/* Right Sidebar */}
      <CollapsibleSidebar
        side="right"
        isOpen={rightSidebarOpen}
        onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
        width={400}
        disableOutsideClick={ingestModalOpen || designerModalOpen}
      >
        <div className="space-y-4">
          <GraphFiltersAccordion
            adaptiveMode={adaptiveMode}
            onAdaptiveModeChange={(value) => {
              setAdaptiveMode(value);
              if (!value) {
                setAdaptiveSelectedNodeIds(new Set());
                setAdaptiveSelectedLinkIds(new Set());
              }
            }}
            showJurorNodes={showJurorNodes}
            showConceptNodes={showConceptNodes}
            showDesignerNodes={showDesignerNodes}
            showJurorConceptLinks={showJurorConceptLinks}
            showJurorJurorLinks={showJurorJurorLinks}
            showConceptConceptLinks={showConceptConceptLinks}
            showPraise={showPraise}
            showCritique={showCritique}
            showSuggestion={showSuggestion}
            showNeutral={showNeutral}
            onShowJurorNodesChange={setShowJurorNodes}
            onShowConceptNodesChange={setShowConceptNodes}
            onShowDesignerNodesChange={setShowDesignerNodes}
            onShowJurorConceptLinksChange={setShowJurorConceptLinks}
            onShowJurorJurorLinksChange={setShowJurorJurorLinks}
            onShowConceptConceptLinksChange={setShowConceptConceptLinks}
            onShowPraiseChange={setShowPraise}
            onShowCritiqueChange={setShowCritique}
            onShowSuggestionChange={setShowSuggestion}
            onShowNeutralChange={setShowNeutral}
          />
          <SearchBarAccordion value={search} onChange={setSearch} />
          <AlignmentControls
            disabled={!analysis || !designerAnalysis}
            onAlign={handleAlignment}
            alignmentCount={alignmentLinks.length}
            loading={aligning}
          />
        </div>
      </CollapsibleSidebar>

      {/* Ingest Modal - rendered at page level for full-screen overlay */}
      <IngestModal
        open={ingestModalOpen}
        onOpenChange={setIngestModalOpen}
        mode="juror"
        rawText={rawText}
        onTextChange={setRawText}
        jurorBlocks={jurorBlocks}
      />
      <IngestModal
        open={designerModalOpen}
        onOpenChange={setDesignerModalOpen}
        mode="designer"
        onAddDesignerBlock={handleAddDesignerBlock}
      />
    </div>
  );
}

