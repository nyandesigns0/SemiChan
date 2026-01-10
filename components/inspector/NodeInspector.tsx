"use client";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { extractKeyphrases } from "@/lib/nlp/keyphrase-extractor";
import { stanceColor } from "@/lib/utils/stance-utils";
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
    <ScrollArea className="h-[400px] w-full pr-4">
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
    const keyphraseSet = new Set(keyphrases.map(kp => kp.toLowerCase()));
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
        // Exact match
        allTerms.push({ term: kp, matchType: 'exact-match' });
      } else if (hasPartialMatch(kp, semanticTerms)) {
        // Partial match
        allTerms.push({ term: kp, matchType: 'partial-match' });
      } else {
        // Keyphrase only
        allTerms.push({ term: kp, matchType: 'keyphrase-only' });
      }
    });
    
    // Process semantic terms (skip exact matches already added)
    semanticTerms.forEach((st) => {
      const lower = st.toLowerCase();
      if (processed.has(lower)) return;
      processed.add(lower);
      
      if (hasPartialMatch(st, keyphrases)) {
        // Partial match
        allTerms.push({ term: st, matchType: 'partial-match' });
      } else {
        // Semantic only
        allTerms.push({ term: st, matchType: 'semantic-only' });
      }
    });

    const jurorSentences = analysis.sentences.filter(s => s.juror === jurorName);

    return (
      <div className="flex flex-col gap-4 w-full pb-4">
        <div className="flex flex-row gap-4 items-start w-full">
          <div className="flex-1 min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Top concepts</h3>
              <Badge variant="outline" className="bg-slate-50 text-slate-500 font-medium text-xs">Distribution</Badge>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jurorTopConcepts} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#475569' }} 
                    width={120}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#3b82f6" 
                    radius={[0, 4, 4, 0]}
                    barSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-xs text-slate-500 italic">
              Relative emphasis based on global semantic themes.
            </p>
          </div>

          {analysis.jurorTopTerms && analysis.jurorTopTerms[jurorName] && (
            <div className="flex-[2] min-w-0 rounded-2xl border-2 border-slate-200 bg-slate-50/30 p-4 shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-blue-900 uppercase tracking-tight">Keyphrases</h3>
                  <p className="text-[10px] text-blue-600 font-bold opacity-70">Linguistics analysis</p>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-black text-red-900 uppercase tracking-tight">Semantic Fingerprint</h3>
                  <p className="text-[10px] text-red-600 font-bold opacity-70">Top terms from high-dimensional vector</p>
                </div>
              </div>
            <div className="flex flex-wrap gap-2 p-1">
              {allTerms.map(({ term, matchType }) => {
                  let badgeClasses = 'text-xs px-2.5 py-1 font-medium';
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
          )}
        </div>

        <div className="w-full">
          <div className="mb-3">
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Associated Sentences</h3>
            <p className="text-[10px] text-slate-500 font-medium">Full list of evidence linked to this juror</p>
          </div>
          <SentenceList sentences={jurorSentences} />
        </div>
      </div>
    );
  } else {
    const cid = node.id;
    const conceptTopJurors = analysis.jurors
      .map((j) => ({ name: j, value: analysis.jurorVectors[j]?.[cid] ?? 0 }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const topTerms = Array.isArray(node.meta?.topTerms) ? node.meta.topTerms.slice(0, 14) : [];
    
    // Include sentences that are either primary matches or have soft membership in this concept
    const conceptSentences = analysis.sentences
      .filter(s => {
        const isPrimary = s.conceptId === cid;
        const hasSoftMatch = s.conceptMembership?.some(m => m.conceptId === cid);
        return isPrimary || hasSoftMatch;
      })
      // Sort by weight for this specific concept
      .sort((a, b) => {
        const weightA = a.conceptMembership?.find(m => m.conceptId === cid)?.weight || (a.conceptId === cid ? 1 : 0);
        const weightB = b.conceptMembership?.find(m => m.conceptId === cid)?.weight || (b.conceptId === cid ? 1 : 0);
        return weightB - weightA;
      });

    return (
      <div className="flex flex-col gap-4 w-full pb-4">
        {/* First Row: AI Concept Insight (left) and Semantic Fingerprint (right) */}
        <div className="flex flex-row gap-4 items-start w-full">
          {/* AI Concept Insight */}
          <div className="flex-1 min-w-0 rounded-2xl border-2 border-indigo-100 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 p-4 shadow-md">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-indigo-600 p-1.5 text-white shadow-lg shadow-indigo-200">
                  <Badge variant="outline" className="border-none p-0 text-white text-[9px]">
                    AI
                  </Badge>
                </div>
                <div>
                  <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Concept Insight</h3>
                  <p className="text-[9px] text-indigo-500 font-medium">Synthesized from juror feedback</p>
                </div>
              </div>
              {insight?.isLoadingSummary && (
                <Badge variant="secondary" className="animate-pulse bg-indigo-100 text-indigo-700 border-none text-[9px]">
                  Analyzing...
                </Badge>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Generated Title</div>
                {insight?.isLoadingLabel ? (
                  <div className="h-6 w-full animate-pulse rounded-lg bg-slate-200" />
                ) : (
                  <div className="text-lg font-black text-slate-900 tracking-tight">
                    {insight?.shortLabel || node.label}
                  </div>
                )}
              </div>

              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">One-Line Synthesis</div>
                {insight?.isLoadingSummary ? (
                  <div className="space-y-2">
                    <div className="h-4 w-full animate-pulse rounded-full bg-slate-200" />
                    <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-200" />
                  </div>
                ) : insight?.summary ? (
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">
                    {insight.summary}
                  </p>
                ) : (
                  <div className="py-1.5">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="group px-4 py-1.5 border-indigo-200 bg-white/50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm h-auto"
                      onClick={() => onFetchSummary?.(node.id)}
                    >
                      <Sparkles className="mr-1.5 h-3 w-3 transition-transform group-hover:rotate-12" />
                      <span className="text-[10px] font-bold">Synthesize with AI</span>
                    </Button>
                    <p className="mt-1.5 text-[9px] text-slate-400 font-medium italic">
                      Requires OpenAI API call to generate professional architectural summary.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Semantic Fingerprint */}
          <div className="flex-1 min-w-0 rounded-2xl border-2 border-purple-100 bg-purple-50/20 p-4 shadow-md">
            <div className="mb-3">
              <h3 className="text-sm font-black text-purple-900 uppercase tracking-tight">Semantic Fingerprint</h3>
              <p className="text-[10px] text-purple-600 font-medium">Top terms from centroid vector</p>
            </div>
            <div className="flex flex-wrap gap-2 p-1">
              {topTerms.map((t) => (
                <Badge 
                  key={String(t)} 
                  className="text-xs px-2.5 py-1 font-medium text-purple-700 border-purple-200"
                >
                  {String(t)}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Second Row: Top Contributors (left) and Associated Sentences (right) */}
        <div className="flex flex-row gap-4 items-start w-full">
          {/* Top Contributors */}
          <div className="flex-1 min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Top contributors</h3>
              <Badge variant="outline" className="bg-slate-50 text-slate-500 text-[10px]">Distribution</Badge>
            </div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conceptTopJurors} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#475569' }} 
                    width={120}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar 
                    dataKey="value" 
                    fill="#8b5cf6" 
                    radius={[0, 4, 4, 0]}
                    barSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[10px] text-slate-500 italic">Jurors most strongly connected to this concept.</p>
          </div>

          {/* Associated Sentences */}
          <div className="flex-1 min-w-0">
            <div className="mb-3">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Associated Sentences</h3>
              <p className="text-[10px] text-slate-500 font-medium">Full list of evidence linked to this concept (including soft matches)</p>
            </div>
            <SentenceList sentences={conceptSentences} conceptId={cid} />
          </div>
        </div>
      </div>
    );
  }
}
