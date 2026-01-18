import type { SavedReport, AnalysisResult, MinimalAnalysisResult } from "@/types/analysis";
import LZString from "lz-string";
import { minimizeAnalysis, expandMinimalAnalysis, isMinimalAnalysis } from "./analysis-minimizer";

const STORAGE_KEY = "semi-chan-reports";
const METADATA_KEY = "semi-chan-reports-metadata"; // Lightweight metadata cache for fast listing
const MAX_STORAGE_SIZE = 4 * 1024 * 1024; // 4MB safety limit (localStorage is typically 5-10MB)
const MAX_REPORTS = 50; // Maximum number of reports to keep

// Lightweight metadata type for fast listing
export interface ReportMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  metadata: SavedReport["metadata"];
  jurorBlocksCount: number; // Number of juror blocks (for computing rawText length)
  totalTextLength: number; // Total text length from jurorBlocks (replaces rawText.length)
}

const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

function getStorageSize(): number {
  if (!isBrowser()) return 0;
  let total = 0;
  for (let key in window.localStorage) {
    if (window.localStorage.hasOwnProperty(key)) {
      total += window.localStorage[key].length + key.length;
    }
  }
  return total;
}

function estimateSize(data: string): number {
  // Estimate size including key overhead
  return data.length + STORAGE_KEY.length;
}

function compressData(data: string): string {
  try {
    return LZString.compressToUTF16(data);
  } catch (error) {
    console.warn("[ReportStorage] Compression failed, using uncompressed", error);
    return data;
  }
}

function decompressData(compressed: string): string {
  try {
    // Try to decompress first
    const decompressed = LZString.decompressFromUTF16(compressed);
    if (decompressed !== null) {
      return decompressed;
    }
    // If decompression returns null, it might be uncompressed data
    return compressed;
  } catch (error) {
    // If decompression fails, assume it's uncompressed
    return compressed;
  }
}

function evictOldReports(reports: SavedReport[], targetCount: number): SavedReport[] {
  if (reports.length <= targetCount) return reports;
  
  // Sort by updatedAt (oldest first) and keep the most recent ones
  const sorted = [...reports].sort((a, b) => 
    new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
  );
  
  const evicted = sorted.slice(0, sorted.length - targetCount);
  const kept = sorted.slice(sorted.length - targetCount);
  
  console.warn(
    `[ReportStorage] Evicted ${evicted.length} old reports, keeping ${kept.length} most recent`
  );
  
  return kept;
}

function readMetadataList(): ReportMetadata[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(METADATA_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ReportMetadata[];
  } catch (error) {
    console.warn("[ReportStorage] Failed to read metadata list", error);
    return [];
  }
}

function persistMetadataList(metadataList: ReportMetadata[]): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(METADATA_KEY, JSON.stringify(metadataList));
  } catch (error) {
    console.warn("[ReportStorage] Failed to persist metadata list", error);
  }
}

function extractMetadata(report: SavedReport): ReportMetadata {
  // Compute total text length from jurorBlocks (replaces rawText)
  const totalTextLength = report.jurorBlocks.reduce((sum, block) => {
    const blockLength = (block.comments || []).reduce((cSum, c) => cSum + (c.text?.length || 0), 0);
    return sum + blockLength;
  }, 0);
  
  return {
    id: report.id,
    name: report.name,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    metadata: report.metadata,
    jurorBlocksCount: report.jurorBlocks.length,
    totalTextLength,
  };
}

function readReports(): SavedReport[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    
    // Try to decompress
    const decompressed = decompressData(raw);
    const parsed = JSON.parse(decompressed);
    if (!Array.isArray(parsed)) return [];
    return parsed as SavedReport[];
  } catch (error) {
    console.warn("[ReportStorage] Failed to read reports", error);
    return [];
  }
}

