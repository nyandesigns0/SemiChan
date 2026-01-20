import { DEFAULT_MODEL } from "@/constants/nlp-constants";
import { normalizeModelId } from "@/lib/utils/api-utils";
import { loadPrompts, processPrompt } from "@/lib/prompts/prompt-processor";
import { evaluateLabelQuality } from "./label-quality";
import { getFallbackLabel } from "./label-templates";
import type { ConceptSynthesisResponse } from "@/types/api";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export interface SynthesisParams {
  id: string;
  label_seed: string;
  top_ngrams: string[];
  evidence_sentences: string[];
  stance_mix: {
    praise: number;
    critique: number;
    suggestion: number;
    neutral: number;
  };
  model?: string;
  constraints?: string[];
  // New context variables
  concept_share_pct?: number;
  centroid_semantic_terms?: string[];
  juror_contribution?: string;
  related_axes_scores?: string;
}

const defaultConstraints = [
  "2-5 words",
  "Grammatical noun phrase",
  "No filler words ('addressing', 'areas', 'shows', 'move', etc.)",
  "Must be understandable out of context",
  "Avoid boilerplate or meta phrases",
  "No repeated words in the title"
];

/**
 * Synthesizes a concept label using LLM with quality gates and retries.
 */
export async function synthesizeConceptLabel(
  params: SynthesisParams
): Promise<ConceptSynthesisResponse & { quality?: any }> {
  if (!OPENAI_API_KEY) {
    return {
      concept_title: params.label_seed,
      concept_one_liner: `Focus on ${params.label_seed.toLowerCase()}.`,
      is_fallback: true
    };
  }

  const { 
    id, 
    label_seed, 
    top_ngrams, 
    evidence_sentences, 
    stance_mix, 
    model = DEFAULT_MODEL,
    concept_share_pct,
    centroid_semantic_terms,
    juror_contribution,
    related_axes_scores
  } = params;
  const constraints = params.constraints || defaultConstraints;

  const prompts = await loadPrompts();
  const conceptPrompts = prompts.concept;
  
  const toPercent = (value?: number) => `${Math.round((value ?? 0) * 100)}%`;
  const stanceMixLabel = `Praise: ${toPercent(stance_mix.praise)}, Critique: ${toPercent(stance_mix.critique)}, Suggestion: ${toPercent(stance_mix.suggestion)}, Neutral: ${toPercent(stance_mix.neutral)}`;

  const variables = {
    CONCEPT_ID: id,
    CONCEPT_SEED: label_seed,
    CONCEPT_SIZE_SENTENCES: evidence_sentences.length,
    CONCEPT_SHARE_PCT: { value: concept_share_pct, format: "percentage", fallback: "N/A" },
    CENTROID_SEMANTIC_TERMS: { value: centroid_semantic_terms || top_ngrams, format: "list", fallback: "None" },
    TOP_NGRAMS: { value: top_ngrams, format: "list", fallback: "None" },
    REPRESENTATIVE_SENTENCES: { value: evidence_sentences.slice(0, 8), format: "lines", fallback: "None" },
    JUROR_CONTRIBUTION: { value: juror_contribution, fallback: "N/A" },
    STANCE_MIX: stanceMixLabel,
    RELATED_AXES_SCORES: { value: related_axes_scores, fallback: "None" },
    CONSTRAINTS: { value: constraints, format: "lines", fallback: "None" }
  };

  const systemPrompt = processPrompt(conceptPrompts.system, variables);
  const userPrompt = processPrompt(conceptPrompts.user, variables);

  let currentTitle = label_seed;
  let currentOneLiner = "";
  let attempts = 0;
  const maxAttempts = 3;
  let qualityResult = null;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: normalizeModelId(model),
          messages: [
            { role: "system", content: systemPrompt + (attempts > 0 ? "\n\nCRITICAL: Your previous response failed quality checks. Please strictly follow all constraints, especially the word count and noun phrase requirements." : "") },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);
      currentTitle = result.concept_title;
      currentOneLiner = result.concept_one_liner;

      // Quality Gate
      qualityResult = evaluateLabelQuality(currentTitle, { topTerms: top_ngrams, sentences: evidence_sentences });
      
      if (qualityResult.passed) {
        return {
          concept_title: currentTitle,
          concept_one_liner: currentOneLiner,
          is_fallback: false,
          usage: data.usage,
          quality: qualityResult
        };
      } else {
        console.warn(`Label quality check failed (attempt ${attempts + 1}):`, qualityResult.violations);
      }
    } catch (error) {
      console.error(`Synthesis attempt ${attempts + 1} failed:`, error);
    }
    
    attempts++;
  }

  // Final fallback
  const fallbackTitle = getFallbackLabel(id);
  return {
    concept_title: fallbackTitle,
    concept_one_liner: `Focus on ${label_seed.toLowerCase()} as reflected in juror feedback.`,
    is_fallback: true,
    quality: qualityResult || { score: 0, passed: false, violations: ["max-attempts-reached"] }
  };
}
