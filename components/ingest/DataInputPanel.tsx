"use client";

import { useState } from "react";
import type { DesignerBlock, JurorBlock } from "@/types/nlp";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DesignerAnalysisControls } from "@/components/controls/DesignerAnalysisControls";
import { JurorBlocksView } from "./JurorBlocksView";
import { ChevronDown, ChevronUp, FileUp, PenSquare, Settings2, Upload, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";

interface DataInputPanelProps {
  jurorBlocks: JurorBlock[];
  onOpenJurorModal: () => void;
  ingestError?: string | null;
  onOpenDesignerModal: () => void;
  designerBlocks: DesignerBlock[];
  onDesignerBlocksChange: (blocks: DesignerBlock[]) => void;
  designerKConcepts: number;
  onDesignerKConceptsChange: (v: number) => void;
  designerLoading?: boolean;
  onAnalyzeDesigner: () => void;
}

export function DataInputPanel({
  jurorBlocks,
  onOpenJurorModal,
  ingestError,
  onOpenDesignerModal,
  designerBlocks,
  onDesignerBlocksChange,
  designerKConcepts,
  onDesignerKConceptsChange,
  designerLoading,
  onAnalyzeDesigner,
}: DataInputPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showJurorBlocks, setShowJurorBlocks] = useState(false);
  const [showDesignerRefine, setShowDesignerRefine] = useState(false);

  const removeDesignerBlock = (idx: number) => {
    onDesignerBlocksChange(designerBlocks.filter((_, i) => i !== idx));
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <FileUp className="h-5 w-5" />
            </div>
            <span className="font-bold text-slate-800">Data Input</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </button>

        {isExpanded && (
          <div className="border-t border-slate-100 p-3 pt-2">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-900">
                  <Users className="h-3 w-3" />
                  Jurors
                </Label>

                <Button
                  onClick={onOpenJurorModal}
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

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-900">
                  <PenSquare className="h-3 w-3" />
                  Designer Input
                </Label>

                <Button
                  onClick={onOpenDesignerModal}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-all hover:shadow-md py-2.5"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload or Paste Data
                </Button>

                <div className="space-y-2">
                  <button
                    onClick={() => setShowDesignerRefine(!showDesignerRefine)}
                    className="flex w-full items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-emerald-500 transition-colors py-0.5 px-1 border-b border-dashed border-slate-200"
                  >
                    <div className="flex items-center gap-1.5">
                      <Settings2 className="h-3 w-3" />
                      Review & Tune Inputs
                    </div>
                    {showDesignerRefine ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  {showDesignerRefine && (
                    <div className="pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-2.5 space-y-3">
                        <div className="space-y-2">
                          {designerBlocks.map((block, idx) => (
                            <div key={`${block.designer}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                              <div className="mb-2 flex items-center justify-between">
                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                                  {block.designer}
                                </Badge>
                                <Button variant="ghost" onClick={() => removeDesignerBlock(idx)} className="h-8 w-8 p-0">
                                  <Trash2 className="h-4 w-4 text-slate-400 mx-auto" />
                                </Button>
                              </div>
                              {block.text && <p className="text-xs text-slate-700">{block.text}</p>}
                              {block.images?.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {block.images.map((img) => (
                                    <div key={img.id} className="h-16 w-16 overflow-hidden rounded-md border border-slate-100">
                                      <img src={img.data} alt={img.id} className="h-full w-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                          {designerBlocks.length === 0 && (
                            <p className="text-[11px] text-slate-500">No designer inputs yet.</p>
                          )}
                        </div>

                        <DesignerAnalysisControls
                          kConcepts={designerKConcepts}
                          onKConceptsChange={onDesignerKConceptsChange}
                          loading={designerLoading}
                          onAnalyze={onAnalyzeDesigner}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
}
