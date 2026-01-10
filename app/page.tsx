"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Download, Network, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { IngestPanel } from "@/components/ingest/IngestPanel";
import { AnalysisControlsAccordion } from "@/components/controls/AnalysisControlsAccordion";
import { SearchBarAccordion } from "@/components/controls/SearchBarAccordion";
import { GraphFiltersAccordion } from "@/components/controls/GraphFiltersAccordion";
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

  // Adaptive mode state
  const [adaptiveMode, setAdaptiveMode] = useState(false);
  const [adaptiveSelectedNodeIds, setAdaptiveSelectedNodeIds] = useState<Set<string>>(new Set());
  const [adaptiveSelectedLinkIds, setAdaptiveSelectedLinkIds] = useState<Set<string>>(new Set());

  // Graph filter toggles
  const [showJurorNodes, setShowJurorNodes] = useState(true);
  const [showConceptNodes, setShowConceptNodes] = useState(true);
  const [showJurorConceptLinks, setShowJurorConceptLinks] = useState(true);
  const [showJurorJurorLinks, setShowJurorJurorLinks] = useState(true);
  const [showConceptConceptLinks, setShowConceptConceptLinks] = useState(true);
  const [showPraise, setShowPraise] = useState(true);
  const [showCritique, setShowCritique] = useState(true);
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [showNeutral, setShowNeutral] = useState(true);

  // Hybrid analysis weights
  const [semanticWeight, setSemanticWeight] = useState(0.7);
  const [frequencyWeight, setFrequencyWeight] = useState(0.3);

  // New algorithm state
  const [clusteringMode, setClusteringMode] = useState<"kmeans" | "hierarchical" | "hybrid">("kmeans");
  const [autoK, setAutoK] = useState(false);
  const [softMembership, setSoftMembership] = useState(false);
  const [cutType, setCutType] = useState<"count" | "granularity">("count");
  const [granularityPercent, setGranularityPercent] = useState(50);
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
      } else {
        // Single click: replace selection or deselect
        setAdaptiveSelectedNodeIds((prev) => {
          if (prev.size === 1 && prev.has(n.id)) {
            return new Set();
          }
          return new Set([n.id]);
        });
        setAdaptiveSelectedLinkIds(new Set());
      }
      setSelectedNodeId(null); // Clear manual selection
      setSelectedLinkId(null);
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
      } else {
        // Single click: replace selection or deselect
        setAdaptiveSelectedLinkIds((prev) => {
          if (prev.size === 1 && prev.has(l.id)) {
            return new Set();
          }
          return new Set([l.id]);
        });
        setAdaptiveSelectedNodeIds(new Set());
      }
      setSelectedNodeId(null);
      setSelectedLinkId(null);
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
                  nodeVisibility={nodeVisibility}
                  linkVisibility={linkVisibility}
                  selectedNodeId={selectedNodeId}
                  selectedLinkId={selectedLinkId}
                  onNodeClick={onNodeClick}
                  onLinkClick={onLinkClick}
                  onNodeDoubleClick={onNodeDoubleClick}
                  onDeselect={onDeselect}
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
            showJurorConceptLinks={showJurorConceptLinks}
            showJurorJurorLinks={showJurorJurorLinks}
            showConceptConceptLinks={showConceptConceptLinks}
            showPraise={showPraise}
            showCritique={showCritique}
            showSuggestion={showSuggestion}
            showNeutral={showNeutral}
            onShowJurorNodesChange={setShowJurorNodes}
            onShowConceptNodesChange={setShowConceptNodes}
            onShowJurorConceptLinksChange={setShowJurorConceptLinks}
            onShowJurorJurorLinksChange={setShowJurorJurorLinks}
            onShowConceptConceptLinksChange={setShowConceptConceptLinks}
            onShowPraiseChange={setShowPraise}
            onShowCritiqueChange={setShowCritique}
            onShowSuggestionChange={setShowSuggestion}
            onShowNeutralChange={setShowNeutral}
          />

          <CorpusSummary analysis={analysis} empty={emptyState} />

          <SearchBarAccordion value={search} onChange={setSearch} />
        </div>
      </CollapsibleSidebar>
    </div>
  );
}

