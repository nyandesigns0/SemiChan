export type ProgressPayload = {
  progress: number;
  step: string;
  done?: boolean;
  error?: string;
  timestamp?: number;
};

const listeners = new Map<string, Set<(payload: ProgressPayload) => void>>();
const lastPayload = new Map<string, ProgressPayload>();

export function emitProgress(id: string, payload: ProgressPayload): void {
  const enriched = { ...payload, timestamp: Date.now() };
  lastPayload.set(id, enriched);
  const set = listeners.get(id);
  if (!set) return;
  set.forEach((fn) => fn(enriched));
}

export function addProgressListener(id: string, fn: (payload: ProgressPayload) => void): void {
  const set = listeners.get(id) ?? new Set();
  set.add(fn);
  listeners.set(id, set);
  const last = lastPayload.get(id);
  if (last) fn(last);
}

export function removeProgressListener(id: string, fn: (payload: ProgressPayload) => void): void {
  const set = listeners.get(id);
  if (!set) return;
  set.delete(fn);
  if (set.size === 0) {
    listeners.delete(id);
  }
}

export function clearProgress(id: string): void {
  lastPayload.delete(id);
  listeners.delete(id);
}
