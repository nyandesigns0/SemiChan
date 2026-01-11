import { useState, useEffect, useCallback } from "react";
import type { AnalysisResult } from "@/types/analysis";
import type { LogEntry } from "@/components/inspector/InspectorConsole";

import { DEFAULT_MODEL } from "@/constants/nlp-constants";

export type EnhancedAxisLabels = Record<string, { 
  negative: string; 
  positive: string; 
  synthesizedNegative: string; 
  synthesizedPositive: string 
}>;

/**
 * Hook to enhance axis labels with AI synthesis in the background
 * Returns enhanced labels when ready, or undefined if not yet available
 */
export function useAxisLabelEnhancer(
  analysis: AnalysisResult | null, 
  enabled: boolean = false,
  selectedModel: string = DEFAULT_MODEL,
  onAddLog?: (type: LogEntry["type"], msg: string, data?: any) => void
) {
  const [enhancedLabels, setEnhancedLabels] = useState<EnhancedAxisLabels | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshAxisLabels = useCallback(() => {
    setEnhancedLabels(null);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Reset enhanced labels when analysis changes
  useEffect(() => {
    setEnhancedLabels(null);
  }, [analysis?.axisLabels?.["0"]?.negative]); // Use a stable property to detect new analysis

  useEffect(() => {
    if (!enabled || !analysis || !analysis.axisLabels || enhancedLabels) {
      setIsLoading(false);
      return;
    }

    // Skip if synthesized labels already exist in the analysis object
    const allSynthesized = Object.values(analysis.axisLabels).every(
      axis => axis.synthesizedNegative && axis.synthesizedPositive
    );

    if (allSynthesized) {
      const enhanced: EnhancedAxisLabels = {};
      Object.entries(analysis.axisLabels).forEach(([key, axis]) => {
        enhanced[key] = {
          negative: axis.negative,
          positive: axis.positive,
          synthesizedNegative: axis.synthesizedNegative!,
          synthesizedPositive: axis.synthesizedPositive!,
        };
      });
      setEnhancedLabels(enhanced);
      setIsLoading(false);
      return;
    }

    const analysisSnapshot = analysis;
    const axisLabels = analysisSnapshot.axisLabels!;

    // Enhance in background
    setIsLoading(true);
    console.log(`[Axis Labels] Enhancing labels using model: ${selectedModel}`);
    if (onAddLog) onAddLog("api_request", `Enhancing axis labels with AI using ${selectedModel}...`);
    
    const enhanceLabels = async () => {
      try {
        const getConceptContext = (id: string) => {
          const concept = analysisSnapshot.concepts.find(c => c.id === id);
          if (!concept) return { keywords: [], sentences: [] };
          return {
            keywords: concept.topTerms,
            sentences: concept.representativeSentences || []
          };
        };

        const axisLabelsRequest: any = {};
        Object.entries(axisLabels).forEach(([key, axis]) => {
          axisLabelsRequest[key] = {
            negative: axis.negative,
            positive: axis.positive,
            negativeContext: getConceptContext(axis.negativeId),
            positiveContext: getConceptContext(axis.positiveId)
          };
        });

        const response = await fetch("/api/analyze/axis-labels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            axisLabels: axisLabelsRequest,
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
  }, [analysis, enabled, enhancedLabels, selectedModel, onAddLog, refreshTrigger]);

  return { enhancedLabels, isLoading, refreshAxisLabels };
}
