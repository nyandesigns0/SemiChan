"use client";

import { useEffect, useMemo, useState } from "react";
import { ImagePlus, Type, Upload, Plus, Trash2, Tag as TagIcon, Info, Users, ChevronRight, MessageSquare, Pencil, ChevronDown } from "lucide-react";
import { parsePdf } from "@/lib/pdf/pdf-parser";
import { normalizeWhitespace } from "@/lib/utils/text-utils";
import { cn } from "@/lib/utils/cn";
import { segmentByJuror } from "@/lib/segmentation/juror-segmenter";
import { sentenceSplit } from "@/lib/nlp/sentence-splitter";
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
  const [activeTab, setActiveTab] = useState(mode === "designer" ? "text" : "upload");
  
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
  const [expandedJurorIndex, setExpandedJurorIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const jurorCount = jurorBlocks.length;
  const totalComments = useMemo(() => jurorBlocks.reduce((sum, b) => sum + b.comments.length, 0), [jurorBlocks]);
  const totalTags = useMemo(() => new Set(jurorBlocks.flatMap(b => b.comments.flatMap(c => c.tags))).size, [jurorBlocks]);
  const totalSentences = useMemo(() => jurorBlocks.reduce((sum, b) => 
    sum + b.comments.reduce((cSum, c) => cSum + sentenceSplit(c.text).length, 0), 
  0), [jurorBlocks]);

  const canSaveDesigner = designerText.trim().length > 0 || images.length > 0;
  const canAddComment = commentText.trim().length > 0;
  const canSaveJuror = jurorName.trim().length > 0 && (pendingComments.length > 0 || canAddComment);
  
  const title = mode === "designer" ? "Upload Designer Input" : "Manage Juror Feedback";

  useEffect(() => {
    if (open) {
      setActiveTab(mode === "designer" ? "text" : "upload");
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
    setEditingIndex(null);
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
      if (editingIndex !== null) {
        onUpdateJurorBlock?.(editingIndex, {
          juror: jurorName.trim(),
          comments: finalComments,
        });
      } else {
        onAddJurorBlock?.({
          juror: jurorName.trim(),
          comments: finalComments,
        });
      }
      resetJuror();
    }
  };

  const handleEditJuror = (index: number) => {
    const block = jurorBlocks[index];
    setJurorName(block.juror);
    setPendingComments(block.comments);
    setCommentText("");
    setCommentTags([]);
    setEditingIndex(index);
    // Switch to manual tab if not already there
    setActiveTab("manual");
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

            <TabsContent value="pdf" className="flex-1 flex flex-col mt-0 min-h-0">
              <FileUploaderWithDrop onFileSelect={handleFile} loading={loading} className="flex-1" />
              {designerText && (
                <p className="mt-3 text-xs text-slate-500 shrink-0">
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
      <Tabs defaultValue="upload" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full mb-4 grid grid-cols-2 shrink-0">
          <TabsTrigger value="upload" className="rounded-lg">
            <Upload className="mr-2 h-4 w-4" />
            Upload PDF/Text
          </TabsTrigger>
          <TabsTrigger value="manual" className="rounded-lg">
            <Users className="mr-2 h-4 w-4" />
            Juror List
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="flex-1 flex flex-col min-h-0 mt-0">
          <div className="mb-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl shrink-0">
            <Info className="h-4 w-4 text-amber-500 mt-0.5" />
            <p className="text-xs text-amber-700 leading-relaxed font-medium">
              Uploading a file will automatically attempt to segment the text into individual juror blocks. 
              Review the results in the <strong>Juror List</strong> tab after processing.
            </p>
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <FileUploaderWithDrop onFileSelect={handleFile} loading={loading} className="flex-1" />
          </div>
        </TabsContent>

        <TabsContent value="manual" className="flex-1 flex flex-col min-h-0 mt-0">
          <div className="flex-1 grid grid-cols-2 gap-8 min-h-0">
            {/* Left side: Add/Edit Juror */}
            <div className="flex flex-col space-y-4 min-h-0">
              <div className="flex items-center justify-between shrink-0">
                <Label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Plus className="h-4 w-4 text-indigo-500" />
                  Add Juror & Comments
                </Label>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-4 space-y-6">
                <div className="space-y-3">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Juror Name</Label>
                  <Input
                    value={jurorName}
                    onChange={(e) => setJurorName(e.target.value)}
                    placeholder="e.g. Sarah Broadstock"
                    className="h-11 text-sm rounded-xl border-slate-200 shadow-sm focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5 space-y-5 shadow-sm">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                      Add a Tagged Comment
                      <span className="text-indigo-400 font-normal normal-case italic text-[10px]">A comment can be a sentence or paragraph</span>
                    </Label>
                    <Textarea
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      className="min-h-[120px] text-sm rounded-xl font-sans leading-relaxed bg-white border-indigo-100 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-500/10 transition-all p-3"
                      placeholder="Enter comment text..."
                    />
                  </div>

                  <div className="space-y-3">
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
                    className="w-full rounded-xl bg-white border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold h-11 text-sm shadow-sm transition-all"
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
                                <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0 bg-slate-100 text-slate-600 border-none rounded-lg font-bold uppercase">
                                  {t}
                                </Badge>
                              )) : (
                                <span className="text-[10px] text-slate-400 italic">No tags</span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removePendingComment(comment.id)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed italic">"{comment.text}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
                <Button 
                  variant="outline" 
                  onClick={resetJuror}
                  className="flex-1 rounded-xl border-slate-200 text-slate-600 hover:text-slate-900 font-bold h-10 uppercase text-[10px] tracking-widest transition-all"
                >
                  Reset
                </Button>
                <Button 
                  onClick={saveJuror}
                  disabled={!canSaveJuror}
                  className="flex-[2] rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold h-10 shadow-lg shadow-slate-200 uppercase text-[10px] tracking-widest transition-all"
                >
                  {editingIndex !== null ? "Update Juror Entry" : "Save Juror Entry"}
                </Button>
              </div>
            </div>

            {/* Right side: Summary of all jurors */}
            <div className="flex flex-col space-y-4 min-h-0 border-l border-slate-100 pl-6">
              <div className="flex items-center justify-between shrink-0">
                <Label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Users className="h-4 w-4 text-emerald-500" />
                  Juror Summary
                </Label>
                <div className="flex flex-wrap items-center gap-1.5 justify-end">
                  <Badge variant="outline" className="rounded-lg bg-slate-50 border-slate-200 text-[10px] font-bold text-slate-500 px-2 py-0.5 uppercase tracking-tight">
                    {jurorCount} Jurors
                  </Badge>
                  {totalComments > 0 && (
                    <Badge variant="outline" className="rounded-lg bg-indigo-50 border-indigo-100 text-[10px] font-bold text-indigo-500 px-2 py-0.5 uppercase tracking-tight">
                      {totalComments} Comments
                    </Badge>
                  )}
                  {totalSentences > 0 && (
                    <Badge variant="outline" className="rounded-lg bg-emerald-50 border-emerald-100 text-[10px] font-bold text-emerald-500 px-2 py-0.5 uppercase tracking-tight">
                      {totalSentences} Sentences
                    </Badge>
                  )}
                  {totalTags > 0 && (
                    <Badge variant="outline" className="rounded-lg bg-amber-50 border-amber-100 text-[10px] font-bold text-amber-600 px-2 py-0.5 uppercase tracking-tight">
                      {totalTags} Tags
                    </Badge>
                  )}
                </div>
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
                    {jurorBlocks.map((block, idx) => {
                      const isExpanded = expandedJurorIndex === idx;
                      const uniqueTags = Array.from(new Set(block.comments.flatMap(c => c.tags)));
                      const totalChars = block.comments.reduce((sum, c) => sum + c.text.length, 0);

                      return (
                        <div 
                          key={`${block.juror}-${idx}`} 
                          className={cn(
                            "group rounded-2xl border transition-all shadow-sm overflow-hidden cursor-default",
                            isExpanded 
                              ? "border-indigo-400 bg-white ring-4 ring-indigo-500/5 shadow-lg" 
                              : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-md"
                          )}
                        >
                          <div className="p-5 flex items-center justify-between gap-5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-base font-black text-slate-900 truncate tracking-tight">{block.juror}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedJurorIndex(isExpanded ? null : idx);
                                  }}
                                  className={cn(
                                    "flex items-center justify-center rounded-full transition-all",
                                    isExpanded
                                      ? "h-7 w-7 bg-indigo-500/10 text-indigo-600"
                                      : "h-7 w-7 text-slate-400 hover:text-indigo-500"
                                  )}
                                  aria-label={isExpanded ? "Collapse juror card" : "Expand juror card"}
                                  title={isExpanded ? "Collapse juror card" : "Expand juror card"}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                                <div className="flex items-center gap-1.5 text-slate-600">
                                  <div className="p-1 rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors">
                                    <MessageSquare className="h-3.5 w-3.5 text-slate-700" />
                                  </div>
                                  <span className="text-[11px] font-bold uppercase tracking-wider">
                                    {block.comments.length} {block.comments.length === 1 ? 'Comment' : 'Comments'}
                                  </span>
                                </div>
                                {uniqueTags.length > 0 && (
                                  <div className="flex items-center gap-1.5 text-indigo-600">
                                    <div className="p-1 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 transition-colors">
                                      <TagIcon className="h-3.5 w-3.5 text-indigo-600" />
                                    </div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider">
                                      {uniqueTags.length} {uniqueTags.length === 1 ? 'Tag' : 'Tags'}
                                    </span>
                                  </div>
                                )}
                                <div className="text-[10px] font-bold text-slate-400 bg-slate-100/80 px-2.5 py-0.5 rounded-full uppercase tracking-tight">
                                  {totalChars.toLocaleString()} chars
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevents expansion toggle when editing
                                  handleEditJuror(idx);
                                }}
                                className="h-10 w-10 p-0 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition-all shadow-sm hover:shadow-md"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevents expansion toggle when deleting
                                  onRemoveJurorBlock?.(idx);
                                }}
                                className="h-10 w-10 p-0 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all shadow-sm hover:shadow-md"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div 
                              className="border-t border-indigo-100 bg-indigo-50/20 p-4 space-y-4"
                              onClick={(e) => e.stopPropagation()} // Clicking comments does not collapse the card
                            >
                              {block.comments.map((c, ci) => (
                                <div key={ci} className="space-y-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-800 leading-relaxed font-medium bg-white p-3 rounded-xl border border-indigo-100 shadow-sm">
                                      "{c.text}"
                                    </p>
                                    {c.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1.5 mt-2">
                                          {c.tags.map(t => (
                                            <Badge key={t} variant="secondary" className="text-[10px] px-2.5 py-0.5 bg-indigo-100 hover:bg-indigo-200 border border-indigo-200 text-indigo-800 rounded-lg font-bold uppercase tracking-widest transition-colors shadow-sm">
                                              {t}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  {ci < block.comments.length - 1 && <Separator className="bg-indigo-200/30" />}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
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
    expandedJurorIndex,
    totalComments,
    totalSentences,
    totalTags,
    canSaveJuror,
    canAddComment,
    onOpenChange,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] min-w-[1200px] min-h-[75vh] flex flex-col p-0 gap-0 border-none rounded-3xl overflow-hidden shadow-2xl">
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
