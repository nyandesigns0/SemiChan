"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { sentenceSplit } from "@/lib/nlp/sentence-splitter";
import type { JurorBlock } from "@/types/nlp";

interface JurorBlocksViewProps {
  blocks: JurorBlock[];
}

export function JurorBlocksView({ blocks }: JurorBlocksViewProps) {
  if (blocks.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        No juror blocks detected. Upload or paste data to begin.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-700">Juror Review</h3>
        <Badge variant="outline" className="text-xs">
          {blocks.length} {blocks.length === 1 ? "block" : "blocks"}
        </Badge>
      </div>
      <ScrollArea className="h-[400px] rounded-lg border border-slate-200 bg-white">
        <div className="p-3">
          {blocks.map((b, idx) => (
            <div key={b.juror} className={idx !== blocks.length - 1 ? "mb-4 pb-4 border-b border-slate-100" : "mb-2"}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="font-semibold text-slate-900">{b.juror}</div>
                <Badge variant="secondary" className="font-normal text-xs">
                  {sentenceSplit(b.text).length} {sentenceSplit(b.text).length === 1 ? "sentence" : "sentences"}
                </Badge>
              </div>
              <div className="text-sm text-slate-600 line-clamp-3 leading-relaxed">{b.text}</div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
