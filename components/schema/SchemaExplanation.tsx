"use client";

import { Info, Network, Database, MessageSquare, Zap, Cpu } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

export function SchemaExplanation() {
  return (
    <div className="space-y-12 pb-12">
      {/* Header section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-500">
          <Info className="h-3 w-3" />
          System Methodology
        </div>
        <h1 className="text-4xl font-black tracking-tighter text-slate-900">Explainable NLP Pipeline</h1>
        <p className="max-w-2xl text-lg font-medium leading-relaxed text-slate-500">
          Our system transforms unstructured qualitative feedback into a structured, queryable knowledge graph using 
          multi-stage Natural Language Processing.
        </p>
      </div>

      {/* Pipeline steps */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PipelineStep 
          icon={<Database className="h-5 w-5" />}
          title="Ingestion"
          description="Raw text is parsed and segmented using juror headers. We support PDF, TXT, and direct paste."
          tags={["Regex Parser", "Juror Segmentation"]}
          color="bg-blue-50 text-blue-600"
        />
        <PipelineStep 
          icon={<Cpu className="h-5 w-5" />}
          title="Vectorization"
          description="Sentences are converted into numerical vectors using TF-IDF (Term Frequency-Inverse Document Frequency)."
          tags={["NLP", "TF-IDF"]}
          color="bg-purple-50 text-purple-600"
        />
        <PipelineStep 
          icon={<Zap className="h-5 w-5" />}
          title="Clustering"
          description="K-Means clustering groups similar sentences into 'Concepts' based on cosine similarity."
          tags={["Unsupervised ML", "K-Means"]}
          color="bg-orange-50 text-orange-600"
        />
        <PipelineStep 
          icon={<MessageSquare className="h-5 w-5" />}
          title="Stance Analysis"
          description="Edges are tagged as Praise, Critique, or Suggestion using keyword-based sentiment rules."
          tags={["Rule-based AI", "Sentiment"]}
          color="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Graph Schema */}
      <div className="rounded-[2rem] bg-slate-900 p-8 text-white shadow-2xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-white/10 p-2">
            <Network className="h-6 w-6 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Graph Ontology</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Nodes (Entities)</h3>
            <div className="space-y-6">
              <div>
                <div className="text-lg font-bold">Jurors</div>
                <p className="text-sm text-slate-400 mt-1">Representing individual human perspectives or source documents.</p>
              </div>
              <div>
                <div className="text-lg font-bold">Concepts</div>
                <p className="text-sm text-slate-400 mt-1">Centroids of sentence clusters representing major themes in the corpus.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-purple-400">Edges (Relationships)</h3>
            <div className="space-y-6">
              <div>
                <div className="text-lg font-bold">Juror → Concept</div>
                <p className="text-sm text-slate-400 mt-1">Weighted by how strongly a juror contributes to a specific theme.</p>
              </div>
              <div>
                <div className="text-lg font-bold">Concept ↔ Concept</div>
                <p className="text-sm text-slate-400 mt-1">Proximity between themes based on lexical and contextual overlap.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400">Evidence (Truth)</h3>
            <div className="space-y-6">
              <div>
                <div className="text-lg font-bold">Ground Truth</div>
                <p className="text-sm text-slate-400 mt-1">Every edge is backed by original text excerpts. No hallucinations.</p>
              </div>
              <div>
                <div className="text-lg font-bold">Auditability</div>
                <p className="text-sm text-slate-400 mt-1">The system is designed for high-stakes decisions where every signal must be traceable.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Notes */}
      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-6 text-slate-500 italic text-sm">
        "This application is built on the principle of Explainable AI. If a relationship cannot cite its supporting excerpts, 
        it is not a trustworthy signal."
      </div>
    </div>
  );
}

interface PipelineStepProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  tags: string[];
  color: string;
}

function PipelineStep({ icon, title, description, tags, color }: PipelineStepProps) {
  return (
    <div className="group relative rounded-3xl border border-slate-100 bg-white p-6 transition-all hover:border-transparent hover:shadow-xl hover:shadow-slate-200/50">
      <div className={cn("mb-4 inline-flex rounded-2xl p-3 transition-transform group-hover:scale-110", color)}>
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-black tracking-tight text-slate-900">{title}</h3>
      <p className="mb-4 text-sm font-medium leading-relaxed text-slate-500">
        {description}
      </p>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <Badge key={tag} variant="secondary" className="bg-slate-50 text-[10px] font-bold text-slate-400 border-none">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
}
