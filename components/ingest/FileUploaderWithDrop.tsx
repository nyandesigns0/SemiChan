"use client";

import { useState, useRef } from "react";
import { Upload, File } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface FileUploaderWithDropProps {
  onFileSelect: (file: File) => Promise<void>;
  loading: boolean;
}

export function FileUploaderWithDrop({ onFileSelect, loading }: FileUploaderWithDropProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file) {
      await onFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") || file.name.toLowerCase().endsWith(".txt"))) {
      await handleFile(file);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFile(file);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 transition-all",
          isDragging
            ? "border-indigo-500 bg-indigo-50 scale-[1.02]"
            : "border-slate-300 hover:border-indigo-400 hover:bg-slate-50",
          loading && "opacity-50 pointer-events-none"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="rounded-full bg-indigo-100 p-4">
            <Upload className="h-8 w-8 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {loading ? "Processing..." : "Drag and drop your PDF file here"}
            </p>
            <p className="text-xs text-slate-500 mt-1">or click to browse</p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <File className="h-4 w-4" />
            Choose File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt"
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      </div>
      <p className="text-xs text-slate-500 text-center">
        Supported formats: PDF, TXT
      </p>
    </div>
  );
}

