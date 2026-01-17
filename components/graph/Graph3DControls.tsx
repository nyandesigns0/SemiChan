"use client";

import { useRef, useState } from "react";
import { Rotate3d, Grid3X3, Box, CircleDot, CircleOff, RefreshCcw, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
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
  turntableSpeed?: number;
  onTurntableSpeedChange?: (speed: number) => void;
  showJurorNodes?: boolean;
  onShowJurorNodesChange?: (show: boolean) => void;
  showConceptNodes?: boolean;
  onShowConceptNodesChange?: (show: boolean) => void;
  showDesignerNodes?: boolean;
  onShowDesignerNodesChange?: (show: boolean) => void;
  showJurorConceptLinks?: boolean;
  onShowJurorConceptLinksChange?: (show: boolean) => void;
  showJurorJurorLinks?: boolean;
  onShowJurorJurorLinksChange?: (show: boolean) => void;
  showConceptConceptLinks?: boolean;
  onShowConceptConceptLinksChange?: (show: boolean) => void;
}

type HoverControl = "turntable" | "reset" | "nodes" | "ai";

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
  turntableSpeed,
  onTurntableSpeedChange,
  showJurorNodes,
  onShowJurorNodesChange,
  showConceptNodes,
  onShowConceptNodesChange,
  showDesignerNodes,
  onShowDesignerNodesChange,
  showJurorConceptLinks,
  onShowJurorConceptLinksChange,
  showJurorJurorLinks,
  onShowJurorJurorLinksChange,
  showConceptConceptLinks,
  onShowConceptConceptLinksChange,
}: Graph3DControlsProps) {
  const axisColors = getAxisColors(numDimensions);
  const [axisPanelOpen, setAxisPanelOpen] = useState(false);
  const [hoveredControl, setHoveredControl] = useState<HoverControl | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const axisLabelsMap = axisLabels ?? {};
  const showAxisPanel = Boolean(axisLabels);
  const aiBoostActive = enableAxisLabelAI && autoSynthesize && showAxes;
  const turntableSpeedValue = typeof turntableSpeed === "number" ? turntableSpeed : 0.6;
  const nodeLinkControls = [
    { label: "Concept Nodes", value: showConceptNodes, onChange: onShowConceptNodesChange },
    { label: "Juror Nodes", value: showJurorNodes, onChange: onShowJurorNodesChange },
    { label: "Designer Nodes", value: showDesignerNodes, onChange: onShowDesignerNodesChange },
    { label: "Juror-Concept Links", value: showJurorConceptLinks, onChange: onShowJurorConceptLinksChange },
    { label: "Juror-Juror Links", value: showJurorJurorLinks, onChange: onShowJurorJurorLinksChange },
    { label: "Concept-Concept Links", value: showConceptConceptLinks, onChange: onShowConceptConceptLinksChange },
  ].filter(
    (control): control is { label: string; value: boolean; onChange?: (show: boolean) => void } =>
      typeof control.value === "boolean"
  );
  const hasTurntablePanel = typeof onTurntableSpeedChange === "function";
  const hasNodePanel = nodeLinkControls.length > 0;
  const showAIPanel = enableAxisLabelAI && typeof onRefreshAxisLabels === "function";
  const panelBaseClass =
    "absolute left-full top-1/2 z-20 ml-2 -translate-y-1/2 transform transition-all duration-300 ease-in-out";
  const panelHiddenClass = "-translate-x-2 scale-95 opacity-0 pointer-events-none";
  const panelVisibleClass = "translate-x-0 scale-100 opacity-100 pointer-events-auto";
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
    const shouldEnable = !aiBoostActive;
    if (onToggleAxisLabelAI) onToggleAxisLabelAI(shouldEnable);
    if (onToggleAutoSynthesize) onToggleAutoSynthesize(shouldEnable);
    if (shouldEnable && !showAxes) onToggleAxes();
  };

  const handleHover = (control: HoverControl | null) => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    setHoveredControl(control);
  };

  const handleHoverLeave = () => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
    }
    hoverTimeout.current = setTimeout(() => setHoveredControl(null), 120);
  };

  return (
    <>
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2">
        {onToggleTurntable && (
          <div
            className="relative"
            onMouseEnter={() => handleHover("turntable")}
            onMouseLeave={handleHoverLeave}
          >
            <Button
              variant={turntableEnabled ? "default" : "outline"}
              className={`h-9 w-9 rounded-lg p-0 shadow-md backdrop-blur-sm ${
                turntableEnabled ? "bg-slate-800 hover:bg-slate-700" : "bg-white/90 hover:bg-white"
              }`}
              onClick={onToggleTurntable}
              title={turntableEnabled ? "Stop turntable" : "Start turntable"}
            >
              <Rotate3d className={`h-4 w-4 ${turntableEnabled ? "text-white" : "text-slate-700"}`} />
            </Button>

            {hasTurntablePanel && (
              <div
                className={cn(
                  panelBaseClass,
                  hoveredControl === "turntable" ? panelVisibleClass : panelHiddenClass
                )}
                onMouseEnter={() => handleHover("turntable")}
                onMouseLeave={handleHoverLeave}
              >
                <div className="w-40 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                    <span>Turntable</span>
                    <span className="tabular-nums text-[10px] text-slate-500">
                      {turntableSpeedValue.toFixed(1)}x
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                      <span>Speed</span>
                      <span className="tabular-nums">{turntableSpeedValue.toFixed(1)}</span>
                    </div>
                    <Slider
                      value={[turntableSpeedValue]}
                      min={0}
                      max={2}
                      step={0.1}
                      onValueChange={(v) => onTurntableSpeedChange?.(Number(v[0]))}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div
          className="relative"
          onMouseEnter={() => handleHover("reset")}
          onMouseLeave={handleHoverLeave}
        >
          <Button
            variant="outline"
            className="h-9 w-9 rounded-lg bg-white/90 p-0 shadow-md backdrop-blur-sm hover:bg-white"
            onClick={onResetCamera}
            title="Reset camera view"
          >
            <RefreshCcw className="h-4 w-4 text-slate-700" />
          </Button>
        </div>

        <div
          className="relative"
          onMouseEnter={() => handleHover("nodes")}
          onMouseLeave={handleHoverLeave}
        >
          <Button
            variant={showGraph ? "default" : "outline"}
            className={`h-9 w-9 rounded-lg p-0 shadow-md backdrop-blur-sm ${
              showGraph ? "bg-slate-800 hover:bg-slate-700" : "bg-white/90 hover:bg-white"
            }`}
            onClick={onToggleGraph}
            title={showGraph ? "Hide nodes" : "Show nodes"}
          >
            {showGraph ? (
              <CircleDot className="h-4 w-4 text-white" />
            ) : (
              <CircleOff className="h-4 w-4 text-slate-700" />
            )}
          </Button>

          {hasNodePanel && (
            <div
              className={cn(panelBaseClass, hoveredControl === "nodes" ? panelVisibleClass : panelHiddenClass)}
              onMouseEnter={() => handleHover("nodes")}
              onMouseLeave={handleHoverLeave}
            >
              <div className="w-48 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Visibility
                </div>
                <div className="mt-2 flex flex-col gap-2">
                  {nodeLinkControls.map((control) => (
                    <label
                      key={control.label}
                      className="flex items-center justify-between gap-3 rounded-md px-1 py-1 text-[11px] font-semibold text-slate-700"
                    >
                      <span className="text-slate-700">{control.label}</span>
                      <Switch
                        checked={control.value}
                        onCheckedChange={(checked) => control.onChange?.(checked)}
                        disabled={!control.onChange}
                        className="scale-90"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div
          className="relative"
          onMouseEnter={() => handleHover(null)}
          onMouseLeave={handleHoverLeave}
        >
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

        <div
          className="relative"
          onMouseEnter={() => handleHover(null)}
          onMouseLeave={handleHoverLeave}
        >
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

        <div
          className="relative"
          onMouseEnter={() => handleHover("ai")}
          onMouseLeave={handleHoverLeave}
        >
          <Button
            variant="outline"
            className={cn(
              "h-9 w-9 rounded-lg p-0 shadow-md backdrop-blur-sm transition-all",
              aiBoostActive
                ? "bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white hover:from-amber-500 hover:via-orange-600 hover:to-rose-600"
                : "bg-gradient-to-br from-amber-200/80 via-orange-300/80 to-rose-300/80 text-white hover:from-amber-300/90 hover:via-orange-400/90 hover:to-rose-400/90"
            )}
            onClick={handleAIBoost}
            title={aiBoostActive ? "Disable AI insights" : "Enable AI insights"}
            aria-label={aiBoostActive ? "Disable AI insights" : "Enable AI insights"}
          >
            <Sparkles className="h-4 w-4" />
          </Button>

          {showAIPanel && (
            <div
              className={cn(
                panelBaseClass,
                "top-0 -translate-y-2",
                hoveredControl === "ai" ? panelVisibleClass : panelHiddenClass
              )}
              onMouseEnter={() => handleHover("ai")}
              onMouseLeave={handleHoverLeave}
            >
              <div className="w-36 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">AI</div>
                <div className="mt-2 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    className="h-8 w-full justify-between rounded-md border-slate-200 px-2 text-[12px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    onClick={onRefreshAxisLabels}
                    disabled={isRefreshingAxisLabels}
                  >
                    <span>Redo API Call</span>
                    <RefreshCcw className={cn("h-4 w-4", isRefreshingAxisLabels && "animate-spin")} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
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
              <div className="pr-2">
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
                      <div key={axisIdx} className="space-y-2">
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
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

