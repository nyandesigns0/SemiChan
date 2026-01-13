"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Sparkles, type LucideIcon, Axis3d, ToggleLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface AIControlsProps {
  enableAxisLabelAI: boolean;
  onToggleAxisLabelAI: (enabled: boolean) => void;
  autoSynthesize: boolean;
  onToggleAutoSynthesize: (enabled: boolean) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
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
  selectedModel,
  onModelChange,
}: AIControlsProps) {
  const models = [
    "GPT-5.1",
    "GPT-5",
    "GPT-4.1",
    "GPT-4.1 mini",
    "GPT-4.1-nano",
    "GPT-4o-mini"
  ];

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

  const allEnabled = enableAxisLabelAI && autoSynthesize;
  const toggleAll = (enabled: boolean) => {
    onToggleAxisLabelAI(enabled);
    onToggleAutoSynthesize(enabled);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-900">
          <Axis3d className="h-3 w-3" />
          Language Model
        </Label>
        <div className="relative group">
          <select
            value={selectedModel}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-tight text-slate-700 outline-none transition-all hover:border-slate-300 focus:ring-2 focus:ring-indigo-500/20"
          >
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-600">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>

      <Separator className="bg-slate-100/80" />

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-900">
          <Sparkles className="h-3 w-3" />
          API Actions
        </Label>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600">
              <ToggleLeft className="h-3.5 w-3.5" />
            </div>
            <div className="flex flex-col">
              <Label className="text-[11px] font-bold text-slate-700">Enable all AI actions</Label>
              <span className="text-[10px] font-medium text-slate-400">Turns on/off every API-driven toggle below.</span>
            </div>
          </div>
          <Switch checked={allEnabled} onCheckedChange={toggleAll} />
        </div>

        <div className="space-y-2">
          {controls.map((control) => (
            <div
              key={control.label}
              className={cn(
                "flex items-center justify-between rounded-xl border px-3 py-2 transition-all",
                control.checked
                  ? "border-indigo-500/30 bg-white shadow-sm ring-1 ring-indigo-500/10"
                  : "border-slate-200/70 bg-slate-50/40"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "rounded-lg p-1.5",
                    control.checked ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400"
                  )}
                >
                  <control.icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex flex-col">
                  <Label className="cursor-pointer text-[11px] font-bold text-slate-700">
                    {control.label}
                  </Label>
                  <span className="text-[10px] font-medium text-slate-400">{control.description}</span>
                </div>
              </div>
              <Switch checked={control.checked} onCheckedChange={control.onChange} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
