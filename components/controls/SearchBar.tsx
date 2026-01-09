"use client";

import { Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="space-y-4">
      <Label className="text-sm font-bold text-slate-700">Search Workspace</Label>
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 rounded-lg bg-slate-100 p-1 text-slate-400 transition-colors group-focus-within:bg-slate-900 group-focus-within:text-white">
          <Search className="h-4 w-4" />
        </div>
        <Input
          className="h-12 pl-12 pr-4 rounded-2xl border-2 border-slate-100 bg-white font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-slate-900 focus:ring-0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Jurors or concept keywords..."
        />
      </div>
    </div>
  );
}

