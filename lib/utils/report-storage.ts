import type { SavedReport } from "@/types/analysis";

const STORAGE_KEY = "semi-chan-reports";

const isBrowser = () => typeof window !== "undefined" && typeof localStorage !== "undefined";

function readReports(): SavedReport[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  } catch (error) {
    console.warn("[ReportStorage] Failed to persist reports", error);
  }
}

export function getAllReports(): SavedReport[] {
  const reports = readReports();
  return reports.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getReport(id: string): SavedReport | undefined {
  return readReports().find((report) => report.id === id);
}

export function saveReport(report: SavedReport): SavedReport {
  const reports = readReports();
  const existingIndex = reports.findIndex((r) => r.id === report.id);
  if (existingIndex >= 0) {
    reports[existingIndex] = report;
  } else {
    reports.unshift(report);
  }
  persistReports(reports);
  return report;
}

export function updateReport(id: string, updates: Partial<SavedReport>): SavedReport | null {
  const reports = readReports();
  const idx = reports.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const updated: SavedReport = {
    ...reports[idx],
    ...updates,
    updatedAt: updates.updatedAt ?? new Date().toISOString(),
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
  return true;
}
