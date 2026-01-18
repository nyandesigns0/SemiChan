"use client";

import type { CSSProperties } from "react";

import { useState, useEffect } from "react";
import Image from "next/image";

import LogoGraphic from "@/assets/logo/logo.png";

const DOT_COUNT = 28;
const DOT_PALETTE = ["#f59e0b", "#a855f7", "#ec4899", "#ef4444", "#10b981", "#3b82f6"];

type Dot = { id: string; delay: string; finalX: number; finalY: number; size: number; color: string };

function generateDots(): Dot[] {
  const dots: Dot[] = [];
  for (let i = 0; i < DOT_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 120 + Math.random() * 90;
    const finalX = Math.cos(angle) * radius;
    const finalY = Math.sin(angle) * radius;
    dots.push({
      id: `loader-dot-${i}`,
      delay: `${(Math.random() * 0.3).toFixed(2)}s`,
      finalX,
      finalY,
      size: 4 + Math.random() * 12,
      color: DOT_PALETTE[i % DOT_PALETTE.length],
    });
  }
  return dots;
}

export function LoadingScreen() {
  const [loaderDots, setLoaderDots] = useState<Dot[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only generate dots on the client after mount to avoid hydration mismatch
    setMounted(true);
    setLoaderDots(generateDots());
  }, []);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center bg-white text-slate-900">
      <div className="relative flex h-[280px] w-[280px] items-center justify-center">
        <div className="pointer-events-none absolute inset-0 rounded-full border border-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-[360px] w-[360px]">
            {mounted && loaderDots.map((dot) => (
              <span
                key={dot.id}
                style={
                  {
                    "--dot-x": `${dot.finalX}px`,
                    "--dot-y": `${dot.finalY}px`,
                    "--dot-delay": dot.delay,
                    "--dot-size": `${dot.size}px`,
                    "--dot-color": dot.color,
                  } as CSSProperties
                }
                className="loader-dot absolute left-1/2 top-1/2"
              />
            ))}
          </div>
        </div>
        <div className="relative z-10 h-32 w-32 logo-grow">
          <Image
            src={LogoGraphic}
            alt="Jury Concept Graph logo"
            priority
            className="h-full w-full object-contain"
            width={128}
            height={128}
          />
        </div>
      </div>
    </div>
  );
}
