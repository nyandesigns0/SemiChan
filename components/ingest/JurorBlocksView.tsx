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
  return (
    <>
      <ScrollArea className="h-[290px] rounded-xl border bg-white">
        <div className="p-3">
          {blocks.map((b) => (
            <div key={b.juror} className="mb-3">
              <div className="flex items-center justify-between">
                <div className="font-medium">{b.juror}</div>
                <Badge variant="secondary" className="font-normal">
                  {sentenceSplit(b.text).length} sentences
                </Badge>
              </div>
              <div className="mt-1 text-xs text-slate-600 line-clamp-3">{b.text}</div>
              <Separator className="mt-2" />
            </div>
          ))}
        </div>
      </ScrollArea>
      <p className="mt-2 text-xs text-slate-600">
        If juror detection is off, edit the raw text so juror names appear as standalone lines.
      </p>
    </>
  );
}

