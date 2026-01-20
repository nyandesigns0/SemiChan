import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_MODEL } from "@/constants/nlp-constants";
import { normalizeModelId } from "@/lib/utils/api-utils";
import { buildInterpretationPrompt } from "@/lib/interpretation/prompts";
import { buildInterpretationPromptContext } from "@/lib/interpretation/context";
import { jobStore } from "@/lib/interpretation/job-store";
import type { RawDataExportContext } from "@/components/inspector/export-types";
import type { AnalysisResult } from "@/types/analysis";
import type { InterpretationReport } from "@/types/interpretation";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

type InterpretationRequestBody = {
  analysis: any; // Using any to allow pruned objects from the client
  rawExportContext?: any;
  axisDescriptions?: string[];
  jurorHighlights?: string[];
  model?: string;
};

type InterpretationJobState = {
  stage: string;
  progress: number;
  message: string;
  result?: InterpretationReport;
  error?: string;
};

const SEGMENTS: Array<"meta" | "axes" | "concepts" | "jurors" | "strategy"> = [
  "meta",
  "axes",
  "concepts",
  "jurors",
  "strategy"
];

const updateJob = (jobId: string, partial: Partial<InterpretationJobState>) => {
  const existing = jobStore.get(jobId) ?? { stage: "queued", progress: 0, message: "Queued" };
  jobStore.set(jobId, { ...existing, ...partial });
};

async function callOpenAI(prompt: string, model: string) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [{ role: "system", content: prompt }]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(`OpenAI error: ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenAI response missing content");
  return JSON.parse(text);
}

function buildMetaFromAnalysis(
  analysis: any,
  rawExportContext?: any
): InterpretationReport["meta"] {
  const stats = analysis.stats ?? { totalSentences: 0, totalJurors: 0, totalConcepts: 0, stanceCounts: {} };
  const totalStance = Object.values(stats.stanceCounts || {}).reduce((sum, value) => sum + value, 0);
  const buildStance = (kind: string) => {
    const count = stats.stanceCounts?.[kind as keyof typeof stats.stanceCounts] ?? 0;
    return {
      count,
      pct: totalStance ? Math.round((count / totalStance) * 100) : null
    };
  };

  return {
    title: "SemiChan Interpretation Dashboard",
    subtitle: "Home of Shadow — Jury Values & Design Plan",
    sentences: stats.totalSentences,
    jurors: stats.totalJurors,
    conceptsFinalK: analysis.finalKUsed ?? rawExportContext?.analysisParams?.kConcepts ?? null,
    exportTimestamp: rawExportContext?.exportTimestamp ?? null,
    buildId: analysis.analysisBuildId ?? null,
    healthScorePct:
      typeof analysis.reportHealth?.overallScore === "number"
        ? Math.round(analysis.reportHealth.overallScore * 100)
        : null,
    stance: {
      praise: buildStance("praise"),
      critique: buildStance("critique"),
      suggestion: buildStance("suggestion"),
      neutral: buildStance("neutral")
    }
  };
}

function assembleReport(
  analysis: any,
  rawExportContext: any | undefined,
  stageOutputs: Record<string, any>
): InterpretationReport {
  const meta = buildMetaFromAnalysis(analysis, rawExportContext);
  const axes = stageOutputs.axes?.axes ?? [];
  const concepts = stageOutputs.concepts?.concepts ?? [];
  const jurors = stageOutputs.jurors?.jurors ?? [];
  const strategy = stageOutputs.strategy ?? {};
  const metaStage = stageOutputs.meta ?? {};
  return {
    meta,
    axes,
    concepts,
    jurors,
    interpretation: {
      takeaways: metaStage.takeaways ?? [],
      primaryRisk: metaStage.primaryRisk ?? "Not provided in the report.",
      primaryAdvantage: metaStage.primaryAdvantage ?? "Not provided in the report.",
      doList: metaStage.doList ?? [],
      dontList: metaStage.dontList ?? [],
      actionSteps: strategy.actionSteps ?? [],
      architecture: strategy.architecture,
      representation: strategy.representation
    },
    params: {
      axisDescriptions: stageOutputs.context?.axisDescriptions,
      jurorHighlights: stageOutputs.context?.jurorHighlights
    }
  };
}

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  try {
    const payload = (await request.json()) as InterpretationRequestBody;
    if (!payload.analysis) {
      return NextResponse.json({ error: "analysis is required" }, { status: 400 });
    }

    const jobId = crypto.randomUUID();
    updateJob(jobId, { stage: "initiating", progress: 0, message: "Preparing prompts" });

    const context = buildInterpretationPromptContext(
      payload.analysis,
      payload.rawExportContext,
      {
        axisDescriptions: payload.axisDescriptions,
        jurorHighlights: payload.jurorHighlights
      }
    );

    const model = normalizeModelId(payload.model ?? DEFAULT_MODEL);
    const stageOutputs: Record<string, any> = {};

    for (const [index, segment] of SEGMENTS.entries()) {
      const progress = Math.round(((index + 1) / SEGMENTS.length) * 100);
      updateJob(jobId, {
        stage: segment,
        progress,
        message: `Generating the ${segment} section`
      });

      const prompt = buildInterpretationPrompt(segment, context);
      const output = await callOpenAI(prompt, model);
      stageOutputs[segment] = output;
    }

    const interpretation = assembleReport(payload.analysis, payload.rawExportContext, stageOutputs);
    updateJob(jobId, { stage: "complete", progress: 100, message: "Interpretation ready", result: interpretation });

    return NextResponse.json({ jobId, interpretation });
  } catch (error) {
    console.error("[Interpretation API] Unexpected error", error);
    return NextResponse.json({ error: "Failed to generate interpretation" }, { status: 500 });
  }
}
