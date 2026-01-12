import type { JurorBlock } from "@/types/nlp";

export interface ExportAnalysisParams {
  kConcepts: number;
  minEdgeWeight: number;
  similarityThreshold: number;
  evidenceRankingParams?: { semanticWeight: number; frequencyWeight: number };
  clusteringMode: "kmeans" | "hierarchical";
  autoK: boolean;
  clusterSeed: number;
  softMembership: boolean;
  cutType: "count" | "granularity";
  granularityPercent: number;
  numDimensions: number;
  appliedNumDimensions: number;
  dimensionMode: "manual" | "elbow" | "threshold";
  varianceThreshold: number;
  showAxes: boolean;
  showGraph: boolean;
  enableAxisLabelAI: boolean;
  autoSynthesize: boolean;
}

export interface ExportLogEntry {
  id: string;
  timestamp: string;
  type: string;
  message: string;
  data?: unknown;
}

export interface RawDataExportContext {
  rawText: string;
  jurorBlocks: JurorBlock[];
  analysisParams: ExportAnalysisParams;
  logs: ExportLogEntry[];
  apiCallCount: number;
  apiCostTotal: number;
  selectedModel: string;
  exportTimestamp?: string | null;
}
