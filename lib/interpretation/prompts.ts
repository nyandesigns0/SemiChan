import type { InterpretationPromptContext } from "./context";

export type InterpretationSegment = "meta" | "axes" | "concepts" | "jurors" | "strategy";

const BANNED_TERMS = ["embeddings", "PCA", "BM25", "LLM", "model", "algorithm", "clustering"];

const ARCHITECTURAL_FRAME = `
You are an architectural jury analyst advising a competition team. Speak only in architectural terms such as clarity, legibility, sectional logic, spatial sequencing, temporal light, aperture depth, roof logic, constructability, and experiential hierarchy.
Do not mention any system internals, algorithms, or AI jargon (${BANNED_TERMS.join(", ")}).
Make every statement traceable to the provided data.
Return only valid JSON and nothing else; do not include backticks, prose outside the JSON object, or explanatory text.
Numbers should remain numeric, and missing data should be filled with the phrase "Not provided in the report."
`;

const SECTION_INTENT: Record<InterpretationSegment, string> = {
  meta: `
Provide a narrative summary of the jury mood. Output a JSON object with:
{
  "takeaways": [5-8 bullets],
  "primaryRisk": "one paragraph describing what causes juror distrust",
  "primaryAdvantage": "one paragraph describing what earns trust",
  "corpusHighlight": "one sentence summarizing the dominant theme (optional but helpful)",
  "doList": [6 architectural actions],
  "dontList": [6 architectural warnings]
}
Each bullet must reference the axes, top concepts, or juror patterns described in the context text.
`,
  axes: `
Interpret EVERY axis provided in the context as a jury tension. Do not skip or combine any axes. For each axis include:
{
  "id": "...",
  "title": "...",
  "variancePct": number,
  "varianceLabel": "XY.Y%",
  "poles": { "low": "...", "high": "..." },
  "reward": ["3 concise architectural statements jurors reward"],
  "punish": ["3 concise architectural statements jurors punish"],
  "quote": "One-line juror mindset quote",
  "extremes": { "lowConceptId": "C...", "highConceptId": "C..." }
}
Return an array named \"axes\".
`,
  concepts: `
Produce a concept map table that includes EVERY concept listed in the context. Do not truncate the list. For each concept output:
{
  "id": "C...",
  "title": "...",
  "count": number,
  "sharePct": number,
  "shareLabel": "X.X%",
  "ownersCount": number,
  "ownersKnown": ["Juror Name", ...],
  "stanceHint": "Praise / Critique / Suggestion / Neutral / null",
  "evidence": "Top evidence sentence",
  "terms": ["term1", "term2"],
  "designTakeaway": "One sentence tying the concept to actionable design logic"
}
Also return \"conceptOverlapNote\": \"...\" explaining overlapping top terms or write \"Not provided in the report.\" if the data does not support comparisons.
`,
  jurors: `
For EVERY juror listed in the context, output a profile. Do not skip any names.
{
  "id": "...",
  "name": "...",
  "sentences": number,
  "topConceptIds": ["C..."],
  "values": ["2-4 architectural value statements"],
  "redLines": ["2 design failings juror punishes"],
  "designFor": ["3-5 checklist items"],
  "termHints": ["optional keywords"]
}
Return a list named \"jurors\".
`,
  strategy: `
Provide architectural strategy plus plan. Output:
{
  "architecture": {
    "shadowOrganizer": ["3-4 bullets"],
    "temporalLight": ["3-4 bullets"],
    "sectionDepth": ["3-4 bullets"],
    "restraintExpression": ["3-4 bullets"]
  },
  "representation": {
    "poeticLayer": "...",
    "analyticalLayer": "...",
    "narrativeLayer": "...",
    "confidenceNote": "Sentence explaining what kills confidence and what restores it"
  },
  "actionSteps": [
    { "text": "...", "anchors": ["Concept Title", "..."], "tie": "Axis Title" }
  ]
}
Each element must tie back to axes, concepts, or jurors.
`
};

export function buildInterpretationPrompt(
  segment: InterpretationSegment,
  context: InterpretationPromptContext
): string {
  const contextText = context.contextText.trim() || "Not provided in the report.";
  return `
${ARCHITECTURAL_FRAME}
Context:
${contextText}

Instructions:
${SECTION_INTENT[segment]}
`;
}
