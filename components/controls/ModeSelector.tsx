"use client";

import { LayoutGrid, Users, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type GraphMode = "bipartite" | "jurorSimilarity" | "conceptMap";

interface ModeSelectorProps {
  mode: GraphMode;
  onModeChange: (mode: GraphMode) => void;
}

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  const options: { id: GraphMode; label: string; icon: any; description: string }[] = [
    { 
      id: "bipartite", 
      label: "Bipartite", 
      icon: LayoutGrid, 
      description: "Jurors connected to the concepts they discussed." 
    },
    { 
      id: "jurorSimilarity", 
      label: "Jurors", 
      icon: Users, 
      description: "Jurors connected by shared concept usage." 
    },
    { 
      id: "conceptMap", 
      label: "Concepts", 
      icon: BrainCircuit, 
      description: "Concepts connected by co-occurrence in jury comments." 
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = mode === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onModeChange(opt.id)}
            className={cn(
              "group relative flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition-all",
              isActive 
                ? "border-indigo-500 bg-slate-900 text-white shadow-lg shadow-indigo-200/20 scale-[1.02]" 
                : "border-slate-100 bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm"
            )}
          >
            <div className={cn(
              "mt-1 rounded-xl p-2 transition-colors",
              isActive ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className={cn(
                "font-bold transition-colors",
                isActive ? "text-white" : "text-slate-800"
              )}>
                {opt.label}
              </div>
              <div className={cn(
                "mt-0.5 text-xs font-medium leading-snug transition-colors",
                isActive ? "text-slate-300" : "text-slate-500"
              )}>
                {opt.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

