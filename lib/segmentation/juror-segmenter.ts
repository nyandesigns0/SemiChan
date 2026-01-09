import type { JurorBlock } from "@/types/nlp";
import { normalizeWhitespace } from "@/lib/utils/text-utils";

export function looksLikeName(line: string): boolean {
  const s = line.trim();
  if (s.length < 6 || s.length > 60) return false;
  // Accept: First Last, First M. Last, multi-part surnames, diacritics simplified.
  // Reject: lines with too many lowercase words or ending with punctuation.
  if (/[.!?:]$/.test(s)) return false;
  if (/(selected jurors|jury|comments|competition|buildner)/i.test(s)) return false;

  const words = s.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5) return false;
  const caps = words.filter((w) => /^[A-Z][A-Za-z'.-]+$/.test(w)).length;
  // Middle initial
  const initials = words.filter((w) => /^[A-Z]\.$/.test(w)).length;
  return caps + initials >= Math.min(2, words.length);
}

export function segmentByJuror(raw: string): JurorBlock[] {
  const text = normalizeWhitespace(raw);
  const lines = text.split("\n").map((l) => l.trim());

  const blocks: JurorBlock[] = [];
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
  const cleaned: JurorBlock[] = [];
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
  return [...map.entries()].map(([juror, texts]) => ({ juror, text: texts.join("\n\n") }));
}

