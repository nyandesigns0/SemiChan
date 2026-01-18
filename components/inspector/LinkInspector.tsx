"use client";

import { Link2, Info, MessageSquare, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { stanceColor } from "@/lib/utils/stance-utils";
import type { GraphLink } from "@/types/graph";
import type { SentenceRecord } from "@/types/analysis";

interface LinkInspectorProps {
  link: GraphLink;
  evidence: SentenceRecord[];
}

export function LinkInspector({ link, evidence }: LinkInspectorProps) {
  return (
    <Tabs defaultValue="properties" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-4">
        <TabsTrigger value="properties" className="text-[10px] uppercase font-bold">
          <Info className="h-3 w-3 mr-1.5" />
          Properties
        </TabsTrigger>
        <TabsTrigger value="evidence" className="text-[10px] uppercase font-bold">
          <MessageSquare className="h-3 w-3 mr-1.5" />
          Evidence
        </TabsTrigger>
      </TabsList>

      <TabsContent value="properties" className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Connection</div>
              <div className="mt-1 text-sm font-bold text-slate-700 flex items-center gap-2">
                {String(link.source)} <Link2 className="h-3.5 w-3.5 text-slate-400" /> {String(link.target)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Strength</div>
              <Badge variant="secondary" className="mt-1 bg-slate-100 text-slate-700 font-bold">
                {link.weight.toFixed(2)}
              </Badge>
            </div>
          </div>

          {link.kind === "jurorConcept" && (
            <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sentiment Stance</div>
              <Badge
                variant="outline"
                className="font-bold px-3 py-1 text-xs"
                style={{ 
                  borderColor: `${stanceColor(link.stance)}40`, 
                  color: stanceColor(link.stance),
                  backgroundColor: `${stanceColor(link.stance)}08`
                }}
              >
                {link.stance}
              </Badge>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="evidence" className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">Evidence Excerpts</h3>
            <Badge variant="outline" className="text-[9px] font-medium text-slate-400">{evidence.length} items</Badge>
          </div>
          {evidence.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-100 text-slate-400">
              <p className="text-xs font-medium">No stored evidence for this edge.</p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-3">
              <div className="space-y-2">
                {evidence.map((ev) => (
                  <div key={ev.id} className="rounded-xl border border-slate-100 p-3 bg-slate-50/30">
                    <div className="mb-2 flex items-center justify-between">
                      <Badge variant="secondary" className="bg-white text-[9px] font-bold uppercase tracking-wider text-slate-500 border-slate-200">
                        {ev.juror}
                      </Badge>
                      {ev.sourceTags && ev.sourceTags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-[9px] border-indigo-100 text-indigo-600 font-bold bg-indigo-50/50">
                          <Tag className="h-2 w-2 mr-1" />
                          {tag}
                        </Badge>
                      ))}
                      <Badge
                        variant="outline"
                        className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5"
                        style={{ 
                          borderColor: `${stanceColor(ev.stance)}40`, 
                          color: stanceColor(ev.stance),
                          backgroundColor: `${stanceColor(ev.stance)}08`
                        }}
                      >
                        {ev.stance}
                      </Badge>
                    </div>
                    <div className="text-xs leading-relaxed text-slate-600 font-medium italic">"{ev.sentence}"</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
          <p className="mt-3 text-[9px] text-slate-400 font-medium italic">
            Traceable excerpts justify this relationship.
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
