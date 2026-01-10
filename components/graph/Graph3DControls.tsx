"use client";

import { RotateCcw, Grid3X3, Box, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAxisColors } from "./GraphCanvas3D";
import type { AnalysisResult } from "@/types/analysis";
import { cn } from "@/lib/utils/cn";

interface Graph3DControlsProps {
  showGrid: boolean;
  onToggleGrid: () => void;
  showAxes: boolean;
  onToggleAxes: () => void;
  onResetCamera: () => void;
  axisLabels?: AnalysisResult["axisLabels"];
  enableAxisLabelAI?: boolean;
  onToggleAxisLabelAI?: (enabled: boolean) => void;
  numDimensions?: number;
}

export function Graph3DControls({
  showGrid,
  onToggleGrid,
  showAxes,
  onToggleAxes,
  onResetCamera,
  axisLabels,
  enableAxisLabelAI = false,
  onToggleAxisLabelAI,
  numDimensions = 3,
}: Graph3DControlsProps) {
  const axisColors = getAxisColors(numDimensions);

  return (
    <>
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
        <Button
          variant="outline"
          className="h-9 w-9 rounded-lg bg-white/90 p-0 shadow-md backdrop-blur-sm hover:bg-white"
          onClick={onResetCamera}
          title="Reset camera view"
        >
          <RotateCcw className="h-4 w-4 text-slate-700" />
        </Button>
        
        <Button
          variant={showGrid ? "default" : "outline"}
          className={`h-9 w-9 rounded-lg p-0 shadow-md backdrop-blur-sm ${
            showGrid ? "bg-slate-800 hover:bg-slate-700" : "bg-white/90 hover:bg-white"
          }`}
          onClick={onToggleGrid}
          title="Toggle grid"
        >
          <Grid3X3 className={`h-4 w-4 ${showGrid ? "text-white" : "text-slate-700"}`} />
        </Button>

        <Button
          variant={showAxes ? "default" : "outline"}
          className={`h-9 w-9 rounded-lg p-0 shadow-md backdrop-blur-sm ${
            showAxes ? "bg-slate-800 hover:bg-slate-700" : "bg-white/90 hover:bg-white"
          }`}
          onClick={onToggleAxes}
          title="Toggle axes"
        >
          <Box className={`h-4 w-4 ${showAxes ? "text-white" : "text-slate-700"}`} />
        </Button>
      </div>

      {/* Axis Labels Info Panel - shown when axes are visible */}
      {showAxes && axisLabels && (
        <div className="absolute top-4 left-4 z-10 rounded-xl border bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm max-w-xs overflow-hidden">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Axis Dimensions
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[9px] font-bold uppercase text-slate-400">AI Labels</label>
              <Switch
                checked={enableAxisLabelAI}
                onCheckedChange={onToggleAxisLabelAI}
                className="scale-75"
              />
            </div>
          </div>
          
          <ScrollArea className={cn("pr-2", numDimensions > 4 ? "h-[200px]" : "h-auto")}>
            <div className="space-y-3 text-xs">
              {Array.from({ length: numDimensions }).map((_, i) => {
                const axisIdx = i.toString();
                const data = axisLabels[axisIdx];
                if (!data) return null;
                const color = axisColors[i];

                return (
                  <div key={axisIdx}>
                    <div 
                      className="flex items-center gap-1.5 font-bold uppercase tracking-tighter text-[9px]"
                      style={{ color }}
                    >
                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
                      Axis {i + 1}
                    </div>
                    <div 
                      className="text-slate-600 font-medium pl-3 border-l mt-0.5 flex items-center gap-2"
                      style={{ borderLeftColor: color + "40" }}
                    >
                      <span className={enableAxisLabelAI && data.synthesizedNegative ? "text-indigo-600 font-bold" : ""}>
                        {(enableAxisLabelAI && data.synthesizedNegative) || data.negative}
                      </span>
                      <span className="font-bold opacity-50" style={{ color }}>↔</span>
                      <span className={enableAxisLabelAI && data.synthesizedPositive ? "text-indigo-600 font-bold" : ""}>
                        {(enableAxisLabelAI && data.synthesizedPositive) || data.positive}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </>
  );
}
