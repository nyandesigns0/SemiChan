import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisResult } from "@/types/analysis";
import type { RawDataExportContext } from "@/components/inspector/export-types";
import type { InterpretationReport } from "@/types/interpretation";
import { getFromCache, saveToCache, getAnalysisSignature } from "@/lib/interpretation/cache";

type ProgressPayload = {
  stage: string;
  progress: number;
  message: string;
};

export type InterpretationState = {
  interpretation: InterpretationReport | null;
  isGenerating: boolean;
  progress: number;
  stage: string | null;
  error: string | null;
};

export function useInterpretationGenerator(analysis: AnalysisResult | null) {
  const [state, setState] = useState<InterpretationState>({
    interpretation: null,
    isGenerating: false,
    progress: 0,
    stage: null,
    error: null
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const jobIdRef = useRef<string | null>(null);

  // Load from cache when analysis changes
  useEffect(() => {
    if (!analysis) {
      setState(prev => ({ ...prev, interpretation: null }));
      return;
    }

    const signature = getAnalysisSignature(analysis);
    const cached = getFromCache(signature);
    if (cached) {
      setState(prev => ({ 
        ...prev, 
        interpretation: cached, 
        progress: 100, 
        stage: "complete",
        error: null 
      }));
    } else {
      setState(prev => ({ 
        ...prev, 
        interpretation: null, 
        progress: 0, 
        stage: null,
        error: null 
      }));
    }
  }, [analysis]);

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  const startProgressStream = useCallback((jobId: string, analysisForCache: AnalysisResult) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    const source = new EventSource(`/api/interpret/progress?jobId=${jobId}`);
    eventSourceRef.current = source;
    source.onmessage = (event) => {
      try {
        const payload: ProgressPayload = JSON.parse(event.data);
        
        if (payload.stage === "complete") {
          // If complete, the main generate call will handle the result
          return;
        }

        setState((prev) => ({
          ...prev,
          progress: payload.progress,
          stage: payload.stage,
          isGenerating: true,
          error: null
        }));
      } catch (error) {
        console.error("Failed to parse interpretation progress", error);
      }
    };
    source.onerror = () => {
      source.close();
      eventSourceRef.current = null;
    };
  }, []);

  const generate = useCallback(
    async (analysisToGenerate: AnalysisResult, rawExport?: RawDataExportContext, model?: string) => {
      if (!analysisToGenerate) return;
      
      setState((prev) => ({
        ...prev,
        isGenerating: true,
        progress: 5,
        stage: "starting",
        error: null
      }));

      try {
        // Prune the analysis result to avoid "Payload Too Large" (413) errors
        // We only send the fields required by the interpretation API
        const prunedAnalysis = {
          stats: analysisToGenerate.stats,
          concepts: analysisToGenerate.concepts.map(c => ({
            id: c.id,
            label: c.label,
            title: c.title,
            count: c.count,
            size: c.size,
            topTerms: c.topTerms,
            representativeSentences: c.representativeSentences
          })),
          jurors: analysisToGenerate.jurors,
          axisLabels: analysisToGenerate.axisLabels,
          finalKUsed: analysisToGenerate.finalKUsed,
          analysisBuildId: analysisToGenerate.analysisBuildId,
          reportHealth: analysisToGenerate.reportHealth,
        };

        const prunedRawExport = rawExport ? {
          analysisParams: rawExport.analysisParams,
          exportTimestamp: rawExport.exportTimestamp
        } : undefined;

        const response = await fetch("/api/interpret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analysis: prunedAnalysis,
            rawExportContext: prunedRawExport,
            model
          })
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          throw new Error(errorBody.error || "Interpretation generation failed");
        }
        const payload = await response.json();
        jobIdRef.current = payload.jobId;
        
        // Start streaming for fine-grained progress if needed, 
        // though the main POST now returns the full result at the end
        // for simplicity in this version.
        
        const interpretation = payload.interpretation;
        const signature = getAnalysisSignature(analysisToGenerate);
        saveToCache(signature, interpretation);

        setState((prev) => ({
          ...prev,
          interpretation,
          isGenerating: false,
          progress: 100,
          stage: "complete"
        }));
      } catch (error: any) {
        console.error("Interpretation generation failed", error);
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: error?.message || "Failed to generate interpretation",
          stage: "error"
        }));
      }
    },
    []
  );

  const refresh = useCallback(() => {
    // Force regeneration
    if (analysis) {
      generate(analysis);
    }
  }, [analysis, generate]);

  return useMemo(
    () => ({
      ...state,
      generate,
      refresh
    }),
    [state, generate, refresh]
  );
}
