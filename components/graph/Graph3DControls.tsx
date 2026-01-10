"use client";

import { RotateCcw, Grid3X3, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { AnalysisResult } from "@/types/analysis";

interface Graph3DControlsProps {
  showGrid: boolean;
  onToggleGrid: () => void;
  showAxes: boolean;
  onToggleAxes: () => void;
  onResetCamera: () => void;
  axisLabels?: AnalysisResult["axisLabels"];
  enableAxisLabelAI?: boolean;
  onToggleAxisLabelAI?: (enabled: boolean) => void;
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
}: Graph3DControlsProps) {
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
        <div className="absolute top-4 right-4 z-10 rounded-xl border bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm max-w-xs">
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
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex items-center gap-1.5 font-bold text-red-600 uppercase tracking-tighter text-[9px]">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                X-Axis (Horizontal)
              </div>
              <div className="text-slate-600 font-medium pl-3 border-l border-red-100 mt-0.5 flex items-center gap-2">
                <span className={enableAxisLabelAI && axisLabels.x.synthesizedNegative ? "text-indigo-600 font-bold" : ""}>
                  {(enableAxisLabelAI && axisLabels.x.synthesizedNegative) || axisLabels.x.negative}
                </span>
                <span className="text-red-500 font-bold opacity-50">↔</span>
                <span className={enableAxisLabelAI && axisLabels.x.synthesizedPositive ? "text-indigo-600 font-bold" : ""}>
                  {(enableAxisLabelAI && axisLabels.x.synthesizedPositive) || axisLabels.x.positive}
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-green-600 uppercase tracking-tighter text-[9px]">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                Y-Axis (Vertical)
              </div>
              <div className="text-slate-600 font-medium pl-3 border-l border-green-100 mt-0.5 flex items-center gap-2">
                <span className={enableAxisLabelAI && axisLabels.y.synthesizedNegative ? "text-indigo-600 font-bold" : ""}>
                  {(enableAxisLabelAI && axisLabels.y.synthesizedNegative) || axisLabels.y.negative}
                </span>
                <span className="text-green-500 font-bold opacity-50">↔</span>
                <span className={enableAxisLabelAI && axisLabels.y.synthesizedPositive ? "text-indigo-600 font-bold" : ""}>
                  {(enableAxisLabelAI && axisLabels.y.synthesizedPositive) || axisLabels.y.positive}
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold text-blue-600 uppercase tracking-tighter text-[9px]">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Z-Axis (Depth)
              </div>
              <div className="text-slate-600 font-medium pl-3 border-l border-blue-100 mt-0.5 flex items-center gap-2">
                <span className={enableAxisLabelAI && axisLabels.z.synthesizedNegative ? "text-indigo-600 font-bold" : ""}>
                  {(enableAxisLabelAI && axisLabels.z.synthesizedNegative) || axisLabels.z.negative}
                </span>
                <span className="text-blue-500 font-bold opacity-50">↔</span>
                <span className={enableAxisLabelAI && axisLabels.z.synthesizedPositive ? "text-indigo-600 font-bold" : ""}>
                  {(enableAxisLabelAI && axisLabels.z.synthesizedPositive) || axisLabels.z.positive}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
