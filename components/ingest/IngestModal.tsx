"use client";

import { useState } from "react";
import { Upload, Type } from "lucide-react";
import { parsePdf } from "@/lib/pdf/pdf-parser";
import { normalizeWhitespace } from "@/lib/utils/text-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { JurorBlock } from "@/types/nlp";
import { FileUploaderWithDrop } from "./FileUploaderWithDrop";

interface IngestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rawText: string;
  onTextChange: (text: string) => void;
  jurorBlocks: JurorBlock[];
  onFileProcessed?: () => void;
}

export function IngestModal({
  open,
  onOpenChange,
  rawText,
  onTextChange,
  jurorBlocks,
  onFileProcessed,
}: IngestModalProps) {
  const [loading, setLoading] = useState(false);

  async function handleFile(file: File): Promise<void> {
    setLoading(true);
    try {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const text = await parsePdf(file);
        onTextChange(text);
        onOpenChange(false);
        onFileProcessed?.();
      } else {
        const text = await file.text();
        onTextChange(normalizeWhitespace(text));
        onOpenChange(false);
        onFileProcessed?.();
      }
    } catch (e: unknown) {
      console.error("Error processing file:", e);
    } finally {
      setLoading(false);
    }
  }

  const jurorCount = jurorBlocks.filter((b) => b.juror !== "Unattributed").length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
          <DialogTitle className="text-xl font-bold">Upload or Paste Data</DialogTitle>
          <DialogClose onClose={() => onOpenChange(false)} />
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-6 py-4">
          <Tabs defaultValue="upload" className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="upload" className="flex-1">
                <Upload className="mr-2 h-4 w-4" />
                Upload PDF
              </TabsTrigger>
              <TabsTrigger value="paste" className="flex-1">
                <Type className="mr-2 h-4 w-4" />
                Paste Text
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="flex-1 overflow-auto mt-0">
              <FileUploaderWithDrop onFileSelect={handleFile} loading={loading} />
            </TabsContent>

            <TabsContent value="paste" className="flex-1 flex flex-col min-h-0 mt-0">
              <div className="flex-1 flex flex-col space-y-4 min-h-0">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-slate-700">Raw text</Label>
                  <Badge variant="outline" className="font-normal">
                    {jurorCount} jurors detected
                  </Badge>
                </div>
                <Textarea
                  value={rawText}
                  onChange={(e) => onTextChange(e.target.value)}
                  className="flex-1 min-h-[450px] rounded-xl font-mono text-sm resize-none"
                  placeholder="Paste your compiled jury comments here. Put juror names on their own lines."
                />
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <p className="text-xs text-slate-500">
                    Tip: Put each juror name on a separate line. The segmenter uses name-like headers to split blocks.
                  </p>
                  <Button
                    onClick={() => onOpenChange(false)}
                    className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}


