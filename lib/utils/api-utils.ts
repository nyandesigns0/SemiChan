import { TokenUsage } from "@/types/api";

export function calculateCost(model: string, usage?: TokenUsage): number {
  if (!usage) return 0;

  const modelLower = model.toLowerCase();
  
  // Pricing per 1M tokens (USD)
  let promptPrice = 0;
  let completionPrice = 0;

  if (modelLower.includes("gpt-4o-mini") || modelLower.includes("mini")) {
    promptPrice = 0.15;
    completionPrice = 0.60;
  } else if (modelLower.includes("gpt-4o")) {
    promptPrice = 2.50;
    completionPrice = 10.00;
  } else if (modelLower.includes("gpt-5")) {
    // Fictional pricing for placeholders
    promptPrice = 5.00;
    completionPrice = 15.00;
  } else if (modelLower.includes("gpt-4")) {
    promptPrice = 30.00;
    completionPrice = 60.00;
  } else {
    // Default to gpt-4o pricing for unknown models
    promptPrice = 2.50;
    completionPrice = 10.00;
  }

  const cost = (usage.prompt_tokens / 1000000) * promptPrice + 
               (usage.completion_tokens / 1000000) * completionPrice;
  
  return cost;
}

/**
 * Normalizes a model name (potentially with spaces or custom branding)
 * into a valid OpenAI model ID.
 */
export function normalizeModelId(model: string): string {
  const m = model.toLowerCase();
  
  if (m.includes("gpt-4o-mini") || m.includes("mini") || m.includes("nano")) {
    return "gpt-4o-mini";
  }
  if (m.includes("gpt-4o") || m.includes("gpt-4.1") || m.includes("gpt-4")) {
    return "gpt-4o";
  }
  if (m.includes("gpt-5")) {
    // GPT-5 doesn't exist yet, fallback to gpt-4o for now
    return "gpt-4o";
  }
  
  // Default fallback
  return "gpt-4o-mini";
}

export function formatCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.0001) return `<$0.0001`;
  return `$${cost.toFixed(4)}`;
}

/**
 * Returns a human-readable cost display. Values under one dollar are shown as cents
 * (still prefixed with $) and labeled accordingly.
 */
export function formatCostReadable(cost: number): { amount: string; unit: "cost" | "cents" } {
  if (!Number.isFinite(cost) || cost <= 0) {
    return { amount: "$0.00", unit: "cents" };
  }

  if (cost < 1) {
    const cents = cost * 100;
    if (cents < 0.01) {
      return { amount: "<$0.01", unit: "cents" };
    }
    const precision = cents < 1 ? 2 : cents < 10 ? 1 : 0;
    return { amount: `$${cents.toFixed(precision)}`, unit: "cents" };
  }

  const amount = cost >= 100 ? `$${cost.toFixed(0)}` : `$${cost.toFixed(2)}`;
  return { amount, unit: "cost" };
}
