"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";

interface DesignerAnalysisControlsProps {
  kConcepts: number;
  onKConceptsChange: (v: number) => void;
  loading?: boolean;
  onAnalyze: () => void;
}

export function DesignerAnalysisControls({
  kConcepts,
  onKConceptsChange,
  loading = false,
  onAnalyze,
}: DesignerAnalysisControlsProps) {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">Designer Analysis</p>
          <p className="text-[10px] text-slate-500">Cluster designer text (images attach post-hoc)</p>
        </div>
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-slate-600">Concept count</Label>
        <Input
          type="number"
          min={2}
          max={30}
          value={kConcepts}
          onChange={(e) => onKConceptsChange(Number(e.target.value))}
          className="h-9"
        />
      </div>
      <Button className="w-full" onClick={onAnalyze} disabled={loading}>
        {loading ? "Analyzing..." : "Analyze Designers"}
      </Button>
    </div>
  );
}
