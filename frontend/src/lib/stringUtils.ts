export function toSnakeCase(str: string): string {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove non-word characters except spaces and hyphens
    .replace(/\s+/g, "_")
    .replace(/-+/g, "_");
}

export function formatFieldName(snakeStr: string, fallbackLabel?: string): string {
  if (fallbackLabel) return fallbackLabel;
  if (!snakeStr) return "";
  return snakeStr
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
