"use client";

import { useState } from "react";
import { RotateCcw, RotateCw, Grid3X3, Box, Eye, EyeOff, RefreshCw, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  turntableEnabled?: boolean;
  onToggleTurntable?: () => void;
  axisLabels?: AnalysisResult["axisLabels"];
  enableAxisLabelAI?: boolean;
  onToggleAxisLabelAI?: (enabled: boolean) => void;
  autoSynthesize?: boolean;
  onToggleAutoSynthesize?: (enabled: boolean) => void;
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
  turntableEnabled = false,
  onToggleTurntable,
  axisLabels,
  enableAxisLabelAI = false,
  onToggleAxisLabelAI,
  autoSynthesize = false,
  onToggleAutoSynthesize,
  onRefreshAxisLabels,
  isRefreshingAxisLabels = false,
  numDimensions = 3,
}: Graph3DControlsProps) {
  const axisColors = getAxisColors(numDimensions);
  const [axisPanelOpen, setAxisPanelOpen] = useState(false);
  const axisLabelsMap = axisLabels ?? {};
  const showAxisPanel = Boolean(axisLabels);
  const aiBoostActive = enableAxisLabelAI && autoSynthesize && showAxes;
  const withAlpha = (base: string, alpha: number) => {
    const clamped = Math.min(1, Math.max(0, alpha));
    if (base.startsWith("hsl(")) {
      return base.replace("hsl(", "hsla(").replace(")", `, ${clamped})`);
    }
    if (base.startsWith("#")) {
      const hex = Math.round(clamped * 255).toString(16).padStart(2, "0");
      return `${base}${hex}`;
    }
    return base;
  };

  const handleAIBoost = () => {
    if (onToggleAxisLabelAI) onToggleAxisLabelAI(true);
    if (onToggleAutoSynthesize) onToggleAutoSynthesize(true);
    if (!showAxes) onToggleAxes();
  };

  return (
    <>
      <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
        {onToggleTurntable && (
          <Button
            variant={turntableEnabled ? "default" : "outline"}
            className={`h-9 w-9 rounded-lg p-0 shadow-md backdrop-blur-sm ${
              turntableEnabled ? "bg-slate-800 hover:bg-slate-700" : "bg-white/90 hover:bg-white"
            }`}
            onClick={onToggleTurntable}
            title={turntableEnabled ? "Stop turntable" : "Start turntable"}
          >
            <RotateCw className={`h-4 w-4 ${turntableEnabled ? "text-white" : "text-slate-700"}`} />
          </Button>
        )}
        
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

        <Button
          variant="outline"
          className={cn(
            "h-9 w-9 rounded-lg p-0 shadow-md backdrop-blur-sm transition-all",
            aiBoostActive
              ? "bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white hover:from-amber-500 hover:via-orange-600 hover:to-rose-600"
              : "bg-gradient-to-br from-amber-200/80 via-orange-300/80 to-rose-300/80 text-white hover:from-amber-300/90 hover:via-orange-400/90 hover:to-rose-400/90"
          )}
          onClick={handleAIBoost}
          title="Enable AI insights"
          aria-label="Enable AI insights"
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      </div>

      {/* Axis Labels Info Panel - shown when axes are visible */}
      {showAxisPanel && (
        <div className="absolute top-4 left-4 z-10">
          <div className="rounded-xl border bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm max-w-[90vw] w-[480px] overflow-hidden">
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
                <div className="space-y-4 text-xs">
                  {Array.from({ length: numDimensions }).map((_, i) => {
                    const axisIdx = i.toString();
                    const data = axisLabelsMap[axisIdx];
                    if (!data) return null;
                    const color = axisColors[i];
                    const axisFill = withAlpha(color, 0.78);
                    const axisLine = withAlpha(color, 0.35);
                    const negativeLabel = (enableAxisLabelAI && data.synthesizedNegative) || data.negative;
                    const positiveLabel = (enableAxisLabelAI && data.synthesizedPositive) || data.positive;
                    const axisTitle = (enableAxisLabelAI && data.synthesizedName) || data.name;

                    return (
                      <div key={axisIdx} className="rounded-xl border border-slate-100 bg-white/80 p-2.5 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-slate-900">
                            Axis {i + 1}
                          </div>
                          {axisTitle && (
                            <div
                              className="min-w-0 flex-1 truncate text-right text-[12px] font-semibold text-slate-900"
                              title={axisTitle}
                            >
                              {axisTitle}
                            </div>
                          )}
                        </div>

                        <div className="mt-2">
                          <div className="relative h-2 w-full rounded-full" style={{ backgroundColor: axisLine }}>
                            <div
                              className="absolute left-0 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full border border-slate-900/10 text-[9px] font-bold text-slate-900"
                              style={{ backgroundColor: axisFill }}
                            >
                              -
                            </div>
                            <div
                              className="absolute right-0 top-1/2 flex h-4 w-4 -translate-y-1/2 items-center justify-center rounded-full border border-slate-900/10 text-[9px] font-bold text-slate-900"
                              style={{ backgroundColor: axisFill }}
                            >
                              +
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <div
                              className="min-w-0 text-[11px] font-semibold text-slate-900"
                              title={negativeLabel}
                            >
                              <span className="truncate whitespace-nowrap">{negativeLabel}</span>
                            </div>
                            <div
                              className="min-w-0 text-right text-[11px] font-semibold text-slate-900"
                              title={positiveLabel}
                            >
                              <span className="truncate whitespace-nowrap">{positiveLabel}</span>
                            </div>
                          </div>
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