function persistReports(reports: SavedReport[]): void {
  if (!isBrowser()) return;
  
  try {
    // Limit number of reports
    const limitedReports = evictOldReports(reports, MAX_REPORTS);
    
    // Update metadata cache (lightweight, fast to read)
    const metadataList = limitedReports.map(extractMetadata);
    persistMetadataList(metadataList);
    
    // Remove rawText to save space (can be computed from jurorBlocks)
    const optimizedReports = limitedReports.map(report => {
      const { rawText, ...rest } = report;
      return rest;
    });
    
    // Serialize to JSON
    const jsonData = JSON.stringify(optimizedReports);
    
    // Compress the data
    const compressed = compressData(jsonData);
    
    // Check size before storing
    const estimatedSize = estimateSize(compressed);
    const currentStorageSize = getStorageSize();
    
    if (estimatedSize + currentStorageSize > MAX_STORAGE_SIZE) {
      // Try evicting more reports
      const moreLimited = evictOldReports(limitedReports, Math.max(1, Math.floor(MAX_REPORTS * 0.7)));
      const moreMetadata = moreLimited.map(extractMetadata);
      persistMetadataList(moreMetadata);
      
      const moreOptimized = moreLimited.map(report => {
        const { rawText, ...rest } = report;
        return rest;
      });
      
      const reducedJson = JSON.stringify(moreOptimized);
      const reducedCompressed = compressData(reducedJson);
      const reducedSize = estimateSize(reducedCompressed);
      
      if (reducedSize + currentStorageSize > MAX_STORAGE_SIZE) {
        // Still too large, try storing just metadata
        console.warn("[ReportStorage] Storage still too large after eviction, attempting minimal save");
        throw new Error("Storage quota exceeded even after eviction");
      }
      
      // Try storing the reduced set
      window.localStorage.setItem(STORAGE_KEY, reducedCompressed);
      console.warn(
        `[ReportStorage] Saved ${moreLimited.length} reports (evicted ${limitedReports.length - moreLimited.length} due to size)`
      );
      return;
    }
    
    // Store compressed data
    window.localStorage.setItem(STORAGE_KEY, compressed);
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      // Try aggressive eviction
      const aggressiveEviction = evictOldReports(reports, Math.max(1, Math.floor(MAX_REPORTS * 0.5)));
      try {
        const aggressiveMetadata = aggressiveEviction.map(extractMetadata);
        persistMetadataList(aggressiveMetadata);
        
        const aggressiveOptimized = aggressiveEviction.map(report => {
          const { rawText, ...rest } = report;
          return rest;
        });
        
        const jsonData = JSON.stringify(aggressiveOptimized);
        const compressed = compressData(jsonData);
        window.localStorage.setItem(STORAGE_KEY, compressed);
        console.warn(
          `[ReportStorage] Saved ${aggressiveEviction.length} reports after aggressive eviction`
        );
      } catch (retryError) {
        console.error("[ReportStorage] Failed to persist reports even after eviction", retryError);
        throw new Error("Storage quota exceeded. Please delete some old reports manually.");
      }
    } else {
      console.error("[ReportStorage] Failed to persist reports", error);
      throw error;
    }
  }
}

/**
 * Fast count function that doesn't load full report data
 * Uses lightweight metadata cache instead
 */
export function getReportCount(): number {
  const metadata = readMetadataList();
  return metadata.length;
}

/**
 * Get lightweight metadata list for fast listing (doesn't load full report data)
 */
