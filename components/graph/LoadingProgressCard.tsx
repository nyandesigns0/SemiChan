"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils/cn";

interface LoadingProgressCardProps {
  title: string;
  step: string;
  progress: number;
  className?: string;
  allowClose?: boolean;
  onClose?: () => void;
}

const PROGRESS_STOPS = ["#ef4444", "#f59e0b", "#fbbf24", "#34d399"];

function getProgressGradient(progress: number) {
  const ratio = progress / 100;
  const segments = PROGRESS_STOPS.length - 1;
  const idx = Math.min(segments - 1, Math.floor(ratio * segments));
  const localT = ratio * segments - idx;

  const hexToRgb = (hex: string) => {
    const n = hex.replace("#", "");
    return {
      r: parseInt(n.slice(0, 2), 16),
      g: parseInt(n.slice(2, 4), 16),
      b: parseInt(n.slice(4, 6), 16),
    };
  };
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

  const start = hexToRgb(PROGRESS_STOPS[idx]);
  const end = hexToRgb(PROGRESS_STOPS[idx + 1]);
  const mix = {
    r: lerp(start.r, end.r, localT),
    g: lerp(start.g, end.g, localT),
    b: lerp(start.b, end.b, localT),
  };

  return `linear-gradient(90deg, ${PROGRESS_STOPS[idx]} 0%, rgb(${mix.r}, ${mix.g}, ${mix.b}) 50%, ${PROGRESS_STOPS[idx + 1]} 100%)`;
}

export function LoadingProgressCard({
  title,
  step,
  progress,
  className,
  allowClose = false,
  onClose,
}: LoadingProgressCardProps) {
  const clampedProgress = useMemo(() => Math.min(100, Math.max(0, progress)), [progress]);
  const gradient = useMemo(() => getProgressGradient(clampedProgress), [clampedProgress]);

  return (
    <div className={cn("w-full max-w-2xl rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl", className)}>
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
        <span>{title}</span>
        {allowClose && onClose && (
          <button
            type="button"
            className="group rounded-full p-1.5 text-slate-400 transition-all hover:scale-105 hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
          >
            <span className="block text-base leading-none">A-</span>
          </button>
        )}
      </div>
      <div className="mt-3 relative h-16 overflow-hidden rounded-2xl bg-slate-100">
        <div
          className="absolute inset-0 rounded-2xl transition-all duration-500"
          style={{
            width: `${clampedProgress}%`,
            backgroundImage: gradient,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-between px-5 text-sm font-semibold text-slate-900">
          <span className="text-sm font-semibold text-slate-900">{step}</span>
          <span className="text-base font-bold">
            {Math.round(clampedProgress)}%
          </span>
        </div>
      </div>
    </div>
  );
}
