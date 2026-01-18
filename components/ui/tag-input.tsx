"use client";

import * as React from "react";
import { X, Tag as TagIcon, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { getGlobalTags, addGlobalTag } from "@/lib/utils/tag-storage";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function TagInput({ tags, onChange, placeholder = "Add tags...", className }: TagInputProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const globalTags = React.useMemo(() => getGlobalTags(), []);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateSuggestions = (value: string) => {
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    
    const filtered = globalTags.filter(
      t => t.toLowerCase().includes(value.toLowerCase()) && !tags.includes(t)
    );
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      const newTags = [...tags, trimmed];
      onChange(newTags);
      addGlobalTag(trimmed);
    }
    setInputValue("");
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div ref={containerRef} className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-1.5 p-1.5 min-h-[42px] rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
        {tags.map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className="flex items-center gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 py-1"
          >
            <TagIcon className="h-3 w-3" />
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="ml-1 rounded-full hover:bg-indigo-200 p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            updateSuggestions(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => updateSuggestions(inputValue)}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm min-w-[120px] h-7"
        />
      </div>

      {showSuggestions && (
        <div className="absolute z-50 w-full max-w-[300px] mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg animate-in fade-in zoom-in-95 duration-100">
          <div className="p-1">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => addTag(suggestion)}
                className="flex w-full items-center px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg text-left"
              >
                <Plus className="mr-2 h-3 w-3 text-slate-400" />
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
