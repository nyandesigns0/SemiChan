"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronDown, ChevronUp, FileUp, Settings2, Upload, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { JurorBlock } from "@/types/nlp";
import { JurorBlocksView } from "./JurorBlocksView";

interface IngestPanelProps {
  onOpenModal: () => void;
  ingestError?: string | null;
  jurorBlocks: JurorBlock[];
}

export function IngestPanel({ onOpenModal, ingestError, jurorBlocks }: IngestPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showJurorBlocks, setShowJurorBlocks] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
            <FileUp className="h-5 w-5" />
          </div>
          <span className="font-bold text-slate-800">Data Ingest</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100 p-3 pt-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-900">
                <Users className="h-3 w-3" />
                Jurors
              </Label>

              <Button
                onClick={onOpenModal}
                className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition-all hover:shadow-md py-2.5"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload or Paste Data
              </Button>

              {ingestError && (
                <Alert className="rounded-xl border-red-200 bg-red-50 text-red-800">
                  <AlertTitle className="font-bold">Ingest error</AlertTitle>
                  <AlertDescription>{ingestError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => setShowJurorBlocks(!showJurorBlocks)}
                  className="flex w-full items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-indigo-500 transition-colors py-0.5 px-1 border-b border-dashed border-slate-200"
                >
                  <div className="flex items-center gap-1.5">
                    <Settings2 className="h-3 w-3" />
                    Refine Juror Blocks
                  </div>
                  {showJurorBlocks ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>

                {showJurorBlocks && (
                  <div className="pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-2.5">
                      <JurorBlocksView blocks={jurorBlocks} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
