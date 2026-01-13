"use client";

import { useMemo, useState } from "react";
import { ImagePlus, Type, Upload } from "lucide-react";
import { parsePdf } from "@/lib/pdf/pdf-parser";
import { normalizeWhitespace } from "@/lib/utils/text-utils";
import { handleFileUpload, loadImageFromUrl, validateImageUrl } from "@/lib/utils/image-upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { DesignerBlock, JurorBlock } from "@/types/nlp";
import { FileUploaderWithDrop } from "./FileUploaderWithDrop";

type IngestModalMode = "juror" | "designer";

interface IngestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: IngestModalMode;
  rawText?: string;
  onTextChange?: (text: string) => void;
  jurorBlocks?: JurorBlock[];
  onFileProcessed?: () => void;
  onAddDesignerBlock?: (block: DesignerBlock) => void;
}

export function IngestModal({
  open,
  onOpenChange,
  mode,
  rawText = "",
  onTextChange,
  jurorBlocks = [],
  onFileProcessed,
  onAddDesignerBlock,
}: IngestModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(mode === "designer" ? "pdf" : "upload");
  const [designerName, setDesignerName] = useState("");
  const [designerText, setDesignerText] = useState("");
  const [images, setImages] = useState<DesignerBlock["images"]>([]);
  const [imageUrl, setImageUrl] = useState("");

  const jurorCount = jurorBlocks.filter((b) => b.juror !== "Unattributed").length;
  const canSaveDesigner = designerText.trim().length > 0 || images.length > 0;
  const title = mode === "designer" ? "Upload Designer Input" : "Upload or Paste Data";

  const resetDesigner = () => {
    setDesignerName("");
    setDesignerText("");
    setImages([]);
    setImageUrl("");
    setActiveTab("pdf");
  };

  const handleClose = () => {
    onOpenChange(false);
    if (mode === "designer") {
      resetDesigner();
    }
  };

  async function handleFile(file: File): Promise<void> {
    setLoading(true);
    try {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const text = await parsePdf(file);
        if (mode === "designer") {
          setDesignerText(text);
          setActiveTab("text");
        } else {
          onTextChange?.(text);
          onOpenChange(false);
          onFileProcessed?.();
        }
      } else {
        const text = await file.text();
        const normalized = normalizeWhitespace(text);
        if (mode === "designer") {
          setDesignerText(normalized);
          setActiveTab("text");
        } else {
          onTextChange?.(normalized);
          onOpenChange(false);
          onFileProcessed?.();
        }
      }
    } catch (e: unknown) {
      console.error("Error processing file:", e);
    } finally {
      setLoading(false);
    }
  }

  const addImageFromUrl = async () => {
    if (!imageUrl.trim()) return;
    const ok = await validateImageUrl(imageUrl.trim());
    if (!ok) return;
    const loaded = await loadImageFromUrl(imageUrl.trim());
    setImages((prev) => [...prev, loaded]);
    setImageUrl("");
  };

  const handleImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const uploaded: DesignerBlock["images"] = [];
    for (const file of Array.from(files)) {
      const data = await handleFileUpload(file);
      uploaded.push(data);
    }
    setImages((prev) => [...prev, ...uploaded]);
  };

  const saveDesigner = () => {
    if (!canSaveDesigner) return;
    onAddDesignerBlock?.({
      designer: designerName.trim() || "Designer",
      text: designerText.trim(),
      images,
    });
    resetDesigner();
    onOpenChange(false);
  };

  const content = useMemo(() => {
    if (mode === "designer") {
      return (
        <>
          <div className="mb-4 space-y-2">
            <Label className="text-sm font-semibold text-slate-700">Designer name</Label>
            <Input
              value={designerName}
              onChange={(e) => setDesignerName(e.target.value)}
              placeholder="Designer / creator name"
              className="h-9"
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="pdf" className="flex-1">
                <Upload className="mr-2 h-4 w-4" />
                Upload PDF
              </TabsTrigger>
              <TabsTrigger value="text" className="flex-1">
                <Type className="mr-2 h-4 w-4" />
                Paste Text
              </TabsTrigger>
              <TabsTrigger value="images" className="flex-1">
                <ImagePlus className="mr-2 h-4 w-4" />
                Add Images
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pdf" className="flex-1 overflow-auto mt-0">
              <FileUploaderWithDrop onFileSelect={handleFile} loading={loading} />
              {designerText && (
                <p className="mt-3 text-xs text-slate-500">
                  Parsed {designerText.length.toLocaleString()} characters. Review in the Text tab.
                </p>
              )}
            </TabsContent>

            <TabsContent value="text" className="flex-1 flex flex-col min-h-0 mt-0">
              <Textarea
                value={designerText}
                onChange={(e) => setDesignerText(e.target.value)}
                className="flex-1 min-h-[420px] rounded-xl font-mono text-sm resize-none"
                placeholder="Paste designer description, intent, or summary notes."
              />
            </TabsContent>

            <TabsContent value="images" className="flex-1 overflow-auto mt-0">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Add image by URL"
                    className="h-9 text-sm"
                  />
                  <Button variant="outline" onClick={addImageFromUrl} className="h-9 px-3 text-sm">
                    Add URL
                  </Button>
                </div>
                <label className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50">
                  <ImagePlus className="h-4 w-4" />
                  Upload images
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleImageFiles(e.target.files)}
                  />
                </label>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Attach visual references to this designer input.</p>
                  <Badge variant="outline" className="font-normal">
                    {images.length} {images.length === 1 ? "image" : "images"}
                  </Badge>
                </div>
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {images.map((img) => (
                      <div key={img.id} className="h-16 w-16 overflow-hidden rounded-md border border-slate-100">
                        <img src={img.data} alt={img.id} className="h-full w-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </>
      );
    }

    return (
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
              onChange={(e) => onTextChange?.(e.target.value)}
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
    );
  }, [
    activeTab,
    designerName,
    designerText,
    imageUrl,
    images,
    jurorCount,
    loading,
    mode,
    onTextChange,
    rawText,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] min-w-[720px] min-h-[70vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-200">
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <DialogClose onClose={handleClose} />
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-6 py-4">
          {content}
        </div>

        {mode === "designer" && (
          <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
            <p className="text-xs text-slate-500">Save adds a new designer input block.</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={saveDesigner}
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6"
                disabled={!canSaveDesigner}
              >
                Save Designer Input
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}





