"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, RefreshCw, Pencil, Trash2, Play, Calendar, SlidersHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { SavedReport } from "@/types/analysis";
import { deleteReport, getAllReports, updateReport, getReportMetadataList, type ReportMetadata } from "@/lib/utils/report-storage";
import { cn } from "@/lib/utils/cn";

interface ReportsListProps {
  onLoadReport: (report: SavedReport) => void;
  refreshToken?: number;
  onCountChange?: (count: number) => void;
}

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString();
};

export function ReportsList({ onLoadReport, refreshToken = 0, onCountChange }: ReportsListProps) {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [metadata, setMetadata] = useState<ReportMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<SavedReport | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<SavedReport | null>(null);

  const loadReports = useCallback(() => {
    setIsLoading(true);
    // Use lightweight metadata for fast listing (doesn't load full report data)
    const metadataList = getReportMetadataList();
    setMetadata(metadataList);
    onCountChange?.(metadataList.length);
    
    // Load full reports lazily - only when needed for editing/deleting
    // This is much faster than loading all reports upfront
    const fullReports = getAllReports();
    setReports(fullReports);
    setIsLoading(false);
  }, [onCountChange]);

  useEffect(() => {
    loadReports();
  }, [loadReports, refreshToken]);

  const latestUpdated = useMemo(() => {
    if (metadata.length === 0) return null;
    const latestMeta = metadata[0]; // Already sorted by updatedAt
    // Find full report for loading
    return reports.find(r => r.id === latestMeta.id) || null;
  }, [metadata, reports]);

  const handleRename = () => {
    if (!editTarget) return;
    const nextName = editName.trim() || editTarget.name;
    updateReport(editTarget.id, { name: nextName });
    setEditTarget(null);
    setEditName("");
    loadReports();
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteReport(deleteTarget.id);
    setDeleteTarget(null);
    loadReports();
  };

  const renderMetadata = (meta: ReportMetadata, report?: SavedReport) => {
    const stats = meta.metadata?.stats;
    const params = meta.metadata?.parameters;
    const anchorCount = meta.metadata?.anchorAxisCount ?? 0;
    return (
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-600 md:grid-cols-4">
        <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-2 py-1.5">
          <span className="inline-flex h-2 w-2 rounded-full bg-indigo-500" />
          <span>{stats?.jurors ?? 0} jurors</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-2 py-1.5">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          <span>{stats?.sentences ?? 0} sentences</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-2 py-1.5">
          <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
          <span>{stats?.concepts ?? 0} concepts</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-2 py-1.5">
          <span className="inline-flex h-2 w-2 rounded-full bg-sky-500" />
          <span>{anchorCount} axes</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-2 py-1.5 md:col-span-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-slate-400" />
          <span className="truncate">
            k={params?.kConcepts ?? "?"} | dims={params?.numDimensions ?? "?"} | {params?.clusteringMode ?? "?"}
            {params?.autoK ? " (auto-k)" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-2 py-1.5 md:col-span-2">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span className="truncate">Updated {formatDate(meta.updatedAt)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-500" />
          <div>
            <p className="text-sm font-semibold text-slate-900">Saved Reports</p>
            <p className="text-[11px] font-semibold text-slate-500">Snapshots stored locally in your browser</p>
          </div>
        </div>
        <Button
          variant="outline"
          className="h-8 border-slate-200 text-xs font-semibold"
          onClick={loadReports}
          disabled={isLoading}
        >
          <RefreshCw className={cn("mr-2 h-3.5 w-3.5", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {metadata.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
          <p className="text-sm font-semibold text-slate-700">No reports yet</p>
          <p className="text-[11px] font-semibold text-slate-500">Save an analysis to see it appear here.</p>
        </div>
      )}

      {latestUpdated && (
        <Card className="border border-indigo-100 bg-indigo-50/60 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">Latest</p>
                <p className="text-sm font-semibold text-slate-900">{latestUpdated.name}</p>
                <p className="text-[11px] font-semibold text-slate-500">
                  Saved {formatDate(latestUpdated.createdAt)} • Updated {formatDate(latestUpdated.updatedAt)}
                </p>
              </div>
              <Button className="h-8 bg-slate-900 text-white px-4" onClick={() => onLoadReport(latestUpdated)}>
                <Play className="mr-2 h-3.5 w-3.5" />
                Load
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {metadata.map((meta) => {
          const report = reports.find(r => r.id === meta.id);
          return (
            <Card key={meta.id} className="border border-slate-200 bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-slate-100 text-[11px] font-semibold text-slate-700">
                        {meta.metadata?.parameters?.clusteringMode ?? "analysis"}
                      </Badge>
                      {meta.metadata?.hasAxisLabels && (
                        <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[10px] font-semibold text-amber-700">
                          Axis labels
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{meta.name}</p>
                    <p className="text-[11px] font-semibold text-slate-500">
                      Created {formatDate(meta.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      className="h-8 w-8 text-slate-500 hover:text-slate-900"
                      onClick={() => {
                        if (report) {
                          setEditTarget(report);
                          setEditName(report.name);
                        }
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-8 w-8 text-rose-500 hover:text-rose-600"
                      onClick={() => {
                        if (report) {
                          setDeleteTarget(report);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {renderMetadata(meta, report)}

                <Separator className="my-3" />

                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1 text-[10px] font-semibold text-slate-500">
                    <span className="rounded-full bg-slate-100 px-2 py-1">
                      Model: {meta.metadata?.model ?? "n/a"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1">
                      Text: {meta.totalTextLength.toLocaleString()} chars
                    </span>
                  </div>
                  <Button 
                    className="h-8 bg-slate-900 text-white px-4" 
                    onClick={() => {
                      if (report) {
                        onLoadReport(report);
                      } else {
                        // Load full report on demand
                        const fullReport = getAllReports().find(r => r.id === meta.id);
                        if (fullReport) {
                          onLoadReport(fullReport);
                        }
                      }
                    }}
                  >
                    <Play className="mr-2 h-3.5 w-3.5" />
                    Load
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={Boolean(editTarget)} onOpenChange={(open) => {
        if (!open) {
          setEditTarget(null);
          setEditName("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit report name</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-6 pb-6">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Report name"
              className="text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-slate-200 px-4"
                onClick={() => {
                  setEditTarget(null);
                  setEditName("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleRename} className="bg-slate-900 text-white px-4">
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => {
        if (!open) setDeleteTarget(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete report?</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 px-6 pb-6">
            <p className="text-sm font-semibold text-slate-700">
              This will remove "{deleteTarget?.name}" from your browser storage. You cannot undo this action.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-slate-200 px-4"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                className="border-rose-100 bg-rose-600 text-white hover:bg-rose-700 px-4"
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
