"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

interface CollapsibleSidebarProps {
  side: "left" | "right";
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  width?: number;
  className?: string;
  disableOutsideClick?: boolean;
}

export function CollapsibleSidebar({
  side,
  isOpen,
  onToggle,
  children,
  width = 320,
  className,
  disableOutsideClick = false,
}: CollapsibleSidebarProps) {
  const [isMounted, setIsMounted] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Click outside to close
  useEffect(() => {
    if (!isOpen || disableOutsideClick) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        onToggle();
      }
    };

    // Add listener with slight delay to avoid immediate trigger
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onToggle, disableOutsideClick]);

  const isLeft = side === "left";
  const translateX = isOpen ? 0 : isLeft ? `-${width}px` : `${width}px`;

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpen && !disableOutsideClick && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}

      {/* Toggle button - always visible as vertical bar */}
      <button
        ref={buttonRef}
        className="fixed top-[48px] z-[60] h-8 w-1 min-h-10 min-w-4 bg-slate-900 border-none text-white transition-all duration-300 hover:h-12 hover:w-8 hover:bg-slate-700 active:bg-slate-800 flex items-center justify-center group"
        style={
          isMounted
            ? isLeft
              ? isOpen
                ? { left: `${width}px` }
                : { left: "0px" }
              : isOpen
                ? { right: `${width}px` }
                : { right: "0px" }
            : {}
        }
        onClick={onToggle}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        title={isOpen ? "Close sidebar" : "Open sidebar"}
      >
        {isLeft ? (
          isOpen ? (
            <ChevronLeft className="h-4 w-4 text-white opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
          ) : (
            <ChevronRight className="h-4 w-4 text-white opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
          )
        ) : isOpen ? (
          <ChevronRight className="h-4 w-4 text-white opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-white opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={cn(
          "fixed top-0 z-50 h-screen bg-white shadow-2xl ring-1 ring-slate-200 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
          isLeft ? "left-0" : "right-0",
          className
        )}
        style={{
          width: `${width}px`,
          transform: isMounted ? `translateX(${translateX})` : `translateX(${translateX})`,
        }}
      >
        {/* Sidebar content container - Scrollable */}
        <div className="h-full overflow-y-auto overflow-x-hidden scrollbar-hide focus:outline-none">
          <div className="min-h-full p-8">{children}</div>
        </div>
      </aside>
    </>
  );
}
