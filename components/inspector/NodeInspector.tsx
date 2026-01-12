"use client";

import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Sparkles, Brain, Fingerprint, Users, MessageSquare, Layers, ChevronDown, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils/cn";
import { extractKeyphrases } from "@/lib/nlp/keyphrase-extractor";
import { stanceColor } from "@/lib/utils/stance-utils";
import { getPCColor, lightenColor } from "@/lib/utils/graph-color-utils";
import type { GraphNode } from "@/types/graph";
import type { AnalysisResult, SentenceRecord } from "@/types/analysis";
import type { JurorBlock } from "@/types/nlp";
import type { ConceptInsight } from "@/hooks/useConceptSummarizer";

interface NodeInspectorProps {
  node: GraphNode;
  analysis: AnalysisResult;
  jurorBlocks: JurorBlock[];
  insight?: ConceptInsight;
  onFetchSummary?: (conceptId: string) => void;
}

function SentenceList({ sentences, conceptId }: { sentences: SentenceRecord[], conceptId?: string }) {
  if (sentences.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
        <p className="text-sm font-medium">No associated sentences found.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px] w-full pr-4">
      <div className="space-y-2">
        {sentences.map((s) => {
          // Find the specific weight for this concept if it exists
          const membership = s.conceptMembership?.find(m => m.conceptId === conceptId);
          const weight = membership ? Math.round(membership.weight * 100) : null;

          return (
            <div 
              key={s.id} 
              className="group relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
            >
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex gap-2 items-center">
                  <Badge variant="secondary" className="bg-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-600 border-none">
                    {s.juror}
                  </Badge>
                  {weight !== null && (
                    <Badge variant="outline" className="text-[10px] border-indigo-200 text-indigo-600 font-bold bg-indigo-50/50">
                      {weight}% Match
                    </Badge>
                  )}
                </div>
                <Badge 
                  variant="outline" 
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5"
                  style={{ 
                    borderColor: `${stanceColor(s.stance)}40`, 
                    color: stanceColor(s.stance),
                    backgroundColor: `${stanceColor(s.stance)}08`
                  }}
                >
                  {s.stance}
                </Badge>
              </div>
              <p className="text-xs leading-relaxed text-slate-700 font-medium">
                {s.sentence}
              </p>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export function NodeInspector({ node, analysis, jurorBlocks, insight, onFetchSummary }: NodeInspectorProps) {
  const [expandedJurorConcepts, setExpandedJurorConcepts] = useState<Set<string>>(new Set());
  
  const toggleJurorConceptExpand = (id: string) => {
    setExpandedJurorConcepts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const baseColor = node.type === "juror" ? "#3b82f6" : "#8b5cf6";
  const nodeColor = node.pcValues ? getPCColor(node.pcValues, baseColor) : baseColor;
  const lightNodeColor = lightenColor(nodeColor, 0.9);
  const mediumNodeColor = lightenColor(nodeColor, 0.5);

  const getEntityColor = (id: string, type: "juror" | "concept") => {
    const targetNode = analysis.nodes.find(n => n.id === id || (type === "juror" && n.id === `juror:${id}`));
    if (targetNode?.pcValues) {
      return getPCColor(targetNode.pcValues, type === "juror" ? "#3b82f6" : "#8b5cf6");
    }
    return type === "juror" ? "#3b82f6" : "#8b5cf6";
  };

  if (node.type === "juror") {
    const jurorName = node.label;
    const vec = analysis.jurorVectors[jurorName] || {};
    const jurorTopConcepts = analysis.concepts
      .map((c) => ({ name: c.label, value: vec[c.id] ?? 0, conceptId: c.id }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const keyphrases = extractKeyphrases(jurorBlocks.find((b) => b.juror === jurorName)?.text ?? "");
    const semanticTerms = analysis.jurorTopTerms?.[jurorName] || [];
    
    // Create sets for quick lookup
    const semanticSet = new Set(semanticTerms.map(st => st.toLowerCase()));
    
    // Helper function to check for partial matches (shared words)
    const hasPartialMatch = (term: string, otherList: string[]): boolean => {
      const termWords = term.toLowerCase().split(/\s+/);
      return otherList.some(other => {
        const otherWords = other.toLowerCase().split(/\s+/);
        const sharedWords = termWords.filter(w => otherWords.includes(w));
        return sharedWords.length > 0 && term.toLowerCase() !== other.toLowerCase();
      });
    };
    
    // Combine all terms and determine their match type
    const allTerms: Array<{ term: string; matchType: 'keyphrase-only' | 'semantic-only' | 'exact-match' | 'partial-match' }> = [];
    const processed = new Set<string>();
    
    // Process keyphrases
    keyphrases.forEach((kp) => {
      const lower = kp.toLowerCase();
      if (processed.has(lower)) return;
      processed.add(lower);
      
      if (semanticSet.has(lower)) {
        allTerms.push({ term: kp, matchType: 'exact-match' });
      } else if (hasPartialMatch(kp, semanticTerms)) {
        allTerms.push({ term: kp, matchType: 'partial-match' });
      } else {
        allTerms.push({ term: kp, matchType: 'keyphrase-only' });
      }
    });
    
    // Process semantic terms (skip exact matches already added)
    semanticTerms.forEach((st) => {
      const lower = st.toLowerCase();
      if (processed.has(lower)) return;
      processed.add(lower);
      
      if (hasPartialMatch(st, keyphrases)) {
        allTerms.push({ term: st, matchType: 'partial-match' });
      } else {
        allTerms.push({ term: st, matchType: 'semantic-only' });
      }
    });

    const jurorSentences = analysis.sentences.filter(s => s.juror === jurorName);

    return (
      <Tabs defaultValue="concepts" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger 
            value="concepts" 
            className="text-[10px] uppercase font-bold group data-[state=active]:text-white data-[state=active]:bg-[var(--active-color)] data-[state=active]:shadow-lg"
            style={{ "--active-color": nodeColor } as any}
          >
            <Brain className="h-3 w-3 mr-1.5" />
            Concepts
          </TabsTrigger>
          <TabsTrigger value="fingerprint" className="text-[10px] uppercase font-bold group data-[state=active]:text-white data-[state=active]:bg-[var(--active-color)] data-[state=active]:shadow-lg" style={{ "--active-color": nodeColor } as any}>
            <Fingerprint className="h-3 w-3 mr-1.5" />
            Fingerprint
          </TabsTrigger>
          <TabsTrigger value="sentences" className="text-[10px] uppercase font-bold group data-[state=active]:text-white data-[state=active]:bg-[var(--active-color)] data-[state=active]:shadow-lg" style={{ "--active-color": nodeColor } as any}>
            <MessageSquare className="h-3 w-3 mr-1.5" />
            Sentences
          </TabsTrigger>
          <TabsTrigger value="anchors" className="text-[10px] uppercase font-bold group data-[state=active]:text-white data-[state=active]:bg-[var(--active-color)] data-[state=active]:shadow-lg" style={{ "--active-color": nodeColor } as any}>
            Anchors
          </TabsTrigger>
        </TabsList>

        <TabsContent value="concepts" className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Top concepts</h3>
              <Badge variant="outline" className="bg-slate-50 text-slate-500 font-medium text-[9px]">Distribution</Badge>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jurorTopConcepts} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#475569' }} 
                    width={80}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  >
                    {jurorTopConcepts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getEntityColor(entry.conceptId, "concept")} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[9px] text-slate-500 italic">
              Relative emphasis based on global semantic themes.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Detailed Breakdown</h3>
            <div className="space-y-2">
              {jurorTopConcepts.map(item => {
                const isExpanded = expandedJurorConcepts.has(item.conceptId);
                const detailIds = analysis.conceptHierarchy?.[item.conceptId] || [];
                const hasDetails = detailIds.length > 0;
                const color = getEntityColor(item.conceptId, "concept");

                return (
                  <div key={item.conceptId} className="space-y-1.5">
                    <div 
                      className={cn(
                        "flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50/50 transition-all",
                        hasDetails && "cursor-pointer hover:bg-slate-100/80"
                      )}
                      onClick={() => hasDetails && toggleJurorConceptExpand(item.conceptId)}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-[11px] font-bold text-slate-700">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500">{(item.value * 100).toFixed(0)}%</span>
                        {hasDetails && (
                          <div className="text-slate-400">
                            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </div>
                        )}
                      </div>
                    </div>

                    {isExpanded && detailIds.length > 0 && (
                      <div className="ml-4 space-y-1 border-l-2 border-slate-100 pl-3">
                        {detailIds.map(dId => {
                          const weight = analysis.jurorVectorsDetail?.[node.label]?.[dId] || 0;
                          if (weight <= 0) return null;
                          const detail = analysis.detailConcepts?.find(dc => dc.id === dId);
                          return (
                            <div key={dId} className="flex items-center justify-between py-1 px-2 rounded-lg bg-white border border-slate-50">
                              <span className="text-[10px] font-medium text-slate-600">{detail?.label || dId}</span>
                              <span className="text-[9px] font-bold text-indigo-500">{(weight * 100).toFixed(0)}%</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="fingerprint" className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/30 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-blue-900 uppercase tracking-tight">Keyphrases</h3>
                <p className="text-[9px] text-blue-600 font-bold opacity-70">Linguistics analysis</p>
              </div>
              <div className="text-right">
                <h3 className="text-xs font-black text-red-900 uppercase tracking-tight">BM25 Frequency Terms</h3>
                <p className="text-[9px] text-red-600 font-bold opacity-70">Contrastive labeling</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {allTerms.map(({ term, matchType }) => {
                let badgeClasses = 'text-[10px] px-2 py-0.5 font-medium';
                if (matchType === 'keyphrase-only') {
                  badgeClasses += ' text-blue-700 border-blue-300 bg-blue-50';
                } else if (matchType === 'semantic-only') {
                  badgeClasses += ' text-red-700 border-red-300 bg-red-50';
                } else if (matchType === 'exact-match') {
                  badgeClasses += ' text-purple-100 border-purple-400 bg-purple-700';
                } else if (matchType === 'partial-match') {
                  badgeClasses += ' text-purple-900 border-purple-300 bg-purple-200';
                }
                return (
                  <Badge key={term} className={badgeClasses}>
                    {term}
                  </Badge>
                );
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sentences" className="space-y-4">
          <div className="mb-2">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Evidence List</h3>
            <p className="text-[9px] text-slate-500 font-medium">Full juror feedback segments</p>
          </div>
          <SentenceList sentences={jurorSentences} />
        </TabsContent>

        <TabsContent value="anchors" className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Anchored Axes</h3>
              <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
                {analysis.anchorAxes?.length ?? 0} axes
              </Badge>
            </div>
            {(!analysis.anchorAxes || analysis.anchorAxes.length === 0) && (
              <p className="text-[11px] text-slate-500">No anchor axes configured.</p>
            )}
            {analysis.anchorAxes && analysis.anchorAxes.length > 0 && (
              <div className="space-y-2">
                {analysis.anchorAxes.map((axis) => {
                  const score = analysis.anchorAxisScores?.jurors?.[jurorName]?.[axis.id] ?? 0;
                  return (
                    <div key={axis.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-800">{axis.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {axis.negativePole.label} ↔ {axis.positivePole.label}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] bg-white text-slate-700 border-slate-200">
                        {score.toFixed(2)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    );
  } else {
    const cid = node.id;
    const conceptTopJurors = analysis.jurors
      .map((j) => ({ name: j, value: analysis.jurorVectors[j]?.[cid] ?? 0 }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const topTerms = Array.isArray(node.meta?.topTerms) ? node.meta.topTerms.slice(0, 20) : [];
    
    const conceptSentences = analysis.sentences
      .filter(s => {
        const isPrimary = s.conceptId === cid;
        const hasSoftMatch = s.conceptMembership?.some(m => m.conceptId === cid);
        return isPrimary || hasSoftMatch;
      })
      .sort((a, b) => {
        const weightA = a.conceptMembership?.find(m => m.conceptId === cid)?.weight || (a.conceptId === cid ? 1 : 0);
        const weightB = b.conceptMembership?.find(m => m.conceptId === cid)?.weight || (b.conceptId === cid ? 1 : 0);
        return weightB - weightA;
      });

    const totalWeight = conceptSentences.reduce((acc, s) => {
      const membership = s.conceptMembership?.find(m => m.conceptId === cid);
      return acc + (membership?.weight || (s.conceptId === cid ? 1 : 0));
    }, 0);

    const sentenceCount = conceptSentences.length;
    const jurorCount = new Set(conceptSentences.map(s => s.juror)).size;

    const isPrimary = node.layer === "primary";
    const detailIds = analysis.conceptHierarchy?.[cid] || [];
    const detailConcepts = (analysis.detailConcepts || []).filter(dc => detailIds.includes(dc.id));
    const hasSubthemes = isPrimary && detailIds.length > 0;

    return (
      <Tabs defaultValue="insight" className="w-full">
        <TabsList className={cn("grid w-full mb-4", hasSubthemes ? "grid-cols-6" : "grid-cols-5")}>
          <TabsTrigger 
            value="insight" 
            className="text-[10px] uppercase font-bold px-1 group data-[state=active]:text-white data-[state=active]:bg-[var(--active-color)] data-[state=active]:shadow-lg"
            style={{ "--active-color": nodeColor } as any}
          >
            <Brain className="h-3 w-3 mr-1" />
            Insight
          </TabsTrigger>
          <TabsTrigger 
            value="fingerprint" 
            className="text-[10px] uppercase font-bold px-1 group data-[state=active]:text-white data-[state=active]:bg-[var(--active-color)] data-[state=active]:shadow-lg"
            style={{ "--active-color": nodeColor } as any}
          >
            <Fingerprint className="h-3 w-3 mr-1" />
            Terms
          </TabsTrigger>
          {hasSubthemes && (
            <TabsTrigger 
              value="subthemes" 
              className="text-[10px] uppercase font-bold px-1 group data-[state=active]:text-white data-[state=active]:bg-[var(--active-color)] data-[state=active]:shadow-lg"
              style={{ "--active-color": nodeColor } as any}
            >
              <Layers className="h-3 w-3 mr-1" />
              Subthemes
            </TabsTrigger>
          )}
          <TabsTrigger 
            value="contributors" 
            className="text-[10px] uppercase font-bold px-1 group data-[state=active]:text-white data-[state=active]:bg-[var(--active-color)] data-[state=active]:shadow-lg"
            style={{ "--active-color": nodeColor } as any}
          >
            <Users className="h-3 w-3 mr-1" />
            Jurors
            <span 
              className="ml-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-100 text-[8px] text-slate-500 font-bold group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white transition-colors"
            >
              {jurorCount}
            </span>
          </TabsTrigger>
          <TabsTrigger 
            value="anchors" 
            className="text-[10px] uppercase font-bold px-1 group data-[state=active]:text-white data-[state=active]:bg-[var(--active-color)] data-[state=active]:shadow-lg"
            style={{ "--active-color": nodeColor } as any}
          >
            Anchors
          </TabsTrigger>
          <TabsTrigger 
            value="sentences" 
            className="text-[10px] uppercase font-bold px-1 group data-[state=active]:text-white data-[state=active]:bg-[var(--active-color)] data-[state=active]:shadow-lg"
            style={{ "--active-color": nodeColor } as any}
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Text
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insight" className="space-y-4">
          <div className="rounded-2xl border-2 border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 p-4 shadow-sm" style={{ borderColor: `${nodeColor}20` }}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div 
                  className="rounded-lg p-1.5 text-white shadow-lg"
                  style={{ backgroundColor: nodeColor, boxShadow: `0 8px 16px ${nodeColor}40` }}
                >
                  <Badge variant="outline" className="border-none p-0 text-white text-[9px]">AI</Badge>
                </div>
                <div>
                  <h3 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: nodeColor }}>{isPrimary ? "Primary Concept" : "Concept Insight"}</h3>
                  <p className="text-[8px] text-indigo-500 font-medium opacity-70">Synthesized from feedback</p>
                </div>
              </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1.5">
                    <Badge 
                      variant="secondary" 
                      className="font-bold text-[9px] px-1.5 h-4 border-none transition-colors hover:bg-white"
                      style={{ backgroundColor: `${nodeColor}15`, color: nodeColor }}
                      title="W = total concept weight (sum of sentence memberships)"
                    >
                      W={totalWeight.toFixed(1)}
                    </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-slate-600 border-slate-200 font-bold text-[9px] px-1.5 h-4 transition-colors hover:bg-slate-100/60"
                    title="N = number of evidence sentences contributing to this concept"
                  >
                    N={sentenceCount}
                  </Badge>
                  <Badge 
                    variant="outline" 
                    className="text-slate-600 border-slate-200 font-bold text-[9px] px-1.5 h-4 transition-colors hover:bg-slate-100/60"
                    title="J = distinct jurors contributing evidence to this concept"
                  >
                    J={jurorCount}
                  </Badge>
                </div>
                {insight?.isLoadingSummary && (
                  <Badge variant="secondary" className="animate-pulse bg-indigo-100 text-indigo-700 border-none text-[8px]" style={{ color: nodeColor, backgroundColor: `${nodeColor}10` }}>Analyzing...</Badge>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Title</div>
                {insight?.isLoadingLabel ? (
                  <div className="h-6 w-full animate-pulse rounded-lg bg-slate-200" />
                ) : (
                  <div className="text-base font-black text-slate-900 tracking-tight leading-tight">
                    {insight?.shortLabel || node.label}
                  </div>
                )}
              </div>

              <div>
                <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Synthesis</div>
                {insight?.isLoadingSummary ? (
                  <div className="space-y-1.5">
                    <div className="h-3 w-full animate-pulse rounded-full bg-slate-200" />
                    <div className="h-3 w-2/3 animate-pulse rounded-full bg-slate-200" />
                  </div>
                ) : insight?.summary ? (
                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {insight.summary}
                  </p>
                ) : (
                  <div>
                    <Button 
                      variant="outline" 
                      className="group px-3 py-1 bg-white/50 transition-all shadow-sm h-auto text-[10px]"
                      style={{ 
                        borderColor: `${nodeColor}40`, 
                        color: nodeColor 
                      }}
                      onClick={() => onFetchSummary?.(node.id)}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = nodeColor;
                        e.currentTarget.style.color = 'white';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                        e.currentTarget.style.color = nodeColor;
                      }}
                    >
                      <Sparkles className="mr-1.5 h-3 w-3 transition-transform group-hover:rotate-12" />
                      Synthesize
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {hasSubthemes && (
          <TabsContent value="subthemes" className="space-y-4">
            <div className="mb-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Detail Subthemes</h3>
              <p className="text-[9px] text-slate-500 font-medium">Granular concepts under this primary theme</p>
            </div>
            <ScrollArea className="h-[350px] w-full pr-4">
              <div className="space-y-3">
                {detailConcepts.map(detail => (
                  <div key={detail.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <Badge variant="outline" className="text-[11px] font-bold border-indigo-200 text-indigo-700 bg-indigo-50/30">
                        {detail.label}
                      </Badge>
                      <div className="flex gap-1.5">
                        <Badge variant="secondary" className="text-[9px] bg-slate-100 text-slate-500 border-none">
                          W={detail.weight?.toFixed(1)}
                        </Badge>
                      </div>
                    </div>
                    
                    {detail.topTerms && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {detail.topTerms.slice(0, 8).map(term => (
                          <span key={term} className="text-[9px] font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                            {term}
                          </span>
                        ))}
                      </div>
                    )}

                    {detail.representativeSentences?.[0] && (
                      <p className="text-[10px] text-slate-600 italic border-l-2 border-indigo-100 pl-2">
                        "{detail.representativeSentences[0]}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        )}

        <TabsContent value="fingerprint" className="space-y-4">
          <div 
            className="rounded-2xl border p-4 shadow-sm"
            style={{ borderColor: `${nodeColor}20`, backgroundColor: `${nodeColor}05` }}
          >
            <div className="mb-3">
              <h3 className="text-xs font-black uppercase tracking-tight" style={{ color: nodeColor }}>BM25 Frequency Terms</h3>
              <p className="text-[9px] text-slate-500 font-medium opacity-80">Distinctive terms from BM25 analysis</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {topTerms.map((t) => (
                <Badge 
                  key={String(t)} 
                  className="text-[10px] px-2 py-0.5 font-medium border-none"
                  style={{ backgroundColor: `${nodeColor}10`, color: nodeColor }}
                >
                  {String(t)}
                </Badge>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="contributors" className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Top contributors</h3>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline" className="bg-slate-50 text-slate-500 font-bold text-[9px]">
                  {jurorCount} Total
                </Badge>
                <Badge variant="outline" className="bg-slate-50 text-slate-500 text-[9px]">Distribution</Badge>
              </div>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conceptTopJurors} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 10, fontWeight: 600, fill: '#475569' }} 
                    width={80}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[0, 4, 4, 0]}
                    barSize={14}
                  >
                    {conceptTopJurors.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getEntityColor(entry.name, "juror")} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[9px] text-slate-500 italic">Jurors most strongly connected to this concept.</p>
          </div>
        </TabsContent>

        <TabsContent value="anchors" className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">Anchored Axes</h3>
              <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
                {analysis.anchorAxes?.length ?? 0} axes
              </Badge>
            </div>
            {(!analysis.anchorAxes || analysis.anchorAxes.length === 0) && (
              <p className="text-[11px] text-slate-500">No anchor axes configured.</p>
            )}
            {analysis.anchorAxes && analysis.anchorAxes.length > 0 && (
              <div className="space-y-2">
                {analysis.anchorAxes.map((axis) => {
                  const score = analysis.anchorAxisScores?.concepts?.[cid]?.[axis.id] ?? 0;
                  return (
                    <div key={axis.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <div>
                        <div className="text-[11px] font-semibold text-slate-800">{axis.name}</div>
                        <div className="text-[10px] text-slate-500">
                          {axis.negativePole.label} ↔ {axis.positivePole.label}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px] bg-white text-slate-700 border-slate-200">
                        {score.toFixed(2)}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="sentences" className="space-y-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Associated Sentences</h3>
                <p className="text-[9px] text-slate-500 font-medium">Full list of evidence (including soft matches)</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge 
                variant="secondary" 
                className="border-none font-bold text-[10px] px-2 transition-colors hover:bg-white"
                style={{ backgroundColor: `${nodeColor}15`, color: nodeColor }}
                title="W = total concept weight (sum of sentence memberships)"
              >
                W={totalWeight.toFixed(1)}
              </Badge>
              <Badge 
                variant="outline" 
                className="text-slate-600 border-slate-200 font-bold text-[10px] px-2 transition-colors hover:bg-slate-100/60"
                title="N = number of evidence sentences contributing to this concept"
              >
                N={sentenceCount}
              </Badge>
              <Badge 
                variant="outline" 
                className="text-slate-600 border-slate-200 font-bold text-[10px] px-2 transition-colors hover:bg-slate-100/60"
                title="J = distinct jurors contributing evidence to this concept"
              >
                J={jurorCount}
              </Badge>
            </div>
          </div>
          <SentenceList sentences={conceptSentences} conceptId={cid} />
        </TabsContent>
      </Tabs>
    );
  }
}
