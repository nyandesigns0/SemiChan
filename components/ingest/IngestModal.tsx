"use client";

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Type, Upload, Plus, Trash2, Tag as TagIcon, Info, Users, ChevronRight, MessageSquare } from "lucide-react";
import { parsePdf } from "@/lib/pdf/pdf-parser";
import { normalizeWhitespace } from "@/lib/utils/text-utils";
import { segmentByJuror } from "@/lib/segmentation/juror-segmenter";
import { handleFileUpload, loadImageFromUrl, validateImageUrl } from "@/lib/utils/image-upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TagInput } from "@/components/ui/tag-input";
import type { DesignerBlock, JurorBlock, JurorComment } from "@/types/nlp";
import { FileUploaderWithDrop } from "./FileUploaderWithDrop";

type IngestModalMode = "juror" | "designer";

interface IngestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: IngestModalMode;
  jurorBlocks?: JurorBlock[];
  onAddJurorBlock?: (block: JurorBlock) => void;
  onUpdateJurorBlock?: (index: number, block: JurorBlock) => void;
  onRemoveJurorBlock?: (index: number) => void;
  onClearJurorBlocks?: () => void;
  onFileProcessed?: () => void;
  onAddDesignerBlock?: (block: DesignerBlock) => void;
}

export function IngestModal({
  open,
  onOpenChange,
  mode,
  jurorBlocks = [],
  onAddJurorBlock,
  onUpdateJurorBlock,
  onRemoveJurorBlock,
  onClearJurorBlocks,
  onFileProcessed,
  onAddDesignerBlock,
}: IngestModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(mode === "designer" ? "text" : "manual");
  
  // Designer state
  const [designerName, setDesignerName] = useState("");
  const [designerText, setDesignerText] = useState("");
  const [images, setImages] = useState<DesignerBlock["images"]>([]);
  const [imageUrl, setImageUrl] = useState("");

  // Juror state
  const [jurorName, setJurorName] = useState("");
  const [pendingComments, setPendingComments] = useState<JurorComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentTags, setCommentTags] = useState<string[]>([]);

  const jurorCount = jurorBlocks.length;
  const canSaveDesigner = designerText.trim().length > 0 || images.length > 0;
  const canAddComment = commentText.trim().length > 0;
  const canSaveJuror = jurorName.trim().length > 0 && (pendingComments.length > 0 || canAddComment);
  
  const title = mode === "designer" ? "Upload Designer Input" : "Manage Juror Feedback";

  useEffect(() => {
    if (open) {
      setActiveTab(mode === "designer" ? "text" : "manual");
    }
  }, [mode, open]);

  const resetDesigner = () => {
    setDesignerName("");
    setDesignerText("");
    setImages([]);
    setImageUrl("");
    setActiveTab("text");
  };

  const resetJuror = () => {
    setJurorName("");
    setPendingComments([]);
    setCommentText("");
    setCommentTags([]);
  };

  const handleClose = () => {
    onOpenChange(false);
    if (mode === "designer") {
      resetDesigner();
    } else {
      resetJuror();
    }
  };

  async function handleFile(file: File): Promise<void> {
    setLoading(true);
    try {
      let text = "";
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        text = await parsePdf(file);
      } else {
        text = await file.text();
      }
      
      const normalized = normalizeWhitespace(text);
      if (mode === "designer") {
        setDesignerText(normalized);
        setActiveTab("text");
      } else {
        const blocks = segmentByJuror(normalized);
        blocks.forEach(b => onAddJurorBlock?.(b));
        setActiveTab("manual");
      }
    } catch (e: unknown) {
      console.error("Error processing file:", e);
    } finally {
      setLoading(false);
    }
  }

  const addComment = () => {
    if (!canAddComment) return;
    const newComment: JurorComment = {
      id: crypto.randomUUID(),
      text: commentText.trim(),
      tags: [...commentTags],
    };
    setPendingComments([...pendingComments, newComment]);
    setCommentText("");
    setCommentTags([]);
  };

  const removePendingComment = (id: string) => {
    setPendingComments(pendingComments.filter(c => c.id !== id));
  };

  const saveJuror = () => {
    // If there's text in the current comment field, add it first
    let finalComments = [...pendingComments];
    if (canAddComment) {
      finalComments.push({
        id: crypto.randomUUID(),
        text: commentText.trim(),
        tags: [...commentTags],
      });
    }

    if (jurorName.trim() && finalComments.length > 0) {
      onAddJurorBlock?.({
        juror: jurorName.trim(),
        comments: finalComments,
      });
      resetJuror();
    }
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
        <div className="flex-1 flex flex-col min-h-0">
          <div className="mb-4 space-y-2 shrink-0">
            <Label className="text-sm font-semibold text-slate-700">Designer name</Label>
            <Input
              value={designerName}
              onChange={(e) => setDesignerName(e.target.value)}
              placeholder="Designer / creator name"
              className="h-9 rounded-xl"
            />
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="w-full mb-4 grid grid-cols-3 shrink-0">
              <TabsTrigger value="pdf" className="rounded-lg">
                <Upload className="mr-2 h-4 w-4" />
                Upload PDF
              </TabsTrigger>
              <TabsTrigger value="text" className="rounded-lg">
                <Type className="mr-2 h-4 w-4" />
                Paste Text
              </TabsTrigger>
              <TabsTrigger value="images" className="rounded-lg">
                <ImagePlus className="mr-2 h-4 w-4" />
                Add Images
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pdf" className="flex-1 overflow-auto mt-0 min-h-0">
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
                className="flex-1 min-h-[300px] rounded-xl font-mono text-sm resize-none"
                placeholder="Paste designer description, intent, or summary notes."
              />
            </TabsContent>

            <TabsContent value="images" className="flex-1 overflow-auto mt-0 min-h-0">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Add image by URL"
                    className="h-9 text-sm rounded-xl"
                  />
                  <Button variant="outline" onClick={() => {
                    if (!imageUrl.trim()) return;
                    validateImageUrl(imageUrl.trim()).then(ok => {
                      if (ok) loadImageFromUrl(imageUrl.trim()).then(loaded => {
                        setImages(prev => [...prev, loaded]);
                        setImageUrl("");
                      });
                    });
                  }} className="h-9 px-3 text-sm rounded-xl">
                    Add URL
                  </Button>
                </div>
                <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
                  <ImagePlus className="h-4 w-4" />
                  Upload images
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (!e.target.files) return;
                      handleFileUpload(e.target.files[0]).then(data => {
                        setImages(prev => [...prev, data]);
                      });
                    }}
                  />
                </label>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-500">Attach visual references.</p>
                  <Badge variant="outline" className="font-normal rounded-lg">
                    {images.length} {images.length === 1 ? "image" : "images"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {images.map((img) => (
                    <div key={img.id} className="group relative h-16 w-16 overflow-hidden rounded-xl border border-slate-100 shadow-sm">
                      <img src={img.data} alt={img.id} className="h-full w-full object-cover" />
                      <button 
                        onClick={() => setImages(prev => prev.filter(i => i.id !== img.id))}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-4 w-4 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      );
    }

    return (
      <Tabs defaultValue="manual" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full mb-4 grid grid-cols-2 shrink-0">
          <TabsTrigger value="manual" className="rounded-lg">
            <Users className="mr-2 h-4 w-4" />
            Juror List
          </TabsTrigger>
          <TabsTrigger value="upload" className="rounded-lg">
            <Upload className="mr-2 h-4 w-4" />
            Upload PDF/Text
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="flex-1 flex flex-col min-h-0 mt-0">
          <div className="flex-1 grid grid-cols-[1fr,320px] gap-6 min-h-0">
            {/* Left side: Add/Edit Juror */}
            <div className="flex flex-col space-y-4 min-h-0">
              <div className="flex items-center justify-between shrink-0">
                <Label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-indigo-500" />
                  Add Juror & Comments
                </Label>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={resetJuror}
                    className="text-[10px] uppercase font-black h-8 px-3 rounded-lg border-slate-200 text-slate-600 hover:text-slate-900"
                  >
                    Reset
                  </Button>
                  <Button 
                    onClick={saveJuror}
                    disabled={!canSaveJuror}
                    size="sm"
                    className="text-[10px] uppercase font-black h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                  >
                    Save Juror Entry
                  </Button>
                </div>
              </div>

              <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar pb-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Juror Name</Label>
                  <Input
                    value={jurorName}
                    onChange={(e) => setJurorName(e.target.value)}
                    placeholder="e.g. Sarah Broadstock"
                    className="h-10 rounded-xl border-slate-200"
                  />
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                      Add a Tagged Comment
                      <span className="text-indigo-400 font-normal normal-case italic">A comment can be a sentence or paragraph</span>
                    </Label>
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="min-h-[100px] rounded-xl font-mono text-sm resize-none bg-white border-indigo-100 focus:border-indigo-300"
                      placeholder="Enter comment text..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Trace Tags</Label>
                    <TagInput 
                      tags={commentTags} 
                      onChange={setCommentTags} 
                      placeholder="Type and Enter to add tags..."
                    />
                  </div>

                  <Button
                    variant="outline"
                    onClick={addComment}
                    disabled={!canAddComment}
                    className="w-full rounded-xl bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold h-10 shadow-sm"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Comment to {jurorName || 'Juror'}
                  </Button>
                </div>

                {pendingComments.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1">
                      Pending Comments ({pendingComments.length})
                    </Label>
                    <div className="space-y-2">
                      {pendingComments.map((comment) => (
                        <div key={comment.id} className="group relative rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-indigo-300">
                          <div className="flex items-start justify-between mb-1.5">
                            <div className="flex flex-wrap gap-1">
                              {comment.tags.length > 0 ? comment.tags.map(t => (
                                <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0 bg-slate-100 text-slate-600 border-none rounded-lg">
                                  {t}
                                </Badge>
                              )) : (
                                <span className="text-[9px] text-slate-400 italic">No tags</span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removePendingComment(comment.id)}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed italic">"{comment.text}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Summary of all jurors */}
            <div className="flex flex-col space-y-4 min-h-0 border-l border-slate-100 pl-6">
              <div className="flex items-center justify-between shrink-0">
                <Label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-500" />
                  Juror Summary
                </Label>
                <Badge variant="outline" className="rounded-lg bg-slate-50">
                  {jurorCount} Jurors
                </Badge>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {jurorBlocks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
                    <Users className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-center text-[11px] text-slate-400 px-4 leading-relaxed">
                      Add a juror name and comments on the left to build your list.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 pb-4">
                    {jurorBlocks.map((block, idx) => (
                      <div key={`${block.juror}-${idx}`} className="group rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-white hover:border-slate-200 transition-all shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-black text-slate-900 truncate">{block.juror}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveJurorBlock?.(idx)}
                            className="h-6 w-6 p-0 text-slate-300 hover:text-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          {block.comments.slice(0, 2).map((c, ci) => (
                            <div key={ci} className="flex items-start gap-1.5">
                              <ChevronRight className="h-2.5 w-2.5 text-slate-300 mt-0.5 shrink-0" />
                              <p className="text-[10px] text-slate-500 line-clamp-1 italic">{c.text}</p>
                            </div>
                          ))}
                          {block.comments.length > 2 && (
                            <p className="text-[9px] text-indigo-400 font-bold pl-4">
                              + {block.comments.length - 2} more comments
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3 shrink-0">
                {jurorCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onClearJurorBlocks}
                    className="w-full text-[10px] uppercase font-black text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                  >
                    Clear All Jurors
                  </Button>
                )}
                <Button
                  onClick={() => onOpenChange(false)}
                  className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-10 shadow-lg shadow-indigo-200"
                >
                  Confirm & Done
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="flex-1 flex flex-col min-h-0 mt-0">
          <div className="mb-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
            <Info className="h-4 w-4 text-amber-500 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed font-medium">
              Uploading a file will automatically attempt to segment the text into individual juror blocks. 
              Review the results in the <strong>Juror List</strong> tab after processing.
            </p>
          </div>
          <div className="flex-1 overflow-auto">
            <FileUploaderWithDrop onFileSelect={handleFile} loading={loading} />
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
    onAddJurorBlock,
    onClearJurorBlocks,
    onRemoveJurorBlock,
    jurorName,
    pendingComments,
    commentText,
    commentTags,
    jurorBlocks,
    canSaveJuror,
    canAddComment,
    onOpenChange,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] min-w-[800px] min-h-[75vh] flex flex-col p-0 gap-0 border-none rounded-3xl overflow-hidden shadow-2xl">
        <DialogHeader className="px-8 pt-8 pb-6 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-900 p-2.5 text-white shadow-xl">
              {mode === "designer" ? <Type className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">{title}</DialogTitle>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                {mode === "designer" ? "Configure your project's intent and narrative." : "Organize and tag individual stakeholder feedback."}
              </p>
            </div>
          </div>
          <DialogClose onClose={handleClose} />
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-8 py-6 bg-white">
          {content}
        </div>

        {mode === "designer" && (
          <div className="flex items-center justify-between border-t border-slate-100 px-8 py-6 bg-slate-50 shrink-0">
            <p className="text-xs font-medium text-slate-400 flex items-center gap-2">
              <Info className="h-3.5 w-3.5 text-slate-300" />
              Save adds a new designer input block to the analysis.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={handleClose} className="rounded-xl font-bold text-slate-500">
                Cancel
              </Button>
              <Button
                onClick={saveDesigner}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold px-8 h-11 shadow-xl shadow-slate-200"
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
