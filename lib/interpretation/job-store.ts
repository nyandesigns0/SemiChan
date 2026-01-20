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
  if (!(globalThis as any)[globalKey]) {
    (globalThis as any)[globalKey] = new Map<string, InterpretationJobState>();
  }
  return (globalThis as any)[globalKey] as Map<string, InterpretationJobState>;
})();
