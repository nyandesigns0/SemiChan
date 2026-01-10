import { useState, useEffect, useCallback } from "react";
import type { AnalysisResult } from "@/types/analysis";

import { DEFAULT_MODEL } from "@/constants/nlp-constants";

export interface EnhancedAxisLabels {
  x: { negative: string; positive: string; synthesizedNegative: string; synthesizedPositive: string };
  y: { negative: string; positive: string; synthesizedNegative: string; synthesizedPositive: string };
  z: { negative: string; positive: string; synthesizedNegative: string; synthesizedPositive: string };
}

/**
 * Hook to enhance axis labels with AI synthesis in the background
 * Returns enhanced labels when ready, or undefined if not yet available
 */
export function useAxisLabelEnhancer(
  analysis: AnalysisResult | null, 
  enabled: boolean = false,
  selectedModel: string = DEFAULT_MODEL,
  onAddLog?: (type: string, msg: string) => void
) {
  const [enhancedLabels, setEnhancedLabels] = useState<EnhancedAxisLabels | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset enhanced labels when analysis changes
  useEffect(() => {
    setEnhancedLabels(null);
  }, [analysis?.axisLabels?.x.negative]); // Use a stable property to detect new analysis

  useEffect(() => {
    if (!enabled || !analysis?.axisLabels || enhancedLabels) {
      setIsLoading(false);
      return;
    }

    // Skip if synthesized labels already exist in the analysis object
    if (
      analysis.axisLabels.x.synthesizedNegative &&
      analysis.axisLabels.x.synthesizedPositive &&
      analysis.axisLabels.y.synthesizedNegative &&
      analysis.axisLabels.y.synthesizedPositive &&
      analysis.axisLabels.z.synthesizedNegative &&
      analysis.axisLabels.z.synthesizedPositive
    ) {
      setEnhancedLabels({
        x: {
          negative: analysis.axisLabels.x.negative,
          positive: analysis.axisLabels.x.positive,
          synthesizedNegative: analysis.axisLabels.x.synthesizedNegative,
          synthesizedPositive: analysis.axisLabels.x.synthesizedPositive,
        },
        y: {
          negative: analysis.axisLabels.y.negative,
          positive: analysis.axisLabels.y.positive,
          synthesizedNegative: analysis.axisLabels.y.synthesizedNegative,
          synthesizedPositive: analysis.axisLabels.y.synthesizedPositive,
        },
        z: {
          negative: analysis.axisLabels.z.negative,
          positive: analysis.axisLabels.z.positive,
          synthesizedNegative: analysis.axisLabels.z.synthesizedNegative,
          synthesizedPositive: analysis.axisLabels.z.synthesizedPositive,
        },
      });
      setIsLoading(false);
      return;
    }

    // Enhance in background
    setIsLoading(true);
    console.log(`[Axis Labels] Enhancing labels using model: ${selectedModel}`);
    if (onAddLog) onAddLog("api_request", `Enhancing axis labels with AI using ${selectedModel}...`);
    const enhanceLabels = async () => {
      try {
        const getConceptContext = (id: string) => {
          const concept = analysis.concepts.find(c => c.id === id);
          if (!concept) return { keywords: [], sentences: [] };
          return {
            keywords: concept.topTerms,
            sentences: concept.representativeSentences || []
          };
        };

        const response = await fetch("/api/analyze/axis-labels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            axisLabels: {
              x: { 
                negative: analysis.axisLabels.x.negative, 
                positive: analysis.axisLabels.x.positive,
                negativeContext: getConceptContext(analysis.axisLabels.x.negativeId),
                positiveContext: getConceptContext(analysis.axisLabels.x.positiveId)
              },
              y: { 
                negative: analysis.axisLabels.y.negative, 
                positive: analysis.axisLabels.y.positive,
                negativeContext: getConceptContext(analysis.axisLabels.y.negativeId),
                positiveContext: getConceptContext(analysis.axisLabels.y.positiveId)
              },
              z: { 
                negative: analysis.axisLabels.z.negative, 
                positive: analysis.axisLabels.z.positive,
                negativeContext: getConceptContext(analysis.axisLabels.z.negativeId),
                positiveContext: getConceptContext(analysis.axisLabels.z.positiveId)
              },
            },
            model: selectedModel,
          }),
        });

        if (!response.ok) throw new Error("Axis labels API failed");

        const data: any = await response.json();
        console.log(`[Axis Labels] Enhancement successful`, data);
        if (onAddLog) onAddLog("api_response", `Axis labels enhanced successfully`, { ...data, model: selectedModel });
        setEnhancedLabels(data.axisLabels);
      } catch (error) {
        console.error("[Axis Labels] Error:", error);
        if (onAddLog) onAddLog("api_error", `Axis label enhancement failed`);
      } finally {
        setIsLoading(false);
      }
    };

    enhanceLabels();
  }, [analysis, enabled, enhancedLabels, selectedModel]);

  return { enhancedLabels, isLoading };
}

