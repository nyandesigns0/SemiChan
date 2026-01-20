import type { JurorBlock } from "@/types/nlp";
import { normalizeWhitespace } from "@/lib/utils/text-utils";
import { saveGlobalTags } from "@/lib/utils/tag-storage";

export function looksLikeName(line: string): boolean {
  const s = line.trim();
  if (s.length < 3 || s.length > 60) return false;
  // Accept: First Last, First M. Last, multi-part surnames, single names (e.g. Buildner).
  // Reject: lines with too many lowercase words or ending with punctuation.
  if (/[.!?:]$/.test(s)) return false;
  if (/(selected jurors|jury|comments|competition)/i.test(s)) return false;

  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 5) return false;
  const caps = words.filter((w) => /^[A-Z][A-Za-z'.-]*$/.test(w)).length;
  // Middle initial
  const initials = words.filter((w) => /^[A-Z]\.$/.test(w)).length;
  return caps + initials >= Math.min(1, words.length);
}

/**
 * Extracts tags from text using supported syntax patterns.
 * Supported patterns:
 * - Hashtags: #tagname (word characters after #)
 * - Bracketed: [tagname] (single word in brackets)
 */
export function extractTags(text: string): string[] {
  const tags: string[] = [];

  // Extract hashtags: # followed by word characters
  const hashtagRegex = /#(\w+)/g;
  let match;
  while ((match = hashtagRegex.exec(text)) !== null) {
    tags.push(match[1]);
  }

  // Extract bracketed tags: [tag] - single word in brackets
  const bracketRegex = /\[(\w+)\]/g;
  while ((match = bracketRegex.exec(text)) !== null) {
    tags.push(match[1]);
  }

  // Remove duplicates and return
  return Array.from(new Set(tags));
}

/**
 * Removes tag syntax from text for clean analysis.
 * Strips both #hashtags and [bracketed tags] from the text.
 */
export function cleanTagsFromText(text: string): string {
  // Remove hashtags: #tagname
  let cleaned = text.replace(/#\w+/g, '').trim();

  // Remove bracketed tags: [tag]
  cleaned = cleaned.replace(/\[\w+\]/g, '').trim();

  // Clean up extra whitespace that might result from tag removal
  return normalizeWhitespace(cleaned);
}

export function segmentByJuror(raw: string): JurorBlock[] {
  const text = normalizeWhitespace(raw);
  const lines = text.split("\n").map((l) => l.trim());

  const blocks: { juror: string; text: string }[] = [];
  let currentName: string | null = null;
  let buf: string[] = [];

  const flush = () => {
    if (currentName && buf.join(" ").trim().length > 0) {
      blocks.push({ juror: currentName, text: buf.join("\n").trim() });
    }
    buf = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // If line looks like a juror name and the next non-empty line is not another name, treat as header.
    if (looksLikeName(line)) {
      // Look ahead for confirmation
      let j = i + 1;
      while (j < lines.length && !lines[j]) j++;
      const next = j < lines.length ? lines[j] : "";
      const nextIsName = next ? looksLikeName(next) : false;
      if (!nextIsName) {
        flush();
        currentName = line.trim();
        continue;
      }
    }

    if (!currentName) {
      // If no name found, put into an "Unattributed" block.
      currentName = "Unattributed";
    }
    buf.push(line);
  }
  flush();

  // Merge tiny blocks into Unattributed (often headers)
  const cleaned: { juror: string; text: string }[] = [];
  for (const b of blocks) {
    const t = b.text.trim();
    if (t.length < 60 && b.juror !== "Unattributed") {
      // Likely a stray block; append to Unattributed
      const u = cleaned.find((x) => x.juror === "Unattributed");
      if (u) u.text += "\n" + t;
      else cleaned.push({ juror: "Unattributed", text: t });
    } else {
      cleaned.push(b);
    }
  }

  // Deduplicate identical juror blocks
  const map = new Map<string, string[]>();
  for (const b of cleaned) {
    map.set(b.juror, [...(map.get(b.juror) ?? []), b.text]);
  }
  const jurorBlocks = Array.from(map.entries()).map(([juror, texts]) => ({
    juror,
    comments: texts.map(text => {
      const tags = extractTags(text);
      const cleanText = cleanTagsFromText(text);
      return {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2),
        text: cleanText,
        tags
      };
    })
  }));

  // Collect all discovered tags and save to global library
  const allTags = jurorBlocks.flatMap(block =>
    block.comments.flatMap(comment => comment.tags)
  );
  if (allTags.length > 0) {
    saveGlobalTags(allTags);
  }

  return jurorBlocks;
}

