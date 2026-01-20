import { useState, useEffect, useCallback, useRef } from "react";
import type { AnalysisResult } from "@/types/analysis";
import type { LogEntry } from "@/components/inspector/InspectorConsole";

import { DEFAULT_MODEL } from "@/constants/nlp-constants";

export type EnhancedAxisLabels = Record<string, { 
  negative: string; 
  positive: string; 
  synthesizedNegative: string; 
  synthesizedPositive: string;
  name?: string;
  synthesizedName?: string;
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
  const fetchedForAnalysisKeyRef = useRef<string | null>(null);
  const lastAnalysisRef = useRef<AnalysisResult | null>(null);
  const lastAnalysisKeyRef = useRef<string | null>(null);
  const lastRefreshAppliedRef = useRef<number>(0);

  const refreshAxisLabels = useCallback(() => {
    setEnhancedLabels(null);
    fetchedForAnalysisKeyRef.current = null;
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    if (!analysis || !analysis.axisLabels) {
      setEnhancedLabels(null);
      setIsLoading(false);
      fetchedForAnalysisKeyRef.current = null;
      lastAnalysisRef.current = null;
      lastAnalysisKeyRef.current = null;
      lastRefreshAppliedRef.current = 0;
      return;
    }

    const axisKeyParts = Object.entries(analysis.axisLabels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([axisId, axis]) => [
        axisId,
        axis.negativeId ?? "",
        axis.positiveId ?? "",
        axis.negative ?? "",
        axis.positive ?? "",
        axis.name ?? "",
        axis.synthesizedName ?? "",
      ].join("|"));

    const analysisKey = JSON.stringify({
      axes: axisKeyParts,
      stats: {
        sentences: analysis.stats?.totalSentences ?? 0,
        concepts: analysis.stats?.totalConcepts ?? 0,
      },
    });

    if (!analysisKey || axisKeyParts.length === 0) {
      setEnhancedLabels(null);
      setIsLoading(false);
      lastAnalysisRef.current = null;
      lastAnalysisKeyRef.current = null;
      fetchedForAnalysisKeyRef.current = null;
      lastRefreshAppliedRef.current = 0;
      return;
    }

    const analysisChanged = analysis !== lastAnalysisRef.current || analysisKey !== lastAnalysisKeyRef.current;
    if (analysisChanged) {
      setEnhancedLabels(null);
      fetchedForAnalysisKeyRef.current = null;
      lastRefreshAppliedRef.current = refreshTrigger;
      lastAnalysisRef.current = analysis;
      lastAnalysisKeyRef.current = analysisKey;
    }

    const refreshRequested = refreshTrigger !== lastRefreshAppliedRef.current;
    // Skip if we've already successfully fetched for this analysis (unless refresh was triggered)
    // The ref tracks what we've fetched - if it matches and no refresh, we can skip
    // But we still need to check if we actually have the labels (they might have been cleared)
    const hasFetchedForThisAnalysis = fetchedForAnalysisKeyRef.current === analysisKey;
    
    // If we've already fetched and no refresh was requested, check if we have labels
    if (hasFetchedForThisAnalysis && !refreshRequested) {
      // We've fetched before - if we have labels, we're done
      // Note: enhancedLabels state might be stale here, but that's okay - we'll check it in the next render
      // For now, just return and let the component render with current state
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
          name: axis.name,
          synthesizedName: axis.synthesizedName,
        };
      });
      setEnhancedLabels(enhanced);
      fetchedForAnalysisKeyRef.current = analysisKey;
      lastAnalysisKeyRef.current = analysisKey;
      lastAnalysisRef.current = analysis;
      lastRefreshAppliedRef.current = refreshTrigger;
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
          // Only send the first 5 sentences and top 10 keywords to minimize payload
          return {
            keywords: concept.topTerms.slice(0, 10),
            sentences: (concept.representativeSentences || []).slice(0, 5)
          };
        };

        const getTopConceptsNearPole = (dim: number, direction: 'neg' | 'pos', limit: number = 3) => {
          if (!analysisSnapshot.nodes) return [];
          return analysisSnapshot.nodes
            .filter(n => n.type === 'concept' && n.pcValues && n.pcValues[dim] !== undefined)
            .map(n => ({ label: n.label, score: n.pcValues![dim] }))
            .sort((a, b) => direction === 'neg' ? a.score - b.score : b.score - a.score)
            .slice(0, limit)
            .map(n => n.label);
        };

        const axisLabelsRequest: any = {};
        Object.entries(axisLabels).forEach(([key, axis]) => {
          const aliasMap: Record<string, number> = { 'x': 0, 'y': 1, 'z': 2 };
          const axisIndex = aliasMap[key.toLowerCase()] ?? Number.parseInt(key, 10);
          
          axisLabelsRequest[key] = {
            negative: axis.negative,
            positive: axis.positive,
            negativeContext: getConceptContext(axis.negativeId),
            positiveContext: getConceptContext(axis.positiveId),
            negativeTopConcepts: Number.isFinite(axisIndex) ? getTopConceptsNearPole(axisIndex, 'neg') : [],
            positiveTopConcepts: Number.isFinite(axisIndex) ? getTopConceptsNearPole(axisIndex, 'pos') : [],
            name: axis.name || axis.synthesizedName,
          };
        });

        const response = await fetch("/api/analyze/axis-synthesis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            axisLabels: axisLabelsRequest,
            model: selectedModel,
            // Send only the minimal variance stats to avoid 413 Payload Too Large
            analysis: {
              varianceStats: analysisSnapshot.varianceStats,
            },
          }),
        });

        if (!response.ok) throw new Error("Axis synthesis API failed");

        const data: any = await response.json();
        console.log(`[Axis Labels] Enhancement successful`, data);
        if (onAddLog) onAddLog("api_response", `Axis labels enhanced successfully`, { ...data, model: selectedModel });
        if (lastAnalysisKeyRef.current !== analysisKey) return;
        setEnhancedLabels(data.axisLabels);
        fetchedForAnalysisKeyRef.current = analysisKey;
        lastAnalysisRef.current = analysisSnapshot;
        lastAnalysisKeyRef.current = analysisKey;
        lastRefreshAppliedRef.current = refreshTrigger;
      } catch (error) {
        console.error("[Axis Labels] Error:", error);
        const message = error instanceof Error ? error.message : String(error);
        if (onAddLog) onAddLog("api_error", `Axis label enhancement failed: ${message}`);
      } finally {
        setIsLoading(false);
      }
    };

    enhanceLabels();
  }, [analysis, enabled, selectedModel, refreshTrigger, onAddLog]);

  return { enhancedLabels, isLoading, refreshAxisLabels };
}
