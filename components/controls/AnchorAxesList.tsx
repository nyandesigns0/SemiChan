"use client";

import { useEffect, useState } from "react";
import type { AnchorAxis } from "@/types/anchor-axes";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface AnchorAxesListProps {
  axes?: AnchorAxis[];
  onChange: (axes: AnchorAxis[]) => void;
}

function seedString(seeds: string[]): string {
  return seeds.join(", ");
}

function parseSeeds(value: string): string[] {
  return value
    .split(/[,\\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function AnchorAxesList({ axes = [], onChange }: AnchorAxesListProps) {
  const [localAxes, setLocalAxes] = useState<AnchorAxis[]>(axes ?? []);

  useEffect(() => {
    setLocalAxes(axes ?? []);
  }, [axes]);

  const updateAxis = (idx: number, updated: Partial<AnchorAxis>) => {
    const next = [...localAxes];
    next[idx] = { ...next[idx], ...updated };
    setLocalAxes(next);
    onChange(next);
  };

  const removeAxis = (idx: number) => {
    const updated = localAxes.filter((_, i) => i !== idx);
    setLocalAxes(updated);
    onChange(updated);
  };

  if (localAxes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-[11px] text-slate-500">
        No axes yet. Create one to start measuring concepts along stable poles.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {localAxes.map((axis, idx) => (
        <div key={axis.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Input
              value={axis.name}
              onChange={(e) => updateAxis(idx, { name: e.target.value })}
              placeholder="Axis name (e.g., Pragmatic vs Aesthetic)"
              className="h-8 text-sm"
            />
            <Button variant="ghost" onClick={() => removeAxis(idx)} className="h-8 w-8 p-0">
              <Trash2 className="h-4 w-4 text-slate-400 mx-auto" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Negative Pole</label>
              <Input
                value={axis.negativePole.label}
                onChange={(e) =>
                  updateAxis(idx, { negativePole: { ...axis.negativePole, label: e.target.value } })
                }
                placeholder="Label (e.g., Pragmatic)"
                className="h-8 text-sm"
              />
              <Textarea
                value={seedString(axis.negativePole.seedPhrases)}
                onChange={(e) =>
                  updateAxis(idx, {
                    negativePole: { ...axis.negativePole, seedPhrases: parseSeeds(e.target.value) },
                  })
                }
                placeholder="Seed phrases, comma separated"
                className="min-h-[70px] text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Positive Pole</label>
              <Input
                value={axis.positivePole.label}
                onChange={(e) =>
                  updateAxis(idx, { positivePole: { ...axis.positivePole, label: e.target.value } })
                }
                placeholder="Label (e.g., Aesthetic)"
                className="h-8 text-sm"
              />
              <Textarea
                value={seedString(axis.positivePole.seedPhrases)}
                onChange={(e) =>
                  updateAxis(idx, {
                    positivePole: { ...axis.positivePole, seedPhrases: parseSeeds(e.target.value) },
                  })
                }
                placeholder="Seed phrases, comma separated"
                className="min-h-[70px] text-xs"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-none">
              {axis.negativeVector && axis.positiveVector ? "Embedded" : "Needs embedding"}
            </Badge>
            <span>Axes are computed during analysis; editing seeds will recompute automatically.</span>
          </div>
        </div>
      ))}
    </div>
  );
}
