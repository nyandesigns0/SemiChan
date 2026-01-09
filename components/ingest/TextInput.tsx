"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  jurorCount: number;
}

export function TextInput({ value, onChange, jurorCount }: TextInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">Raw text</Label>
        <Badge variant="outline" className="font-normal">
          {jurorCount} jurors detected
        </Badge>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[240px] rounded-xl"
        placeholder="Paste your compiled jury comments here. Put juror names on their own lines."
      />
      <p className="text-xs text-slate-600">
        Tip: Put each juror name on a separate line. The segmenter uses name-like headers to split blocks.
      </p>
    </div>
  );
}

