"use client";

import React, { useState, useMemo } from "react";
import { 
  Activity, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  FileText, 
  Users, 
  MessageSquare, 
  Lightbulb, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Layout,
  Layers,
  Zap,
  Info,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { 
  InterpretationReport, 
  AxisInterpretation, 
  ConceptInterpretation, 
  JurorInterpretation, 
  ActionStep 
} from "@/types/interpretation";
import type { AnalysisResult } from "@/types/analysis";
import type { RawDataExportContext } from "./export-types";
import { SUPPORTED_MODELS } from "@/constants/nlp-constants";
import { Label } from "@/components/ui/label";

interface InterpretationDashboardProps {
  report: InterpretationReport;
  analysis: AnalysisResult | null;
  rawExportContext?: RawDataExportContext;
  onRefresh?: () => void;
  isGenerating?: boolean;
  progress?: number;
  stage?: string | null;
  selectedModel?: string;
  onModelChange?: (model: string) => void;
}

export function InterpretationDashboard({
  report,
  analysis,
  rawExportContext,
  onRefresh,
  isGenerating = false,
  progress = 0,
  stage = null,
  selectedModel,
  onModelChange
}: InterpretationDashboardProps) {
  const [showAppendix, setShowAppendix] = useState(false);

  // Filter concepts
  const filteredConcepts = report.concepts;

  // No filtering for jurors to ensure alignment with ground truth
  const filteredJurors = report.jurors;

  return (
    <div className="flex flex-col min-h-full bg-[#0b0d10] text-[#e8eef6] p-6 space-y-6 font-sans">
      {/* Header */}
      <header className="relative overflow-hidden rounded-2xl border border-[#1f2630] bg-gradient-to-b from-[#11151b]/92 to-[#11151b]/72 p-6 shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-blue-400/90 via-emerald-500/85 to-orange-500/85" />
        
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{report.meta.title || "Interpretation Dashboard"}</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {selectedModel && (
              <div className="flex items-center gap-3 mr-2">
                <Label className="hidden sm:flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-[#7e8b9c]">
                  <Sparkles className="h-3 w-3" />
                  Model
                </Label>
                <div className="relative group w-32">
                  <select
                    value={selectedModel}
                    onChange={(e) => onModelChange?.(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#1f2630] bg-[#0c1016] px-3 py-1.5 text-[11px] font-bold uppercase tracking-tight text-[#e8eef6] outline-none transition-all hover:border-blue-500/50 focus:ring-2 focus:ring-blue-500/10"
                  >
                    {SUPPORTED_MODELS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#7e8b9c] group-hover:text-blue-400">
                    <Sparkles className="h-3 w-3" />
                  </div>
                </div>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-xl border-[#1f2630] bg-[#151c25]/62 text-[#a9b6c7] hover:bg-[#1f2630] h-9" 
              onClick={onRefresh}
              disabled={isGenerating}
            >
              <Activity className={cn("mr-2 h-3.5 w-3.5", isGenerating && "animate-spin")} />
              {isGenerating ? "Generating..." : "Regenerate"}
            </Button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2">
            <MetaChip label="Sentences" value={report.meta.sentences} />
            <MetaChip label="Jurors" value={report.meta.jurors} />
            <MetaChip label="Concepts" value={report.meta.conceptsFinalK} />
            <MetaChip label="Health" value={report.meta.healthScorePct ? `${report.meta.healthScorePct}%` : null} />
          </div>
          
          <div className="w-px h-4 bg-[#1f2630] mx-1 hidden md:block" />
          
          <div className="flex flex-wrap gap-2">
            {report.meta.stance?.praise && <StancePill label="Praise" data={report.meta.stance.praise} color="emerald" />}
            {report.meta.stance?.critique && <StancePill label="Critique" data={report.meta.stance.critique} color="red" />}
            {report.meta.stance?.suggestion && <StancePill label="Suggestion" data={report.meta.stance.suggestion} color="orange" />}
            {report.meta.stance?.neutral && <StancePill label="Neutral" data={report.meta.stance.neutral} color="slate" />}
          </div>

          <div className="w-px h-4 bg-[#1f2630] mx-1 hidden md:block" />

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 bg-[#151c25]/45 border border-[#1f2630] px-3 py-1.5 rounded-full cursor-pointer select-none hover:bg-[#151c25]/70 transition-colors">
              <input 
                type="checkbox" 
                className="rounded border-[#1f2630] bg-[#0c1016] text-blue-500 focus:ring-offset-0 focus:ring-blue-500/20 w-3.5 h-3.5"
                checked={showAppendix}
                onChange={(e) => setShowAppendix(e.target.checked)}
              />
              <span className="text-[11px] font-medium text-[#a9b6c7]">Appendix</span>
            </label>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Executive Summary */}
        <Section id="exec" title="Executive Summary" hint="Plain-English interpretation of what the jury seems to trust, doubt, and demand.">
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6">
            <div>
              <p className="text-[#a9b6c7] mb-4 text-sm leading-relaxed">
                This dashboard translates the jury’s written patterns into actionable design priorities. It is not a scorecard. It is a map of trust: where jurors reward clarity and accountable design logic, and where they lose confidence when representation and spatial scale are under-explained.
              </p>
              <ul className="space-y-3">
                {report.interpretation.takeaways.map((takeaway, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed">
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 mt-2" />
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="space-y-4">
              <Callout variant="risk" title="Primary Risk" content={report.interpretation.primaryRisk} />
              <Callout variant="advantage" title="Primary Advantage" content={report.interpretation.primaryAdvantage} />
              <div className="rounded-xl border border-[#1f2630] bg-[#0f1318]/78 p-4">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#a9b6c7] mb-2">What stands out</h3>
                <p className="text-sm text-[#a9b6c7] leading-relaxed italic">
                  The most dominant themes focus on the intersection of poetic intent and technical legibility; praise is repeatedly qualified by demands for clearer sectional logic and scale.
                </p>
              </div>
            </div>
          </div>
        </Section>

        {/* Axes -> Jury Tensions */}
        <Section id="axes" title="Axes → Jury Tensions" hint="Each axis is a value conflict. Higher variance means the tension matters more to outcomes.">
          <div className="space-y-4">
            {report.axes.map(axis => (
              <AxisCard key={axis.id} axis={axis} concepts={report.concepts} />
            ))}
          </div>
        </Section>

        {/* Concept Map */}
        <Section id="concepts" title="Concept Map" hint="Concepts sorted by share. Evidence lines are included to keep interpretation traceable.">
          <div className="space-y-6">
            <div className="rounded-xl border border-[#1f2630] bg-[#0f1318]/78 p-4 flex gap-3">
              <Info className="h-5 w-5 text-blue-400 flex-shrink-0" />
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#a9b6c7] mb-1">Concept Overlap Risk</h3>
                <p className="text-sm text-[#a9b6c7] italic">
                  No critical overlaps detected that would confuse the narrative. However, ensure "Dynamic Light" and "Poetic Shadow" are clearly differentiated through distinct drawing types.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[#1f2630] bg-[#0c1016]/45">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-[#11151b]/92 border-b border-[#1f2630]">
                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#a9b6c7] w-[300px]">Concept</th>
                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#a9b6c7] w-[180px]">Share</th>
                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#a9b6c7] w-[80px]">Count</th>
                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#a9b6c7] w-[150px]">Juror Support</th>
                    <th className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#a9b6c7]">Top Evidence Sentence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1f2630]/75">
                  {filteredConcepts.map(concept => (
                    <ConceptRow key={concept.id} concept={concept} maxShare={Math.max(...report.concepts.map(c => c.sharePct))} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredConcepts.map(concept => (
                <ConceptCard key={concept.id} concept={concept} />
              ))}
            </div>
          </div>
        </Section>

        {/* Juror Personas */}
        <Section id="jurors" title="Juror Personas" hint="Design-useful personas: values, red lines, and an actionable checklist.">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJurors.map(juror => (
              <JurorCard key={juror.id} juror={juror} concepts={report.concepts} />
            ))}
          </div>
        </Section>

        {/* Design Strategy */}
        <Section id="strategy" title="Design Strategy" hint="Convert jury values into architectural decisions and submission tactics.">
          <div className="space-y-6">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <Layout className="h-4 w-4 text-blue-400" />
              A) Architectural Strategy
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StrategyGroup title="Shadow as Spatial Organizer" bullets={report.interpretation.architecture?.shadowOrganizer || []} />
              <StrategyGroup title="Temporal Light Performance" bullets={report.interpretation.architecture?.temporalLight || []} />
              <StrategyGroup title="Material/Sectional Depth" bullets={report.interpretation.architecture?.sectionDepth || []} />
              <StrategyGroup title="Controlled Restraint vs Expression" bullets={report.interpretation.architecture?.restraintExpression || []} />
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-bold flex items-center gap-2 mb-4">
                <Layers className="h-4 w-4 text-emerald-400" />
                B) Representation Strategy
              </h3>
              <div className="rounded-xl border border-[#1f2630] bg-[#0f1318]/70 p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <DrawingLayer index={1} title="Poetic Layer" description={report.interpretation.representation?.poeticLayer || ""} />
                  <DrawingLayer index={2} title="Analytical Layer" description={report.interpretation.representation?.analyticalLayer || ""} />
                  <DrawingLayer index={3} title="Narrative Layer" description={report.interpretation.representation?.narrativeLayer || ""} />
                </div>
                <div className="pt-4 border-t border-[#1f2630]/50 text-sm text-[#7e8b9c] italic">
                  {report.interpretation.representation?.confidenceNote || "Confidence is lost when drawings hide operational logic; trust returns when poetry is anchored in labeled analytical evidence."}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="rounded-xl border border-[#1f2630] border-l-4 border-l-[#1e8e5a] bg-[#0f1318]/70 p-5">
                <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Do
                </h3>
                <ul className="space-y-2">
                  {report.interpretation.doList.map((item, i) => (
                    <li key={i} className="text-sm leading-relaxed flex gap-2">
                      <span className="text-emerald-500/50">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-[#1f2630] border-l-4 border-l-[#c23b3b] bg-[#0f1318]/70 p-5">
                <h3 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Don't
                </h3>
                <ul className="space-y-2">
                  {report.interpretation.dontList.map((item, i) => (
                    <li key={i} className="text-sm leading-relaxed flex gap-2">
                      <span className="text-red-500/50">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </Section>

        {/* Action Plan */}
        <Section id="plan" title="Action Plan" hint="A step-by-step sequence tied to axis tensions and concept evidence anchors.">
          <ol className="space-y-6">
            {report.interpretation.actionSteps.map((step, i) => (
              <li key={i} className="flex gap-4 group">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#151c25] border border-[#1f2630] flex items-center justify-center text-xs font-bold text-blue-400 group-hover:border-blue-500/50 transition-colors">
                  {i + 1}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{step.text}</p>
                  <p className="text-[11px] text-[#7e8b9c] flex items-center gap-2">
                    <span className="font-bold uppercase tracking-tight text-[9px] bg-[#151c25] px-1.5 py-0.5 rounded border border-[#1f2630]">Tie</span>
                    {step.tie}
                    <span className="mx-1">•</span>
                    <span className="font-bold uppercase tracking-tight text-[9px] bg-[#151c25] px-1.5 py-0.5 rounded border border-[#1f2630]">Anchors</span>
                    {step.anchors.join(", ")}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* Appendix */}
        {showAppendix && (
          <Section id="appendix" title="Appendix: Data Trace" hint="Verbatim-ish reference from the exported report.">
            <div className="space-y-4">
              <div className="overflow-hidden rounded-xl border border-[#1f2630] bg-[#0c1016]/45">
                <table className="w-full text-left border-collapse">
                  <tbody className="divide-y divide-[#1f2630]/75">
                    <ParamRow label="Build ID" value={report.meta.buildId} />
                    <ParamRow label="Export Timestamp" value={report.meta.exportTimestamp} />
                    <ParamRow label="Final K" value={report.meta.conceptsFinalK} />
                    <ParamRow label="Clustering Mode" value={analysis?.clusteringMode} />
                    <ParamRow label="Dimension Mode" value={analysis?.dimensionMode} />
                    <ParamRow label="Variance Achieved" value={analysis?.maxVarianceAchieved ? `${Math.round(analysis.maxVarianceAchieved * 100)}%` : null} />
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-[#7e8b9c] italic">
                Note: Narrative sections intentionally avoid technical jargon. This appendix preserves the export details for auditability.
              </p>
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}

// Sub-components

function Section({ id, title, hint, children }: { id: string, title: string, hint: string, children: React.ReactNode }) {
  return (
    <section id={id} className="rounded-2xl border border-[#1f2630] bg-[#11151b]/72 shadow-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#1f2630]/85 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <p className="text-[11px] text-[#7e8b9c] mt-0.5">{hint}</p>
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </section>
  );
}

function MetaChip({ label, value }: { label: string, value: any }) {
  return (
    <span className="inline-flex items-center gap-2 bg-[#151c25]/62 border border-[#1f2630] px-3 py-1.5 rounded-full text-xs text-[#a9b6c7]">
      <span>{label}</span>
      <b className="text-[#e8eef6] font-semibold">{value ?? "N/A"}</b>
    </span>
  );
}

function StancePill({ label, data, color }: { label: string, data: { count: any, pct: any }, color: string }) {
  const dotColor = {
    emerald: "bg-[#1e8e5a]",
    red: "bg-[#c23b3b]",
    orange: "bg-[#d07a12]",
    slate: "bg-[#65748a]"
  }[color];

  return (
    <span className="inline-flex items-center gap-2 bg-[#151c25]/55 border border-[#1f2630] px-3 py-1.5 rounded-full text-xs text-[#a9b6c7]">
      <span className={cn("w-2 h-2 rounded-full", dotColor)} />
      {label}: <b className="text-[#e8eef6] font-bold">{data.count}</b>
      <span className="text-[#7e8b9c]">({data.pct}%)</span>
    </span>
  );
}

function Callout({ variant, title, content }: { variant: 'risk' | 'advantage', title: string, content: string }) {
  const styles = {
    risk: "border-l-[#c23b3b] text-red-400",
    advantage: "border-l-[#1e8e5a] text-emerald-400"
  }[variant];

  return (
    <div className={cn("rounded-xl border border-[#1f2630] border-l-4 bg-[#0f1318]/78 p-4", styles.split(' ')[0])}>
      <h3 className="text-[11px] font-bold uppercase tracking-wider mb-1.5">{title}</h3>
      <p className="text-sm text-[#e8eef6] leading-relaxed">{content}</p>
    </div>
  );
}

function AxisCard({ axis, concepts }: { axis: AxisInterpretation, concepts: ConceptInterpretation[] }) {
  const lowC = concepts.find(c => c.id === axis.extremes?.lowConceptId);
  const highC = concepts.find(c => c.id === axis.extremes?.highConceptId);

  return (
    <div className="rounded-xl border border-[#1f2630] bg-[#0f1318]/70 p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold tracking-tight">{axis.title}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-[#151c25] border-[#1f2630] text-[#a9b6c7] font-medium text-[10px] py-0 px-2 h-5">
              <Zap className="h-2.5 w-2.5 mr-1 text-blue-400" />
              Variance: <span className="text-[#e8eef6] ml-1">{axis.varianceLabel}</span>
            </Badge>
            <Badge variant="outline" className="bg-[#151c25] border-[#1f2630] text-[#a9b6c7] font-medium text-[10px] py-0 px-2 h-5">
              Low: <span className="text-[#e8eef6] ml-1">{axis.poles.low}</span>
            </Badge>
            <Badge variant="outline" className="bg-[#151c25] border-[#1f2630] text-[#a9b6c7] font-medium text-[10px] py-0 px-2 h-5">
              High: <span className="text-[#e8eef6] ml-1">{axis.poles.high}</span>
            </Badge>
          </div>
        </div>
        <div className="w-[200px] h-2 bg-slate-800 rounded-full overflow-hidden border border-[#1f2630]">
          <div className="h-full bg-gradient-to-r from-blue-500/80 to-emerald-500/80" style={{ width: `${axis.variancePct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl bg-[#11151b]/55 border border-[#1f2630]/85 p-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#a9b6c7] mb-2">What Jurors Reward</h4>
          <ul className="space-y-1.5">
            {axis.reward.map((item, i) => (
              <li key={i} className="text-xs leading-relaxed flex gap-2">
                <span className="text-blue-400/50">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-[#11151b]/55 border border-[#1f2630]/85 p-4">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#a9b6c7] mb-2">What Jurors Punish</h4>
          <ul className="space-y-1.5">
            {axis.punish.map((item, i) => (
              <li key={i} className="text-xs leading-relaxed flex gap-2">
                <span className="text-orange-400/50">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-blue-500/38 bg-[#151c25]/55 p-3 text-sm italic text-center">
        “{axis.quote}”
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ExtremeCard pole="Low" concept={lowC} />
        <ExtremeCard pole="High" concept={highC} />
      </div>
    </div>
  );
}

function ExtremeCard({ pole, concept }: { pole: string, concept?: ConceptInterpretation }) {
  return (
    <div className="rounded-xl border border-[#1f2630]/90 bg-[#0c1016]/55 p-3">
      <div className="text-[10px] text-[#7e8b9c] mb-1">Extreme ({pole})</div>
      <div className="text-xs font-bold mb-1.5">{concept?.title || "Not provided in report."}</div>
      <p className="text-[11px] text-[#a9b6c7] leading-relaxed line-clamp-3 italic">
        {concept?.evidence ? `“${concept.evidence}”` : ""}
      </p>
    </div>
  );
}

function ConceptRow({ concept, maxShare }: { concept: ConceptInterpretation, maxShare: number }) {
  const stanceColors: Record<string, string> = {
    "Praise": "bg-[#1e8e5a]",
    "Critique": "bg-[#c23b3b]",
    "Suggestion": "bg-[#d07a12]",
    "Neutral": "bg-[#65748a]"
  };
  const color = concept.stanceHint ? (stanceColors[concept.stanceHint] || "bg-[#65748a]") : "bg-[#65748a]";

  return (
    <tr className="hover:bg-[#11151b]/40 transition-colors">
      <td className="px-4 py-4">
        <div className="text-xs font-bold leading-tight mb-1">{concept.title}</div>
        <div className="text-[10px] text-[#7e8b9c]">{concept.designTakeaway}</div>
      </td>
      <td className="px-4 py-4">
        <div className="text-xs font-bold">{concept.shareLabel}</div>
        <div className="w-32 h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-orange-500/80 to-blue-500/80" style={{ width: `${(concept.sharePct / maxShare) * 100}%` }} />
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="text-xs font-bold">{concept.count}</div>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-1.5 bg-[#151c25]/55 border border-[#1f2630] px-2 py-0.5 rounded-full text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#65748a]/75" />
            {concept.ownersCount} jurors
          </span>
          {concept.ownersKnown && concept.ownersKnown.length > 0 && (
            <div className="text-[9px] text-[#7e8b9c] truncate max-w-[140px]" title={concept.ownersKnown.join(", ")}>
              {concept.ownersKnown.join(", ")}
            </div>
          )}
        </div>
      </td>
      <td className="px-4 py-4">
        <div className="text-[11px] text-[#a9b6c7] leading-relaxed line-clamp-3 italic">
          “{concept.evidence}”
        </div>
      </td>
    </tr>
  );
}

function ConceptCard({ concept }: { concept: ConceptInterpretation }) {
  return (
    <div className="rounded-xl border border-[#1f2630]/90 bg-[#0f1318]/70 p-4 flex flex-col space-y-3">
      <div className="flex justify-between items-start gap-2">
        <h3 className="text-xs font-bold leading-tight">{concept.title}</h3>
        <Badge variant="outline" className="bg-[#151c25]/55 border-[#1f2630] text-[#a9b6c7] text-[9px] whitespace-nowrap h-5">
          {concept.shareLabel} • {concept.count}
        </Badge>
      </div>
      <p className="text-[11px] text-[#a9b6c7] leading-relaxed italic border-l-2 border-slate-700 pl-2">
        {concept.designTakeaway}
      </p>
      <div className="text-[10px] text-[#7e8b9c] leading-relaxed bg-[#0c1016]/40 p-2 rounded-lg">
        <span className="font-bold uppercase text-[8px] tracking-tighter block mb-1">Top Evidence</span>
        “{concept.evidence}”
      </div>
      {concept.terms && concept.terms.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {concept.terms.slice(0, 6).map((term, i) => (
            <span key={i} className="text-[9px] bg-[#151c25] border border-[#1f2630] px-1.5 py-0.5 rounded text-[#a9b6c7]">
              {term}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function JurorCard({ juror, concepts }: { juror: JurorInterpretation, concepts: ConceptInterpretation[] }) {
  const topConcepts = juror.topConceptIds.map(id => concepts.find(c => c.id === id)).filter(Boolean) as ConceptInterpretation[];

  return (
    <div className="rounded-2xl border border-[#1f2630] bg-[#11151b]/40 p-4 flex flex-col hover:bg-[#11151b]/60 transition-all duration-300 shadow-lg group">
      {/* Header: Name and Meta in one row */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-emerald-500/20 flex items-center justify-center border border-blue-500/20 group-hover:scale-110 transition-transform duration-300">
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight group-hover:text-blue-400 transition-colors">{juror.name}</h3>
            <div className="flex items-center gap-2.5 mt-0.5">
              <div className="flex items-center gap-1">
                <Users className="h-2.5 w-2.5 text-blue-400/70" />
                <span className="text-[9px] font-bold text-[#7e8b9c] uppercase tracking-wider">{juror.sentences} SENTENCES</span>
              </div>
              <div className="w-px h-2 bg-[#1f2630]" />
              <div className="flex items-center gap-1">
                <Lightbulb className="h-2.5 w-2.5 text-orange-400/70" />
                <span className="text-[9px] font-bold text-[#7e8b9c] uppercase tracking-wider">{topConcepts.length} ALIGNED</span>
              </div>
            </div>
          </div>
        </div>
        <Badge variant="outline" className="bg-[#151c25]/55 border-[#1f2630] text-[#a9b6c7] text-[10px] h-5 px-1.5 rounded-md font-mono">
          {juror.id.replace('J', '')}
        </Badge>
      </div>

      {/* Top Alignments - More compact badges */}
      <div className="mb-4 flex items-center gap-3">
        <h4 className="text-[9px] font-bold uppercase tracking-widest text-[#5a6575] flex-shrink-0">Alignments</h4>
        <div className="flex flex-wrap gap-1">
          {topConcepts.map(c => (
            <span key={c.id} className="text-[9px] bg-[#151c25]/80 border border-[#1f2630] px-2 py-0.5 rounded-md text-[#e8eef6] hover:border-blue-500/40 transition-colors cursor-default" title={c.designTakeaway}>
              {c.title}
            </span>
          ))}
          {topConcepts.length === 0 && <span className="text-[9px] text-[#4a5568] italic">No specific alignments detected</span>}
        </div>
      </div>

      {/* Three Column Layout for detailed sections to save vertical space */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div>
          <h4 className="text-[9px] font-bold uppercase tracking-widest text-[#7e8b9c] mb-2 flex items-center gap-1.5">
            <div className="w-1 h-2.5 bg-blue-500/60 rounded-full" />
            Values
          </h4>
          <ul className="space-y-1.5">
            {juror.values.map((v, i) => (
              <li key={i} className="text-[11px] leading-snug flex gap-2 text-[#e8eef6]/80">
                <span className="text-blue-400/40 flex-shrink-0">•</span>
                {v}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-[9px] font-bold uppercase tracking-widest text-red-400/60 mb-2 flex items-center gap-1.5">
            <div className="w-1 h-2.5 bg-red-500/60 rounded-full" />
            Red Lines
          </h4>
          <ul className="space-y-1.5">
            {juror.redLines.map((r, i) => (
              <li key={i} className="text-[11px] leading-snug flex gap-2 text-[#e8eef6]/80">
                <span className="text-red-400/40 flex-shrink-0">•</span>
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-[#0c1016]/30 rounded-xl p-3 border border-[#1f2630]/40">
          <h4 className="text-[9px] font-bold uppercase tracking-widest text-emerald-400/60 mb-2 flex items-center gap-1.5">
            <Sparkles className="h-2.5 w-2.5" />
            Checklist
          </h4>
          <ul className="space-y-1">
            {juror.designFor.map((d, i) => (
              <li key={i} className="text-[11px] leading-tight flex gap-2 italic text-[#e8eef6]/70 p-1.5 rounded-lg border border-transparent hover:border-[#1f2630]/50 hover:bg-[#151c25]/30 transition-all">
                <CheckCircle2 className="h-3 w-3 text-emerald-500/50 flex-shrink-0 mt-0.5" />
                {d}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StrategyGroup({ title, bullets }: { title: string, bullets: string[] }) {
  return (
    <div className="rounded-xl border border-[#1f2630] bg-[#0f1318]/70 p-5">
      <h3 className="text-sm font-bold mb-3">{title}</h3>
      <ul className="space-y-2">
        {bullets.map((bullet, i) => (
          <li key={i} className="text-sm leading-relaxed flex gap-2">
            <span className="text-blue-400/50 flex-shrink-0 mt-1">•</span>
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DrawingLayer({ index, title, description }: { index: number, title: string, description: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-[10px] font-black w-5 h-5 rounded bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/20">
          {index}
        </div>
        <h4 className="text-sm font-bold">{title}</h4>
      </div>
      <p className="text-xs text-[#a9b6c7] leading-relaxed pl-7">
        {description}
      </p>
    </div>
  );
}

function ParamRow({ label, value }: { label: string, value: any }) {
  return (
    <tr>
      <td className="px-4 py-3 text-xs text-[#a9b6c7] border-r border-[#1f2630]/50 w-1/2">{label}</td>
      <td className="px-4 py-3 text-xs font-bold">{value ?? "Not provided"}</td>
    </tr>
  );
}
