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
    const overlappingTerms = new Set(
      keyphrases.filter((kp) => semanticTerms.some((st) => st.toLowerCase() === kp.toLowerCase()))
    );

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

        <div className="flex-1 min-w-0 rounded-2xl border border-blue-100 bg-blue-50/30 p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-black text-blue-900 uppercase tracking-tight">Keyphrases</h3>
            <p className="text-xs text-blue-600 font-bold opacity-70">Linguistics analysis</p>
          </div>
          <div className="flex flex-wrap gap-3 content-start p-1">
            {keyphrases.map((p) => (
              <Badge 
                key={p} 
                className={`term-badge text-blue-700 border-blue-200 ${
                  overlappingTerms.has(p) ? 'bg-amber-100 border-amber-300' : ''
                }`}
              >
                {p}
              </Badge>
            ))}
          </div>
        </div>

        {analysis.jurorTopTerms && analysis.jurorTopTerms[jurorName] && (
          <div className="flex-1 min-w-0 rounded-2xl border-2 border-indigo-100 bg-indigo-50/20 p-5 shadow-md">
            <div className="mb-4">
              <h3 className="text-lg font-black text-indigo-900 uppercase tracking-tight">Semantic Fingerprint</h3>
              <p className="text-xs text-indigo-600 font-medium">High-dimensional juror-concept centroids</p>
            </div>
            <div className="flex flex-wrap gap-3 p-1">
              {analysis.jurorTopTerms[jurorName].map((term) => {
                const isOverlapping = keyphrases.some((kp) => kp.toLowerCase() === term.toLowerCase());
                return (
                  <Badge 
                    key={term} 
                    className={`term-badge text-indigo-700 border-indigo-200 ${
                      isOverlapping ? 'bg-amber-100 border-amber-300' : ''
                    }`}
                  >
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
            <h3 className="text-lg font-black text-purple-900 uppercase tracking-tight">Concept Vocabulary</h3>
            <p className="text-xs text-purple-600 font-medium">Primary terms from centroid weights</p>
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

