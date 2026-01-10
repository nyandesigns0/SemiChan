"use client";

import { Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { stanceColor } from "@/lib/utils/stance-utils";
import type { GraphLink } from "@/types/graph";
import type { SentenceRecord } from "@/types/analysis";

interface LinkInspectorProps {
  link: GraphLink;
  evidence: SentenceRecord[];
}

export function LinkInspector({ link, evidence }: LinkInspectorProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">Selected edge</div>
          <div className="mt-1 text-sm font-semibold leading-tight">
            {String(link.source)} <Link2 className="inline h-4 w-4" /> {String(link.target)}
          </div>
        </div>
        <Badge variant="outline" className="font-normal">
          w={link.weight.toFixed(2)}
        </Badge>
      </div>

      {link.kind === "jurorConcept" && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-normal">
            stance
          </Badge>
          <Badge
            variant="outline"
            className="font-normal"
            style={{ borderColor: stanceColor(link.stance), color: stanceColor(link.stance) }}
          >
            {link.stance}
          </Badge>
        </div>
      )}

      <div className="rounded-xl border bg-white p-3">
        <div className="mb-2 text-sm font-medium">Evidence excerpts</div>
        {evidence.length === 0 ? (
          <div className="text-sm text-slate-600">No stored evidence for this edge.</div>
        ) : (
          <ScrollArea className="h-[340px]">
            <div className="space-y-2">
              {evidence.map((ev) => (
                <div key={ev.id} className="rounded-xl border p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <Badge variant="secondary" className="font-normal">
                      {ev.juror}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="font-normal"
                      style={{ borderColor: stanceColor(ev.stance), color: stanceColor(ev.stance) }}
                    >
                      {ev.stance}
                    </Badge>
                  </div>
                  <div className="text-sm leading-relaxed">{ev.sentence}</div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        <p className="mt-2 text-xs text-slate-600">
          This is the explainability layer: every edge should be justified by excerpts.
        </p>
      </div>
    </>
  );
}

