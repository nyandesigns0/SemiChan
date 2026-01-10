"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronDown, ChevronUp, FileUp, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { JurorBlock } from "@/types/nlp";
import { JurorBlocksView } from "./JurorBlocksView";

interface IngestPanelProps {
  rawText: string;
  onTextChange: (text: string) => void;
  jurorBlocks: JurorBlock[];
  onOpenModal: () => void;
  ingestError?: string | null;
}

export function IngestPanel({ rawText, onTextChange, jurorBlocks, onOpenModal, ingestError }: IngestPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

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
        <div className="border-t border-slate-100">
          <div className="p-4">
            <Button
              onClick={onOpenModal}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition-all hover:shadow-md py-2.5"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload or Paste Data
            </Button>

            {ingestError && (
              <Alert className="rounded-xl border-red-200 bg-red-50 text-red-800 mt-4">
                <AlertTitle className="font-bold">Ingest error</AlertTitle>
                <AlertDescription>{ingestError}</AlertDescription>
              </Alert>
            )}
          </div>

          <div className="border-t border-slate-100 p-4 bg-slate-50/50">
            <JurorBlocksView blocks={jurorBlocks} />
          </div>
        </div>
      )}
    </div>
  );
}

