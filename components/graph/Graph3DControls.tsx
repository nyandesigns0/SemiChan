"use client";

import { RotateCcw, Grid3X3, Box } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Graph3DControlsProps {
  showGrid: boolean;
  onToggleGrid: () => void;
  showAxes: boolean;
  onToggleAxes: () => void;
  onResetCamera: () => void;
}

export function Graph3DControls({
  showGrid,
  onToggleGrid,
  showAxes,
  onToggleAxes,
  onResetCamera,
}: Graph3DControlsProps) {
  return (
    <div className="absolute bottom-4 left-4 flex flex-col gap-2 z-10">
      <Button
        variant="outline"
        className="h-9 w-9 rounded-lg bg-white/90 p-0 shadow-md backdrop-blur-sm hover:bg-white"
        onClick={onResetCamera}
        title="Reset camera view"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
      
      <Button
        variant={showGrid ? "default" : "outline"}
        className={`h-9 w-9 rounded-lg p-0 shadow-md backdrop-blur-sm ${
          showGrid ? "bg-slate-800 hover:bg-slate-700" : "bg-white/90 hover:bg-white"
        }`}
        onClick={onToggleGrid}
        title="Toggle grid"
      >
        <Grid3X3 className="h-4 w-4" />
      </Button>
      
      <Button
        variant={showAxes ? "default" : "outline"}
        className={`h-9 w-9 rounded-lg p-0 shadow-md backdrop-blur-sm ${
          showAxes ? "bg-slate-800 hover:bg-slate-700" : "bg-white/90 hover:bg-white"
        }`}
        onClick={onToggleAxes}
        title="Toggle axes"
      >
        <Box className="h-4 w-4" />
      </Button>
    </div>
  );
}
