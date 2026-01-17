import { NextRequest, NextResponse } from "next/server";
import type { ConceptSynthesisRequest, ConceptSynthesisResponse } from "@/types/api";
import type { AnalysisResult } from "@/types/analysis";

import { DEFAULT_MODEL } from "@/constants/nlp-constants";
import { loadPrompts, processPrompt } from "@/lib/prompts/prompt-processor";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

type ConceptSynthesisPayload = ConceptSynthesisRequest & {
  analysis?: AnalysisResult;
  centroid_semantic_terms?: string[];
  related_axes_scores?: Record<string, number>;
  juror_contribution?: Record<string, number> | string;
  constraints?: string[];
};

const formatStanceMix = (stanceMix: ConceptSynthesisRequest["stance_mix"]) => {
  const toPercent = (value?: number) => `${Math.round((value ?? 0) * 100)}%`;
  return `Praise: ${toPercent(stanceMix.praise)}, Critique: ${toPercent(stanceMix.critique)}, Suggestion: ${toPercent(stanceMix.suggestion)}, Neutral: ${toPercent(stanceMix.neutral)}`;
};

const defaultConstraints = [
  "Title length 6-12 words",
  "One-liner length 18-30 words",
  "Avoid boilerplate or meta phrases",
  "No repeated words in the title"
];

export async function POST(request: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
  }

  try {
    const body = (await request.json()) as ConceptSynthesisPayload;
    const { id, label_seed, top_ngrams, evidence_sentences, stance_mix, model = DEFAULT_MODEL } = body;
    const analysis = body.analysis;
    const totalSentences = analysis?.stats?.totalSentences;
    const conceptSize = evidence_sentences.length;
    const conceptShare = totalSentences ? conceptSize / totalSentences : undefined;
    const centroidSemanticTerms = body.centroid_semantic_terms ?? top_ngrams;
    const representativeSentences = evidence_sentences.slice(0, 8);
    const constraints = body.constraints?.length ? body.constraints : defaultConstraints;
    const stanceMixLabel = formatStanceMix(stance_mix);
    const jurorContribution = body.juror_contribution ?? "N/A";
    const relatedAxesScores = body.related_axes_scores ?? "None";

    const prompts = await loadPrompts();
    const conceptPrompts = prompts.concept;
    const variables = {
      CONCEPT_ID: id ?? "N/A",
      CONCEPT_SEED: label_seed,
      CONCEPT_SIZE_SENTENCES: conceptSize,
      CONCEPT_SHARE_PCT: { value: conceptShare, format: "percentage", fallback: "N/A" },
      CENTROID_SEMANTIC_TERMS: { value: centroidSemanticTerms, format: "list", fallback: "None" },
      TOP_NGRAMS: { value: top_ngrams, format: "list", fallback: "None" },
      REPRESENTATIVE_SENTENCES: { value: representativeSentences, format: "lines", fallback: "None" },
      JUROR_CONTRIBUTION: {
        value: jurorContribution,
        format: Array.isArray(jurorContribution)
          ? "list"
          : typeof jurorContribution === "object"
            ? "json"
            : "string",
        fallback: "N/A"
      },
      STANCE_MIX: stanceMixLabel,
      RELATED_AXES_SCORES: {
        value: relatedAxesScores,
        format: Array.isArray(relatedAxesScores)
          ? "list"
          : typeof relatedAxesScores === "object"
            ? "json"
            : "string",
        fallback: "None"
      },
      CONSTRAINTS: { value: constraints, format: "lines", fallback: "None" }
    };

    const systemPrompt = processPrompt(conceptPrompts.system, variables);
    const userPrompt = processPrompt(conceptPrompts.user, variables);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model.toLowerCase().replace(/\s+/g, "-"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    const usage = data.usage;

    // --- QUALITY GATES ---
    let finalTitle = result.concept_title;
    let finalOneLiner = result.concept_one_liner;
    let isFallback = false;

    // 1. Echo Check (Basic n-gram overlap)
    const isEchoing = evidence_sentences.some(sentence => {
      const sentenceLower = sentence.toLowerCase();
      return finalOneLiner.toLowerCase().includes(sentenceLower) || 
             sentenceLower.includes(finalOneLiner.toLowerCase());
    });

    // 2. Repetition Check in Title
    const titleWords = finalTitle.toLowerCase().split(/\s+/);
    const hasRepetition = new Set(titleWords).size !== titleWords.length;

    // 3. Boilerplate Check
    const hasBoilerplate = /keywords|based on|juror feedback/i.test(finalOneLiner.slice(0, 30));

    if (isEchoing || hasRepetition || hasBoilerplate) {
      console.warn("Synthesis failed quality gates, using fallback", { isEchoing, hasRepetition, hasBoilerplate });
      isFallback = true;
      finalTitle = label_seed;
      finalOneLiner = `Focus on ${label_seed.toLowerCase()} as reflected in juror feedback regarding ${top_ngrams.slice(0, 3).join(" and ")}.`;
    }

    const synthesis: ConceptSynthesisResponse = {
      concept_title: finalTitle,
      concept_one_liner: finalOneLiner,
      is_fallback: isFallback,
      usage
    };

    return NextResponse.json(synthesis);

  } catch (error) {
    console.error("Concept Synthesis API Error:", error);
    return NextResponse.json({ error: "Internal server error during synthesis" }, { status: 500 });
  }
}
