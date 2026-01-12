"use client";

import { useState } from "react";
import type { DesignerBlock } from "@/types/nlp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { handleFileUpload, loadImageFromUrl, validateImageUrl } from "@/lib/utils/image-upload";
import { ImagePlus, Trash2 } from "lucide-react";

interface DesignerInputPanelProps {
  blocks: DesignerBlock[];
  onChange: (blocks: DesignerBlock[]) => void;
}

export function DesignerInputPanel({ blocks, onChange }: DesignerInputPanelProps) {
  const [designer, setDesigner] = useState("");
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const addBlock = () => {
    if (!designer.trim()) return;
    const newBlock: DesignerBlock = { designer: designer.trim(), text, images: [] };
    onChange([...blocks, newBlock]);
    setDesigner("");
    setText("");
  };

  const removeBlock = (idx: number) => {
    const updated = blocks.filter((_, i) => i !== idx);
    onChange(updated);
  };

  const addImageFromUrl = async () => {
    if (!imageUrl.trim()) return;
    const ok = await validateImageUrl(imageUrl.trim());
    if (!ok) return;
    const nextBlocks = [...blocks];
    const target = nextBlocks[nextBlocks.length - 1];
    if (!target) return;
    const loaded = await loadImageFromUrl(imageUrl.trim());
    target.images = [...(target.images || []), loaded];
    onChange(nextBlocks);
    setImageUrl("");
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const nextBlocks = [...blocks];
    const target = nextBlocks[nextBlocks.length - 1];
    if (!target) return;
    const uploaded: DesignerBlock["images"] = [];
    for (const file of Array.from(files)) {
      const data = await handleFileUpload(file);
      uploaded.push(data);
    }
    target.images = [...(target.images || []), ...uploaded];
    onChange(nextBlocks);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="grid gap-2">
          <Input
            value={designer}
            onChange={(e) => setDesigner(e.target.value)}
            placeholder="Designer / creator name"
            className="h-8 text-sm"
          />
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Designer description or notes"
            className="min-h-[80px] text-sm"
          />
          <div className="flex items-center gap-2">
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Add image by URL"
              className="h-8 text-sm"
            />
            <Button size="sm" variant="outline" onClick={addImageFromUrl} className="h-8">
              Add URL
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50">
              <ImagePlus className="h-4 w-4" />
              Upload images
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
            <Button size="sm" onClick={addBlock} className="h-9">
              Add Designer
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {blocks.map((block, idx) => (
          <div key={`${block.designer}-${idx}`} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
                {block.designer}
              </Badge>
              <Button variant="ghost" size="icon" onClick={() => removeBlock(idx)}>
                <Trash2 className="h-4 w-4 text-slate-400" />
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
    </div>
  );
}
