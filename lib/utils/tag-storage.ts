"use client";

const TAGS_STORAGE_KEY = "semi-chan-global-tags";

/**
 * Persists a list of tags to localStorage for cross-session autocomplete.
 */
export function saveGlobalTags(tags: string[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  
  try {
    const existing = getGlobalTags();
    const combined = Array.from(new Set([...existing, ...tags])).filter(Boolean).sort();
    window.localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(combined));
  } catch (e) {
    console.warn("[TagStorage] Failed to save tags:", e);
  }
}

/**
 * Retrieves the global list of tags from localStorage.
 */
export function getGlobalTags(): string[] {
  if (typeof window === "undefined" || !window.localStorage) return [];
  
  try {
    const raw = window.localStorage.getItem(TAGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("[TagStorage] Failed to load tags:", e);
    return [];
  }
}

/**
 * Adds a single tag to the global storage if it doesn't exist.
 */
export function addGlobalTag(tag: string): void {
  if (!tag || !tag.trim()) return;
  saveGlobalTags([tag.trim()]);
}
