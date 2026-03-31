export function isNullableHttpUrl(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value !== "string") return false;

  const trimmed = value.trim();
  if (trimmed === "") return true;
  if (trimmed.toLowerCase().startsWith("data:")) return false;

  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

