"use client";

import { useState } from "react";
import { RotateCcw, Grid3X3, Box, Eye, EyeOff, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getAxisColors } from "@/lib/utils/graph-color-utils";
import type { AnalysisResult } from "@/types/analysis";
import { cn } from "@/lib/utils/cn";

interface Graph3DControlsProps {
  showGrid: boolean;
  onToggleGrid: () => void;
  showAxes: boolean;
  onToggleAxes: () => void;
  showGraph: boolean;
  onToggleGraph: () => void;
  onResetCamera: () => void;
  axisLabels?: AnalysisResult["axisLabels"];
  enableAxisLabelAI?: boolean;
  onToggleAxisLabelAI?: (enabled: boolean) => void;
  onRefreshAxisLabels?: () => void;
  isRefreshingAxisLabels?: boolean;
  numDimensions?: number;
}

export function Graph3DControls({
  showGrid,
  onToggleGrid,
  showAxes,
  onToggleAxes,
  showGraph,
  onToggleGraph,
  onResetCamera,
  axisLabels,
  enableAxisLabelAI = false,
  onToggleAxisLabelAI,
  onRefreshAxisLabels,
  isRefreshingAxisLabels = false,
  numDimensions = 3,
}: Graph3DControlsProps) {
  const axisColors = getAxisColors(numDimensions);
  const [axisPanelOpen, setAxisPanelOpen] = useState(false);
  const axisLabelsMap = axisLabels ?? {};
  const showAxisPanel = Boolean(axisLabels);

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
          variant={showGraph ? "default" : "outline"}
          className={`h-9 w-9 rounded-lg p-0 shadow-md backdrop-blur-sm ${
            showGraph ? "bg-slate-800 hover:bg-slate-700" : "bg-white/90 hover:bg-white"
          }`}
          onClick={onToggleGraph}
          title={showGraph ? "Hide Graph Content" : "Show Graph Content"}
        >
          {showGraph ? (
            <Eye className="h-4 w-4 text-white" />
          ) : (
            <EyeOff className="h-4 w-4 text-slate-700" />
          )}
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
      </div>

      {/* Axis Labels Info Panel - shown when axes are visible */}
      {showAxisPanel && (
        <div className="absolute top-4 left-4 z-10">
          <div className="rounded-xl border bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm max-w-xs min-w-[350px] overflow-hidden">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Axis Dimensions
              </div>
              <div className="flex items-center gap-2">
                {onRefreshAxisLabels && (
                  <Button
                    variant="ghost"
                    className="h-7 w-7 rounded-full p-0 text-slate-500 shadow-sm hover:text-slate-900 bg-white/90"
                    onClick={onRefreshAxisLabels}
                    disabled={isRefreshingAxisLabels}
                    title="Refresh AI axis labels"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${isRefreshingAxisLabels ? "animate-spin" : ""}`}
                    />
                  </Button>
                )}
                <label className="text-[9px] font-bold uppercase text-slate-400">AI Labels</label>
                <Switch
                  checked={enableAxisLabelAI}
                  onCheckedChange={onToggleAxisLabelAI}
                  className="scale-75"
                />
                <button
                  type="button"
                  aria-label={axisPanelOpen ? "Collapse axis dimensions panel" : "Expand axis dimensions panel"}
                  onClick={() => setAxisPanelOpen((prev) => !prev)}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {axisPanelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {axisPanelOpen && (
              <ScrollArea className={cn("pr-2", numDimensions > 4 ? "h-[480px]" : "h-auto")}>
                <div className="space-y-3 text-xs">
                  {Array.from({ length: numDimensions }).map((_, i) => {
                    const axisIdx = i.toString();
                    const data = axisLabelsMap[axisIdx];
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
                          <span className="font-bold opacity-50" style={{ color }}>ƒ+</span>
                          <span className={enableAxisLabelAI && data.synthesizedPositive ? "text-indigo-600 font-bold" : ""}>
                            {(enableAxisLabelAI && data.synthesizedPositive) || data.positive}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      )}
    </>
  );
}
