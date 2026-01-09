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

    return (
      <>
        <div className="rounded-xl border bg-white p-3">
          <div className="mb-2 text-sm font-medium">Top concepts (juror vector)</div>
          <div className="h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={jurorTopConcepts} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Each bar is the juror's normalized emphasis on that concept (derived from clustered sentences).
          </p>
        </div>

        <div className="rounded-xl border bg-white p-3">
          <div className="mb-2 text-sm font-medium">Keyphrases (juror block)</div>
          <div className="flex flex-wrap gap-2">
            {keyphrases.map((p) => (
              <Badge key={p} variant="outline" className="font-normal">
                {p}
              </Badge>
            ))}
          </div>
        </div>
      </>
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
      <>
        <div className="rounded-xl border bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-medium">Top jurors</div>
            <Badge variant="outline" className="font-normal">
              concept distribution
            </Badge>
          </div>
          <div className="h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conceptTopJurors} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-slate-600">Shows which jurors most strongly connect to this concept.</p>
        </div>

        <div className="rounded-xl border bg-white p-3">
          <div className="mb-2 text-sm font-medium">Concept label terms</div>
          <div className="flex flex-wrap gap-2">
            {topTerms.map((t) => (
              <Badge key={String(t)} variant="secondary" className="font-normal">
                {String(t)}
              </Badge>
            ))}
          </div>
        </div>
      </>
    );
  }
}

