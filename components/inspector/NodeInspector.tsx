"use client";

import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { extractKeyphrases } from "@/lib/nlp/keyphrase-extractor";
import type { GraphNode } from "@/types/graph";
import type { AnalysisResult } from "@/types/analysis";
import type { JurorBlock } from "@/types/nlp";

interface NodeInspectorProps {
  node: GraphNode;
  analysis: AnalysisResult;
  jurorBlocks: JurorBlock[];
}

export function NodeInspector({ node, analysis, jurorBlocks }: NodeInspectorProps) {
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

    return (
      <div className="flex flex-row gap-6 items-start w-full">
        <div className="flex-1 min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
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
          <div className="flex-[2] min-w-0 rounded-2xl border-2 border-slate-200 bg-slate-50/30 p-5 shadow-md">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-blue-900 uppercase tracking-tight">Keyphrases</h3>
                <p className="text-xs text-blue-600 font-bold opacity-70">Linguistics analysis</p>
              </div>
              <div className="text-right">
                <h3 className="text-base font-black text-red-900 uppercase tracking-tight">Semantic Fingerprint</h3>
                <p className="text-xs text-red-600 font-bold opacity-70">Top terms from high-dimensional vector</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 p-1">
              {allTerms.map(({ term, matchType }) => {
                let badgeClasses = 'term-badge';
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
    );
  } else {
    const cid = node.id;
    const conceptTopJurors = analysis.jurors
      .map((j) => ({ name: j, value: analysis.jurorVectors[j]?.[cid] ?? 0 }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const topTerms = Array.isArray(node.meta?.topTerms) ? node.meta.topTerms.slice(0, 14) : [];

    return (
      <div className="flex flex-row gap-6 items-start w-full">
        <div className="flex-1 min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Top contributors</h3>
            <Badge variant="outline" className="bg-slate-50 text-slate-500 text-xs">Distribution</Badge>
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
          <p className="mt-3 text-xs text-slate-500 italic">Jurors most strongly connected to this concept.</p>
        </div>

        <div className="flex-1 min-w-0 rounded-2xl border-2 border-purple-100 bg-purple-50/20 p-5 shadow-md">
          <div className="mb-4">
            <h3 className="text-lg font-black text-purple-900 uppercase tracking-tight">Semantic Fingerprint</h3>
            <p className="text-xs text-purple-600 font-medium">Top terms from centroid vector</p>
          </div>
          <div className="flex flex-wrap gap-3 p-1">
            {topTerms.map((t) => (
              <Badge 
                key={String(t)} 
                className="term-badge text-purple-700 border-purple-200"
              >
                {String(t)}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

