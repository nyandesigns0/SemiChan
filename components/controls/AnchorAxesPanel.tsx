"use client";

import { useEffect, useState } from "react";
import type { AnchorAxis } from "@/types/anchor-axes";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AnchorAxesList } from "./AnchorAxesList";

interface AnchorAxesPanelProps {
  axes?: AnchorAxis[];
  onChange: (axes: AnchorAxis[]) => void;
}

export function AnchorAxesPanel({ axes, onChange }: AnchorAxesPanelProps) {
  const [localAxes, setLocalAxes] = useState<AnchorAxis[]>(axes ?? []);

  useEffect(() => {
    setLocalAxes(axes ?? []);
  }, [axes]);

  const addAxis = () => {
    const id = `axis-${Date.now()}`;
    const next: AnchorAxis = {
      id,
      name: "New Axis",
      negativePole: { label: "Negative", seedPhrases: [] },
      positivePole: { label: "Positive", seedPhrases: [] },
    };
    const updated = [...localAxes, next];
    setLocalAxes(updated);
    onChange(updated);
  };

  const handleAxesChange = (updated: AnchorAxis[]) => {
    setLocalAxes(updated);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-slate-800">Anchored Axes</p>
          <p className="text-[10px] text-slate-500">Define interpretable semantic directions</p>
        </div>
        <Button variant="outline" onClick={addAxis} className="h-8 px-2 text-xs">
          <Plus className="mr-1 h-3 w-3" />
          Add Axis
        </Button>
      </div>

      <AnchorAxesList axes={localAxes} onChange={handleAxesChange} />
    </div>
  );
}
