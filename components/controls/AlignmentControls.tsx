"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link2 } from "lucide-react";

interface AlignmentControlsProps {
  disabled?: boolean;
  onAlign: () => void;
  alignmentCount?: number;
  loading?: boolean;
}

export function AlignmentControls({ disabled, onAlign, alignmentCount = 0, loading }: AlignmentControlsProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
            <Link2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800">Cross-Domain Alignment</p>
            <p className="text-[10px] text-slate-500">Link juror and designer concepts</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200">
          {alignmentCount} links
        </Badge>
      </div>
      <Button onClick={onAlign} disabled={disabled || loading} className="w-full">
        {loading ? "Aligning..." : "Compute Alignment"}
      </Button>
    </div>
  );
}
