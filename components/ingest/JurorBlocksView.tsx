"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tag, MessageSquare } from "lucide-react";
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
          {blocks.length} {blocks.length === 1 ? "juror" : "jurors"}
        </Badge>
      </div>
      <ScrollArea className="h-[400px] rounded-lg border border-slate-200 bg-white">
        <div className="p-3">
          {blocks.map((b, idx) => (
            <div key={b.juror} className={idx !== blocks.length - 1 ? "mb-6 pb-6 border-b border-slate-100" : "mb-2"}>
              <div className="flex items-center gap-2 mb-3">
                <div className="font-bold text-slate-900">{b.juror}</div>
                <Badge variant="secondary" className="font-bold text-[10px] bg-slate-100">
                  {b.comments.length} {b.comments.length === 1 ? "comment" : "comments"}
                </Badge>
              </div>
              <div className="space-y-3">
                {b.comments.map((comment) => (
                  <div key={comment.id} className="bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {comment.tags.map(t => (
                        <Badge key={t} variant="outline" className="text-[9px] py-0 px-1.5 border-indigo-100 text-indigo-600 bg-white">
                          <Tag className="h-2 w-2 mr-1" />
                          {t}
                        </Badge>
                      ))}
                      {comment.tags.length === 0 && (
                        <span className="text-[9px] text-slate-400 italic">No tags</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed italic">"{comment.text}"</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
