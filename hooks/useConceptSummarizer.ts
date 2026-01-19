import { useState, useEffect, useCallback } from "react";
import type { AnalysisResult } from "@/types/analysis";
import type { ConceptSynthesisRequest, ConceptSynthesisResponse } from "@/types/api";
import { generateShortLabel } from "@/lib/nlp/summarizer";
import type { LogEntry } from "@/components/inspector/InspectorConsole";

import { DEFAULT_MODEL } from "@/constants/nlp-constants";

export interface ConceptInsight {
  shortLabel?: string;
  summary?: string;
  isLoadingLabel: boolean;
  isLoadingSummary: boolean;
}

export function useConceptSummarizer(
  analysis: AnalysisResult | null,
  selectedModel: string = DEFAULT_MODEL,
  autoSynthesize: boolean = false,
  onAddLog?: (type: LogEntry["type"], msg: string, data?: any) => void
) {
  const [insights, setInsights] = useState<Record<string, ConceptInsight>>({});

  // Reset insights when analysis changes
  useEffect(() => {
    if (!analysis) {
      setInsights({});
      return;
    }

    const initialInsights: Record<string, ConceptInsight> = {};
    analysis.concepts.forEach((c) => {
      initialInsights[c.id] = {
        isLoadingLabel: true,
        isLoadingSummary: false,
      };
    });
    setInsights(initialInsights);

    // Trigger label generation for all concepts in background
    analysis.concepts.forEach(async (concept) => {
      try {
        const shortLabel = await generateShortLabel(
          concept.topTerms,
          concept.representativeSentences || [],
          concept.label
        );
        setInsights((prev) => ({
          ...prev,
          [concept.id]: {
            ...prev[concept.id],
            shortLabel,
            isLoadingLabel: false,
          },
        }));
      } catch (error) {
        console.error(`Error generating label for ${concept.id}:`, error);
        setInsights((prev) => ({
          ...prev,
          [concept.id]: {
            ...prev[concept.id],
            isLoadingLabel: false,
          },
        }));
      }
    });
  }, [analysis]);

  const fetchSummary = useCallback(async (conceptId: string, onAddLog?: (type: LogEntry["type"], msg: string, data?: any) => void) => {
    if (!analysis || !insights[conceptId] || insights[conceptId].summary || insights[conceptId].isLoadingSummary) {
      return;
    }

    const concept = analysis.concepts.find((c) => c.id === conceptId);
    if (!concept) return;

    // Calculate stance mix for this concept
    const conceptSentences = analysis.sentences.filter(s => {
      if (s.conceptMembership) {
        return s.conceptMembership.some(m => m.conceptId === conceptId);
      }
      return s.conceptId === conceptId;
    });

    const counts = { praise: 0, critique: 0, suggestion: 0, neutral: 0 };
    conceptSentences.forEach(s => counts[s.stance]++);
    const total = conceptSentences.length || 1;
    const stance_mix = {
      praise: counts.praise / total,
      critique: counts.critique / total,
      suggestion: counts.suggestion / total,
      neutral: counts.neutral / total,
    };
    
    const totalSentences = analysis.sentences.length || 1;
    const relatedAxesScores = analysis.anchorAxisScores?.concepts?.[conceptId];
    const relatedAxesString = relatedAxesScores 
      ? Object.entries(relatedAxesScores)
          .map(([axis, score]) => `${axis}: ${score.toFixed(2)}`)
          .join(", ")
      : undefined;

    const requestBody: ConceptSynthesisRequest = {
      id: conceptId,
      label_seed: insights[conceptId].shortLabel || concept.label,
      top_ngrams: concept.topTerms,
      evidence_sentences: concept.representativeSentences || [],
      stance_mix,
      concept_share_pct: conceptSentences.length / totalSentences,
      centroid_semantic_terms: concept.topTerms,
      juror_contribution: Object.entries(counts)
        .filter(([, count]) => count > 0)
        .map(([stance, count]) => `${stance}: ${count}`)
        .join(", "),
      related_axes_scores: relatedAxesString,
      model: selectedModel
    };

    setInsights((prev) => ({
      ...prev,
      [conceptId]: {
        ...prev[conceptId],
        isLoadingSummary: true,
      },
    }));

    console.log(`[Synthesis] Requesting synthesis for concept ${conceptId} using model: ${selectedModel}`, requestBody);
    if (onAddLog) onAddLog("api_request", `Synthesizing concept: ${requestBody.label_seed} using ${selectedModel}`);

    try {
      const response = await fetch("/api/analyze/concept-synthesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error("Concept synthesis API failed");

      const data: ConceptSynthesisResponse = await response.json();
      console.log(`[Synthesis] Received response for ${conceptId}:`, data);
      if (onAddLog) onAddLog("api_response", `Synthesis complete: ${data.concept_title}`, { ...data, model: selectedModel });
      
      const trimmedTitle = data.concept_title?.trim();
      const fallbackTitle = insights[conceptId]?.shortLabel || concept.label;
      const resolvedTitle = trimmedTitle && trimmedTitle.toLowerCase() !== "concept" ? trimmedTitle : fallbackTitle;

      setInsights((prev) => ({
        ...prev,
        [conceptId]: {
          ...prev[conceptId],
          shortLabel: resolvedTitle,
          summary: data.concept_one_liner,
          isLoadingSummary: false,
        },
      }));
    } catch (error) {
      console.error(`[Synthesis] Error synthesizing concept ${conceptId}:`, error);
      if (onAddLog) onAddLog("api_error", `Synthesis failed for ${requestBody.label_seed}`);
      // Fallback: Generate a simple summary locally if API fails
      setInsights((prev) => ({
        ...prev,
        [conceptId]: {
          ...prev[conceptId],
          summary: `Thematic focus on ${requestBody.label_seed.toLowerCase()}.`,
          isLoadingSummary: false,
        },
      }));
    }
  }, [analysis, insights, selectedModel]);

  useEffect(() => {
    if (!autoSynthesize || !analysis) return;

    analysis.concepts.forEach((concept) => {
      if (!insights[concept.id]?.summary && !insights[concept.id]?.isLoadingSummary) {
        fetchSummary(concept.id, onAddLog);
      }
    });
  }, [analysis, autoSynthesize, fetchSummary, insights, onAddLog]);

  return { insights, fetchSummary };
}
