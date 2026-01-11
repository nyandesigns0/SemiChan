"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sparkles, type LucideIcon, Axis3d } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface AIControlsProps {
  enableAxisLabelAI: boolean;
  onToggleAxisLabelAI: (enabled: boolean) => void;
  autoSynthesize: boolean;
  onToggleAutoSynthesize: (enabled: boolean) => void;
}

type ControlItem = {
  label: string;
  checked: boolean;
  onChange: (enabled: boolean) => void;
  icon: LucideIcon;
  description: string;
};

export function AIControls({
  enableAxisLabelAI,
  onToggleAxisLabelAI,
  autoSynthesize,
  onToggleAutoSynthesize,
}: AIControlsProps) {
  const controls: ControlItem[] = [
    {
      label: "AI Axis Labels",
      checked: enableAxisLabelAI,
      onChange: onToggleAxisLabelAI,
      icon: Axis3d,
      description: "Enhance dimensions with AI descriptions",
    },
    {
      label: "Synthesize All Nodes",
      checked: autoSynthesize,
      onChange: onToggleAutoSynthesize,
      icon: Sparkles,
      description: "Automatically generate summaries for all nodes",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3">
      {controls.map((control) => (
        <div
          key={control.label}
          className={cn(
            "flex items-center justify-between rounded-2xl border-2 px-4 py-3 transition-all",
            control.checked
              ? "border-indigo-500/30 bg-white shadow-md ring-1 ring-indigo-500/10"
              : "border-transparent bg-slate-50/50 opacity-60 hover:opacity-100 hover:bg-slate-50"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "rounded-lg p-2",
                control.checked ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400"
              )}
            >
              <control.icon className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <Label className="cursor-pointer text-sm font-bold text-slate-700">
                {control.label}
              </Label>
              <span className="text-[10px] font-medium text-slate-400">{control.description}</span>
            </div>
          </div>
          <Switch checked={control.checked} onCheckedChange={control.onChange} />
        </div>
      ))}
    </div>
  );
}
