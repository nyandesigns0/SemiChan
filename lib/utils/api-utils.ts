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

export function formatCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.0001) return `<$0.0001`;
  return `$${cost.toFixed(4)}`;
}

