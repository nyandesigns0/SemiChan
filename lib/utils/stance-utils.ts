export function stanceColor(s?: string): string {
  switch (s) {
    case "praise":
      return "#16a34a";
    case "critique":
      return "#dc2626";
    case "suggestion":
      return "#f59e0b";
    default:
      return "#64748b";
  }
}








