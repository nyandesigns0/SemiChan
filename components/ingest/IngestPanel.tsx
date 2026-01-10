"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, FileUp, Type, Users } from "lucide-react";
import { parsePdf } from "@/lib/pdf/pdf-parser";
import { normalizeWhitespace } from "@/lib/utils/text-utils";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { JurorBlock } from "@/types/nlp";
import { FileUploader } from "./FileUploader";
import { TextInput } from "./TextInput";
import { JurorBlocksView } from "./JurorBlocksView";

interface IngestPanelProps {
  rawText: string;
  onTextChange: (text: string) => void;
  jurorBlocks: JurorBlock[];
}

export function IngestPanel({ rawText, onTextChange, jurorBlocks }: IngestPanelProps) {
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"paste" | "blocks">("paste");

  async function handleFile(file: File): Promise<void> {
    setIngestError(null);
    setLoading(true);
    try {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const text = await parsePdf(file);
        onTextChange(text);
      } else {
        const text = await file.text();
        onTextChange(normalizeWhitespace(text));
      }
    } catch (e: unknown) {
      setIngestError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const jurorCount = jurorBlocks.filter((b) => b.juror !== "Unattributed").length;

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
        <div className="space-y-4 border-t border-slate-100 p-4">
          <FileUploader onFileSelect={handleFile} loading={loading} />

          {ingestError && (
            <Alert className="rounded-xl border-red-100 bg-red-50 text-red-800">
              <AlertTitle className="font-bold">Ingest error</AlertTitle>
              <AlertDescription>{ingestError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="flex rounded-xl bg-slate-100/80 p-1 gap-1 border border-slate-200/50">
              <button
                onClick={() => setActiveTab("paste")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all",
                  activeTab === "paste" 
                    ? "bg-white text-indigo-600 shadow-md ring-2 ring-indigo-500/10 border border-indigo-100 scale-[1.01]" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                )}
              >
                <Type className="h-4 w-4" />
                Paste Text
              </button>
              <button
                onClick={() => setActiveTab("blocks")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-all",
                  activeTab === "blocks" 
                    ? "bg-white text-indigo-600 shadow-md ring-2 ring-indigo-500/10 border border-indigo-100 scale-[1.01]" 
                    : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                )}
              >
                <Users className="h-4 w-4" />
                Juror Blocks
              </button>
            </div>

            <div className="min-h-[200px]">
              {activeTab === "paste" ? (
                <TextInput value={rawText} onChange={onTextChange} jurorCount={jurorCount} />
              ) : (
                <JurorBlocksView blocks={jurorBlocks} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