export function getReportMetadataList(): ReportMetadata[] {
  const metadata = readMetadataList();
  return metadata.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

/**
 * Get all reports with full data (slower, use only when needed)
 * Expands minimal reports to full format for backward compatibility
 */
export function getAllReports(): SavedReport[] {
  const reports = readReports();
  // Expand minimal reports and reconstruct rawText
  return reports.map(report => {
    let expandedAnalysis: AnalysisResult | MinimalAnalysisResult = report.analysis;
    
    // Expand minimal reports to full format
    // Check both isMinimal flag and actual structure for backward compatibility
    if ((report.isMinimal || isMinimalAnalysis(report.analysis)) && isMinimalAnalysis(report.analysis)) {
      expandedAnalysis = expandMinimalAnalysis(report.analysis, report.jurorBlocks, report.parameters);
    }
    
    return {
      ...report,
      analysis: expandedAnalysis,
      rawText: report.rawText ?? report.jurorBlocks.map(b => (b.comments || []).map(c => c.text).join("\n")).join("\n\n"),
    };
  }).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getReport(id: string): SavedReport | undefined {
  const report = readReports().find((r) => r.id === id);
  if (!report) return undefined;
  
  // Expand minimal report to full format if needed
  // Check both isMinimal flag and actual structure for backward compatibility
  let expandedAnalysis: AnalysisResult | MinimalAnalysisResult = report.analysis;
  if ((report.isMinimal || isMinimalAnalysis(report.analysis)) && isMinimalAnalysis(report.analysis)) {
    expandedAnalysis = expandMinimalAnalysis(report.analysis, report.jurorBlocks, report.parameters);
  }
  
  // Reconstruct rawText from jurorBlocks if missing
  return {
    ...report,
    analysis: expandedAnalysis,
    rawText: report.rawText ?? report.jurorBlocks.map(b => (b.comments || []).map(c => c.text).join("\n")).join("\n\n"),
  };
}

export function saveReport(report: SavedReport): SavedReport {
  const reports = readReports();
  const existingIndex = reports.findIndex((r) => r.id === report.id);
  
  // Convert AnalysisResult to MinimalAnalysisResult before saving
  let optimizedAnalysis: AnalysisResult | MinimalAnalysisResult;
  let isMinimal = false;
  
  if (!isMinimalAnalysis(report.analysis)) {
    // Convert full analysis to minimal format
    optimizedAnalysis = minimizeAnalysis(report.analysis);
    isMinimal = true;
  } else {
    // Already minimal, keep as-is
    optimizedAnalysis = report.analysis;
    isMinimal = true;
  }
  
  // Remove rawText before saving (redundant, can be computed from jurorBlocks)
  const optimizedReport: SavedReport = {
    ...report,
    analysis: optimizedAnalysis,
    rawText: undefined, // Don't save rawText to reduce storage
    isMinimal,
  };
  
  if (existingIndex >= 0) {
    reports[existingIndex] = optimizedReport;
  } else {
    reports.unshift(optimizedReport);
  }
  persistReports(reports);
  return optimizedReport;
}

export function updateReport(id: string, updates: Partial<SavedReport>): SavedReport | null {
  const reports = readReports();
  const idx = reports.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  
  const existingReport = reports[idx];
  let updatedAnalysis: AnalysisResult | MinimalAnalysisResult = updates.analysis ?? existingReport.analysis;
  
  // If updating analysis, ensure it's minimized
  if (updates.analysis && !isMinimalAnalysis(updates.analysis)) {
    updatedAnalysis = minimizeAnalysis(updates.analysis);
  }
  
  const updated: SavedReport = {
    ...existingReport,
    ...updates,
    analysis: updatedAnalysis,
    updatedAt: updates.updatedAt ?? new Date().toISOString(),
    isMinimal: updates.analysis ? (isMinimalAnalysis(updatedAnalysis) || true) : existingReport.isMinimal,
  };
  reports[idx] = updated;
  persistReports(reports);
  return updated;
}

export function deleteReport(id: string): boolean {
  const reports = readReports();
  const filtered = reports.filter((r) => r.id !== id);
  if (filtered.length === reports.length) return false;
  persistReports(filtered);
  
  // Also update metadata cache
  const metadata = readMetadataList();
  const filteredMetadata = metadata.filter((m) => m.id !== id);
  persistMetadataList(filteredMetadata);
  
  return true;
}

export function getStorageInfo(): { 
  reportCount: number; 
  estimatedSize: number; 
  currentStorageSize: number;
  maxReports: number;
} {
  const reports = readReports();
  const jsonData = JSON.stringify(reports);
  const compressed = compressData(jsonData);
  const estimatedSize = estimateSize(compressed);
  const currentStorageSize = getStorageSize();
  
  return {
    reportCount: reports.length,
    estimatedSize,
    currentStorageSize,
    maxReports: MAX_REPORTS,
  };
}

export function clearAllReports(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(METADATA_KEY);
  } catch (error) {
    console.error("[ReportStorage] Failed to clear reports", error);
    throw error;
  }
}
