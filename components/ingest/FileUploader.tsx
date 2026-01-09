"use client";

import { Upload } from "lucide-react";
import { Label } from "@/components/ui/label";

interface FileUploaderProps {
  onFileSelect: (file: File) => Promise<void>;
  loading: boolean;
}

export function FileUploader({ onFileSelect, loading }: FileUploaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm">Upload PDF/TXT</Label>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50">
        <Upload className="h-4 w-4" />
        <span>{loading ? "Processing…" : "Choose file"}</span>
        <input
          className="hidden"
          type="file"
          accept=".pdf,.txt"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFileSelect(f);
          }}
        />
      </label>
    </div>
  );
}

