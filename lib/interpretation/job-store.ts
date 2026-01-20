import type { InterpretationReport } from "@/types/interpretation";

export interface InterpretationJobState {
  stage: string;
  progress: number;
  message: string;
  result?: InterpretationReport;
  error?: string;
}

export const jobStore = (() => {
  const globalKey = "__interpretationJobStore";
  if (!globalThis[globalKey]) {
    globalThis[globalKey] = new Map<string, InterpretationJobState>();
  }
  return globalThis[globalKey] as Map<string, InterpretationJobState>;
})();
