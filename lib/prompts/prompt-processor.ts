import fs from "fs/promises";
import path from "path";

export type PromptTemplates = {
  axis: { system: string; user: string };
  concept: { system: string; user: string };
};

export type PromptVariableValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>
  | Record<string, unknown>;

export type PromptVariableFormat = "list" | "lines" | "percentage" | "number" | "string" | "json";

export interface PromptVariableConfig {
  value: PromptVariableValue;
  format?: PromptVariableFormat;
  fallback?: string;
}

export type PromptVariableInput = PromptVariableValue | PromptVariableConfig;
export type PromptVariables = Record<string, PromptVariableInput>;

const PROMPTS_PATH = path.join(process.cwd(), "lib", "prompts", "ai-prompts.json");
let cachedPrompts: PromptTemplates | null = null;

function isPromptTemplates(value: unknown): value is PromptTemplates {
  if (!value || typeof value !== "object") return false;
  const data = value as PromptTemplates;
  return Boolean(
    data.axis &&
      typeof data.axis.system === "string" &&
      typeof data.axis.user === "string" &&
      data.concept &&
      typeof data.concept.system === "string" &&
      typeof data.concept.user === "string"
  );
}

function isPromptVariableConfig(input: PromptVariableInput): input is PromptVariableConfig {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;
  const record = input as Record<string, unknown>;
  return "value" in record && ("format" in record || "fallback" in record);
}

function normalizePromptVariable(input: PromptVariableInput): PromptVariableConfig {
  if (isPromptVariableConfig(input)) {
    return input;
  }
  return { value: input };
}

export async function loadPrompts(): Promise<PromptTemplates> {
  if (cachedPrompts) return cachedPrompts;
  try {
    const raw = await fs.readFile(PROMPTS_PATH, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!isPromptTemplates(parsed)) {
      throw new Error("Prompt templates missing required keys.");
    }
    cachedPrompts = parsed;
    return parsed;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load prompt templates from ${PROMPTS_PATH}: ${errorMessage}. ` +
      "Ensure lib/prompts/ai-prompts.json exists and is valid JSON."
    );
  }
}

export function formatVariable(value: PromptVariableValue, format?: PromptVariableFormat): string {
  if (value === null || value === undefined) return "";

  if (format === "json") {
    try {
      return JSON.stringify(value);
    } catch (error) {
      console.warn("Prompt variable JSON stringify failed.", error);
      return String(value);
    }
  }

  if (format === "percentage") {
    const numeric = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numeric)) return String(value);
    const percent = Math.abs(numeric) <= 1 ? numeric * 100 : numeric;
    return `${percent.toFixed(1)}%`;
  }

  if (Array.isArray(value)) {
    if (format === "lines") {
      return value.map(item => `- ${String(item)}`).join("\n");
    }
    return value.map(item => String(item)).join(", ");
  }

  if (format === "number") {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) ? String(numeric) : String(value);
  }

  return String(value);
}

export function processPrompt(
  template: string,
  variables: PromptVariables,
  options?: { defaultFallback?: string }
): string {
  return template.replace(/{{\s*([A-Z0-9_]+)\s*}}/g, (match, variableName) => {
    const variable = normalizePromptVariable(variables[variableName]);
    const fallback =
      variable.fallback ??
      (variable.format === "list" || variable.format === "lines" ? "None" : options?.defaultFallback ?? "N/A");
    const value = variable.value;
    const isEmptyArray = Array.isArray(value) && value.length === 0;
    const isEmptyString = value === "";

    if (value === undefined || value === null || isEmptyArray || isEmptyString) {
      console.warn("Prompt variable missing, using fallback.", { variableName });
      return fallback;
    }

    const formatted = formatVariable(value, variable.format);
    if (!formatted) return fallback;
    return formatted;
  });
}
