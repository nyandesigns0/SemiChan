"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Network, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { IngestPanel } from "@/components/ingest/IngestPanel";
import { AnalysisControlsAccordion } from "@/components/controls/AnalysisControlsAccordion";
import { StanceFiltersAccordion } from "@/components/controls/StanceFiltersAccordion";
import { SearchBarAccordion } from "@/components/controls/SearchBarAccordion";
import { ModeSelectorAccordion } from "@/components/controls/ModeSelectorAccordion";
import { type GraphMode } from "@/components/controls/ModeSelector";
import { GraphCanvas3D } from "@/components/graph/GraphCanvas3D";
import { InspectorPanel } from "@/components/inspector/InspectorPanel";
import { CorpusSummary } from "@/components/inspector/CorpusSummary";
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar";
import { segmentByJuror } from "@/lib/segmentation/juror-segmenter";
import { downloadJson } from "@/lib/utils/download";
import { cn } from "@/lib/utils/cn";
import { DEFAULT_SAMPLE } from "@/constants/nlp-constants";
import type { JurorBlock } from "@/types/nlp";
import type { AnalysisResult, SentenceRecord } from "@/types/analysis";
import type { GraphNode, GraphLink } from "@/types/graph";
import type { Stance } from "@/types/nlp";

export default function HomePage() {
  // Sidebar state with localStorage persistence
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("sidebar-left-open");
    if (saved !== null) setLeftSidebarOpen(saved === "true");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("sidebar-right-open");
    if (saved !== null) setRightSidebarOpen(saved === "true");
  }, []);

  // Save sidebar state to localStorage
  useEffect(() => {
    localStorage.setItem("sidebar-left-open", String(leftSidebarOpen));
  }, [leftSidebarOpen]);

  useEffect(() => {
    localStorage.setItem("sidebar-right-open", String(rightSidebarOpen));
  }, [rightSidebarOpen]);
  // Ingest
  const [rawText, setRawText] = useState(DEFAULT_SAMPLE);
  const [jurorBlocks, setJurorBlocks] = useState<JurorBlock[]>(() => segmentByJuror(DEFAULT_SAMPLE));

  // Analysis params
  const [kConcepts, setKConcepts] = useState(10);
  const [minEdgeWeight, setMinEdgeWeight] = useState(0.12);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.55);
  const [showNeutral, setShowNeutral] = useState(false);
  const [showPraise, setShowPraise] = useState(true);
  const [showCritique, setShowCritique] = useState(true);
  const [showSuggestion, setShowSuggestion] = useState(true);

  // Hybrid analysis weights
  const [semanticWeight, setSemanticWeight] = useState(0.7);
  const [frequencyWeight, setFrequencyWeight] = useState(0.3);

  // New algorithm state
  const [clusteringMode, setClusteringMode] = useState<"kmeans" | "hierarchical" | "hybrid">("kmeans");
  const [autoK, setAutoK] = useState(false);
  const [softMembership, setSoftMembership] = useState(false);
  const [cutType, setCutType] = useState<"count" | "granularity">("count");
  const [granularityPercent, setGranularityPercent] = useState(50);

  const [mode, setMode] = useState<GraphMode>("bipartite");
  const [search, setSearch] = useState("");

  // Selection
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null);

  // Analysis state
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  // Update blocks when rawText changes
  useEffect(() => {
    setJurorBlocks(segmentByJuror(rawText));
  }, [rawText]);

  // Call segment API when blocks change
  useEffect(() => {
    const segmentText = async () => {
      try {
        const response = await fetch("/api/segment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: rawText }),
        });
        if (response.ok) {
          const data = await response.json();
          setJurorBlocks(data.blocks);
        }
      } catch (error) {
        console.error("Error segmenting text:", error);
      }
    };
    segmentText();
  }, [rawText]);

  // Call analyze API when blocks or params change
  useEffect(() => {
    const analyze = async () => {
      if (jurorBlocks.length === 0) {
        setAnalysis(null);
        return;
      }

      setLoadingAnalysis(true);
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blocks: jurorBlocks,
            kConcepts,
            similarityThreshold,
            semanticWeight,
            frequencyWeight,
            clusteringMode,
            autoK,
            softMembership,
            cutType,
            granularityPercent: cutType === "granularity" ? granularityPercent : undefined,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          setAnalysis(data.analysis);
        }
      } catch (error) {
        console.error("Error analyzing:", error);
        setAnalysis(null);
      } finally {
        setLoadingAnalysis(false);
      }
    };

    analyze();
  }, [jurorBlocks, kConcepts, similarityThreshold, semanticWeight, frequencyWeight, clusteringMode, autoK, softMembership, cutType, granularityPercent]);

  // Apply filters + mode
  const { filteredNodes, filteredLinks } = useMemo(() => {
    if (!analysis) return { filteredNodes: [] as GraphNode[], filteredLinks: [] as GraphLink[] };

    const allowedStances = new Set<Stance>();
    if (showPraise) allowedStances.add("praise");
    if (showCritique) allowedStances.add("critique");
    if (showSuggestion) allowedStances.add("suggestion");
    if (showNeutral) allowedStances.add("neutral");

    const searchTerm = search.trim().toLowerCase();

    const nodeOk = (n: GraphNode) => {
      if (!searchTerm) return true;
      const topTerms = n.meta?.topTerms;
      const hay = `${n.label} ${Array.isArray(topTerms) ? topTerms.join(" ") : ""}`.toLowerCase();
      return hay.includes(searchTerm);
    };

    let nodes = analysis.nodes.filter(nodeOk);

    let links = analysis.links.filter((l) => l.weight >= minEdgeWeight);

    if (mode === "bipartite") {
      links = links.filter((l) => l.kind === "jurorConcept" && allowedStances.has(l.stance ?? "neutral"));
      const nodeIds = new Set<string>();
      for (const l of links) {
        nodeIds.add(String(l.source));
        nodeIds.add(String(l.target));
      }
      nodes = nodes.filter((n) => nodeIds.has(n.id));
    }

    if (mode === "jurorSimilarity") {
      links = links.filter((l) => l.kind === "jurorJuror");
      const nodeIds = new Set<string>();
      for (const l of links) {
        nodeIds.add(String(l.source));
        nodeIds.add(String(l.target));
      }
      nodes = nodes.filter((n) => n.type === "juror" && nodeIds.has(n.id));
    }

    if (mode === "conceptMap") {
      links = links.filter((l) => l.kind === "conceptConcept");
      const nodeIds = new Set<string>();
      for (const l of links) {
        nodeIds.add(String(l.source));
        nodeIds.add(String(l.target));
      }
      nodes = nodes.filter((n) => n.type === "concept" && nodeIds.has(n.id));
    }

    // Ensure all link endpoints exist
    const nodeSet = new Set(nodes.map((n) => n.id));
    links = links.filter((l) => nodeSet.has(String(l.source)) && nodeSet.has(String(l.target)));

    return { filteredNodes: nodes, filteredLinks: links };
  }, [analysis, mode, minEdgeWeight, showPraise, showCritique, showSuggestion, showNeutral, search]);

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
  }

  // Graph interactivity
  function onNodeClick(n: GraphNode): void {
    setSelectedLinkId(null);
    setSelectedNodeId((prev) => (prev === n.id ? null : n.id));
  }

  function onLinkClick(l: GraphLink): void {
    setSelectedNodeId(null);
    setSelectedLinkId((prev) => (prev === l.id ? null : l.id));
  }

  function onNodeDoubleClick(n: GraphNode): void {
    // In 3D mode, double-click can be used to focus on a node
    // For now, just toggle selection
    setSelectedLinkId(null);
    setSelectedNodeId((prev) => (prev === n.id ? null : n.id));
  }

  const emptyState = !analysis || analysis.stats.totalSentences === 0;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-50 text-slate-900">
      {/* Left Sidebar */}
      <CollapsibleSidebar
        side="left"
        isOpen={leftSidebarOpen}
        onToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
        width={400}
      >
        <div className="space-y-4">
          <IngestPanel rawText={rawText} onTextChange={setRawText} jurorBlocks={jurorBlocks} />

          <AnalysisControlsAccordion
            kConcepts={kConcepts}
            onKConceptsChange={setKConcepts}
            minEdgeWeight={minEdgeWeight}
            onMinEdgeWeightChange={setMinEdgeWeight}
            similarityThreshold={similarityThreshold}
            onSimilarityThresholdChange={setSimilarityThreshold}
            semanticWeight={semanticWeight}
            onSemanticWeightChange={setSemanticWeight}
            frequencyWeight={frequencyWeight}
            onFrequencyWeightChange={setFrequencyWeight}
            clusteringMode={clusteringMode}
            onClusteringModeChange={setClusteringMode}
            autoK={autoK}
            onAutoKChange={setAutoK}
            softMembership={softMembership}
            onSoftMembershipChange={setSoftMembership}
            cutType={cutType}
            onCutTypeChange={setCutType}
            granularityPercent={granularityPercent}
            onGranularityPercentChange={setGranularityPercent}
          />

          <StanceFiltersAccordion
            showPraise={showPraise}
            showCritique={showCritique}
            showSuggestion={showSuggestion}
            showNeutral={showNeutral}
            onShowPraiseChange={setShowPraise}
            onShowCritiqueChange={setShowCritique}
            onShowSuggestionChange={setShowSuggestion}
            onShowNeutralChange={setShowNeutral}
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
            <div className="flex items-center gap-3">
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
        <div
          className={cn(
            "flex flex-1 flex-col overflow-hidden",
            !leftSidebarOpen && !rightSidebarOpen ? "p-0" : "p-8"
          )}
        >
          <div className="flex flex-1 flex-col overflow-hidden">
            <Card
              className={cn(
                "flex flex-1 flex-col overflow-hidden border-slate-200 bg-white shadow-xl shadow-slate-200/50",
                !leftSidebarOpen && !rightSidebarOpen ? "rounded-none" : "rounded-t-[2rem]"
              )}
            >
              <CardHeader className="flex-shrink-0 border-b border-slate-50 px-8 py-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-slate-800">Graph Workspace</CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-slate-100 px-3 py-1 text-slate-600">
                      {filteredNodes.length} Nodes
                    </Badge>
                    <Badge variant="secondary" className="bg-slate-100 px-3 py-1 text-slate-600">
                      {filteredLinks.length} Edges
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col overflow-hidden p-0">
                <GraphCanvas3D
                  nodes={filteredNodes}
                  links={filteredLinks}
                  selectedNodeId={selectedNodeId}
                  selectedLinkId={selectedLinkId}
                  onNodeClick={onNodeClick}
                  onLinkClick={onLinkClick}
                  onNodeDoubleClick={onNodeDoubleClick}
                  empty={emptyState}
                  checkpoints={analysis?.checkpoints}
                />
              </CardContent>
            </Card>

            {/* Bottom Integrated Inspector Panel */}
            <InspectorPanel
              analysis={analysis}
              selectedNode={selectedNode}
              selectedLink={selectedLink}
              evidence={evidence}
              jurorBlocks={jurorBlocks}
              empty={emptyState}
            />
          </div>

          <div className="mt-4 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <div className="flex items-center gap-4">
              <span>Next.js Engine</span>
              <span className="h-1 w-1 rounded-full bg-slate-300"></span>
              <span>Explainable NLP Graph v1.0</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Double-click to pin</span>
              <span className="h-1 w-1 rounded-full bg-slate-300"></span>
              <span>Export for audit</span>
            </div>
          </div>
        </div>
      </main>

      {/* Right Sidebar */}
      <CollapsibleSidebar
        side="right"
        isOpen={rightSidebarOpen}
        onToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
        width={400}
      >
        <div className="space-y-4">
          <ModeSelectorAccordion
            mode={mode}
            onModeChange={(newMode) => {
              setMode(newMode);
              setSelectedNodeId(null);
              setSelectedLinkId(null);
            }}
          />

          <CorpusSummary analysis={analysis} empty={emptyState} />

          <SearchBarAccordion value={search} onChange={setSearch} />
        </div>
      </CollapsibleSidebar>
    </div>
  );
}

