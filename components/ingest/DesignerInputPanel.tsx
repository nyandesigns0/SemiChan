"use client";

import { useState } from "react";
import type { DesignerBlock } from "@/types/nlp";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { DesignerAnalysisControls } from "@/components/controls/DesignerAnalysisControls";
import { DesignerIngestModal } from "./DesignerIngestModal";
import { ChevronDown, ChevronUp, PenSquare, Settings2, Trash2 } from "lucide-react";

interface DesignerInputPanelProps {
  blocks: DesignerBlock[];
  onChange: (blocks: DesignerBlock[]) => void;
  kConcepts: number;
  onKConceptsChange: (v: number) => void;
  loading?: boolean;
  onAnalyze: () => void;
}

export function DesignerInputPanel({
  blocks,
  onChange,
  kConcepts,
  onKConceptsChange,
  loading,
  onAnalyze,
}: DesignerInputPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRefine, setShowRefine] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const addBlock = (block: DesignerBlock) => {
    onChange([...blocks, block]);
  };

  const removeBlock = (idx: number) => {
    const updated = blocks.filter((_, i) => i !== idx);
    onChange(updated);
  };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
              <PenSquare className="h-5 w-5" />
            </div>
            <span className="font-bold text-slate-800">Designer Input</span>
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
                  <PenSquare className="h-3 w-3" />
                  Designer Input
                </Label>

                <Button
                  onClick={() => setModalOpen(true)}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-all hover:shadow-md py-2.5"
                >
                  Upload Designer Input
                </Button>

                <div className="space-y-2">
                  <button
                    onClick={() => setShowRefine(!showRefine)}
                    className="flex w-full items-center justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 hover:text-emerald-500 transition-colors py-0.5 px-1 border-b border-dashed border-slate-200"
                  >
                    <div className="flex items-center gap-1.5">
                      <Settings2 className="h-3 w-3" />
                      Review & Tune Inputs
                    </div>
                    {showRefine ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>

                  {showRefine && (
                    <div className="pt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-2.5 space-y-3">
                        <div className="space-y-2">
                          {blocks.map((block, idx) => (
                            <div key={`${block.designer}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                              <div className="mb-2 flex items-center justify-between">
                                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                                  {block.designer}
                                </Badge>
                                <Button variant="ghost" onClick={() => removeBlock(idx)} className="h-8 w-8 p-0">
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
                          {blocks.length === 0 && (
                            <p className="text-[11px] text-slate-500">No designer inputs yet.</p>
                          )}
                        </div>

                        <DesignerAnalysisControls
                          kConcepts={kConcepts}
                          onKConceptsChange={onKConceptsChange}
                          loading={loading}
                          onAnalyze={onAnalyze}
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

      <DesignerIngestModal open={modalOpen} onOpenChange={setModalOpen} onAddBlock={addBlock} />
    </>
  );
}
