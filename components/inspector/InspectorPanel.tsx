"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { 
  Terminal, 
  Book, 
  ChevronDown, 
  ChevronUp, 
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { InspectorConsole, type LogEntry } from "./InspectorConsole";
import { SchemaExplanation } from "@/components/schema/SchemaExplanation";

interface InspectorPanelProps {
  logs: LogEntry[];
}

type TabType = "console" | "schema";

const MIN_HEIGHT = 40;
const DEFAULT_HEIGHT = 350;
const MAX_HEIGHT = 800;

export function InspectorPanel({
  logs,
}: InspectorPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("console");
  const [height, setHeight] = useState(MIN_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  // Resizing logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      const clampedHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, newHeight));
      setHeight(clampedHeight);
      if (clampedHeight < 60) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const toggleCollapse = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setHeight(DEFAULT_HEIGHT);
    } else {
      setIsCollapsed(true);
      setHeight(MIN_HEIGHT);
    }
  };

  return (
    <div
      ref={panelRef}
      className={cn(
        "flex flex-col border-t border-slate-200 bg-white transition-shadow duration-300",
        !isCollapsed && "shadow-[0_-8px_30px_rgb(0,0,0,0.04)]"
      )}
      style={{ height: isCollapsed ? `${MIN_HEIGHT}px` : `${height}px` }}
    >
      {/* Resizer Handle + Navigation Bar */}
      <div 
        className={cn(
          "group relative flex h-10 flex-shrink-0 items-center justify-between border-b border-slate-100 px-4 transition-colors",
          isResizing ? "bg-slate-50" : "bg-white hover:bg-slate-50/50"
        )}
      >
        {/* Resize trigger area */}
        <div 
          className="absolute inset-x-0 -top-1 h-2 cursor-row-resize transition-all group-hover:bg-blue-500/20"
          onMouseDown={handleMouseDown}
        />

        {/* Left Side: Tabs */}
        <div className="flex items-center gap-1">
          <TabButton
            active={activeTab === "console"}
            onClick={() => { setActiveTab("console"); setIsCollapsed(false); }}
            icon={<Terminal className="h-3.5 w-3.5" />}
            label="Console"
            count={logs.length}
          />
          <TabButton
            active={activeTab === "schema"}
            onClick={() => { setActiveTab("schema"); setIsCollapsed(false); }}
            icon={<Book className="h-3.5 w-3.5" />}
            label="Schema"
          />
        </div>

        {/* Center: Current Status (Visible when collapsed or for context) */}
        {isCollapsed && (
          <div className="flex flex-1 items-center justify-center px-4 overflow-hidden">
            <span className="truncate text-[10px] font-medium text-slate-400 uppercase tracking-tight">
              {activeTab === "console" ? "System Logs Active" : "Explainable NLP Schema"}
            </span>
          </div>
        )}

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleCollapse}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            {isCollapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Content Area */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden bg-slate-50/30">
          {activeTab === "console" && (
            <InspectorConsole
              logs={logs}
              isEmbedded={true}
            />
          )}

          {activeTab === "schema" && (
            <div className="h-full overflow-y-auto p-8 bg-white">
              <div className="mx-auto max-w-5xl">
                <SchemaExplanation />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}

function TabButton({ active, onClick, icon, label, count }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex h-8 items-center gap-2 rounded-lg px-3 transition-all",
        active 
          ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <span className={cn(active ? "text-white" : "text-slate-400 group-hover:text-slate-900")}>
        {icon}
      </span>
      <span className="text-xs font-bold tracking-tight">{label}</span>
      {typeof count === "number" && count > 0 && (
        <span className={cn(
          "ml-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-black",
          active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}
