import type { AnalysisResult } from "@/types/analysis";
import type { RawDataExportContext } from "@/components/inspector/export-types";

export interface InterpretationPromptContext {
  contextText: string;
}

interface ContextOptions {
  axisDescriptions?: string[];
  jurorHighlights?: string[];
}

export function buildInterpretationPromptContext(
  analysis: any,
  rawExportContext?: any,
  options: ContextOptions = {}
): InterpretationPromptContext {
  const stats = analysis.stats;
  const statsLine = `Stats: ${stats?.totalSentences ?? "Not provided"} sentences, ${stats?.totalJurors ?? "Not provided"} jurors, ${stats?.totalConcepts ?? "Not provided"} concepts.`;

  const topConcepts = ((analysis.concepts as any[]) ?? [])
    .map((c: any) => {
      const terms = c.topTerms?.slice(0, 8).join(", ") || "None";
      const evidence = c.representativeSentences?.[0] || "None";
      return `${c.id}: ${c.label ?? c.title ?? "concept"} (Count: ${c.count ?? c.size ?? "?"}, Terms: [${terms}], Evidence: "${evidence}")`;
    })
    .join("\n");
  const conceptLine = topConcepts ? `Primary concepts details:\n${topConcepts}` : "Primary concepts: Not provided in the report.";

  const jurorLine = options.jurorHighlights
    ? `Juror focus: ${options.jurorHighlights.join(" | ")}.`
    : `Jurors: ${(analysis.jurors ?? []).join(", ") || "Not provided in the report."}.`;

  const axisLine = options.axisDescriptions?.length
    ? `Axis descriptions: ${options.axisDescriptions.join(" ; ")}.`
    : analysis.axisLabels 
      ? `Axis descriptions: ${Object.entries(analysis.axisLabels).map(([id, axis]) => `${id}: ${axis.name || axis.synthesizedName || (axis.negative + " vs " + axis.positive)}`).join(" ; ")}.`
      : "Axis descriptions: Not provided in the report.";

  const paramLine = buildParameterLine(rawExportContext);

  const contextText = [statsLine, conceptLine, jurorLine, axisLine, paramLine].join("\n");

  // NOTE: We do not slice concepts or jurors here to ensure the interpretation dashboard
  // remains faithful to the ground truth of the analysis result.
  // Large datasets may result in high token usage.

  return { contextText };
}

function buildParameterLine(rawExportContext?: RawDataExportContext): string {
  if (!rawExportContext?.analysisParams) {
    return "Parameters: Not provided in the report.";
  }
  const params = rawExportContext.analysisParams;
  const lines: string[] = [];
  lines.push(`Parameters (kConcepts=${params.kConcepts}, similarityThreshold=${params.similarityThreshold}, minEdgeWeight=${params.minEdgeWeight}).`);
  lines.push(`Sampling: autoK=${Boolean(params.autoK)}, autoSeed=${Boolean(params.autoSeed)}, autoWeights=${Boolean(params.autoWeights)}.`);
  lines.push(`Dimensions: meaningful=${params.appliedNumDimensions}, mode=${params.dimensionMode}.`);
  if (rawExportContext.exportTimestamp) {
    lines.push(`Export timestamp: ${rawExportContext.exportTimestamp}.`);
  }
  return `Parameters: ${lines.join(" ")}`;
}
