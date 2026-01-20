import type { InterpretationReport } from "@/types/interpretation";

const CACHE_NAME = "semichan-interpretation-cache";

interface CacheEntry {
  interpretation: InterpretationReport;
  timestamp: number;
  analysisSignature: string;
}

/**
 * Computes a simple hash/signature for an analysis result to detect changes.
 */
export function getAnalysisSignature(analysis: any): string {
  if (!analysis) return "";
  // Focus on identifying fields: buildId, stats, and a sample of content
  const components = [
    analysis.analysisBuildId || "",
    analysis.stats?.totalSentences || 0,
    analysis.stats?.totalConcepts || 0,
    analysis.stats?.totalJurors || 0,
    analysis.concepts?.[0]?.label || "",
    analysis.jurors?.[0] || ""
  ];
  return components.join("|");
}

export function saveToCache(analysisSignature: string, interpretation: InterpretationReport): void {
  try {
    if (typeof window === "undefined") return;
    const entry: CacheEntry = {
      interpretation,
      timestamp: Date.now(),
      analysisSignature
    };
    localStorage.setItem(`${CACHE_NAME}-${analysisSignature}`, JSON.stringify(entry));
  } catch (e) {
    console.warn("[Cache] Failed to save interpretation to cache", e);
  }
}

export function getFromCache(analysisSignature: string): InterpretationReport | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = localStorage.getItem(`${CACHE_NAME}-${analysisSignature}`);
    if (!raw) return null;
    
    const entry = JSON.parse(raw) as CacheEntry;
    // Basic validation
    if (entry.analysisSignature === analysisSignature && entry.interpretation) {
      return entry.interpretation;
    }
    return null;
  } catch (e) {
    console.warn("[Cache] Failed to read interpretation from cache", e);
    return null;
  }
}

export function clearCache(): void {
  if (typeof window === "undefined") return;
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(CACHE_NAME)) {
      localStorage.removeItem(key);
    }
  });
}
