export function safeDocumentListPath(value: unknown, fallback: string) {
  return typeof value === "string" && (value === "/quotes" || value.startsWith("/quotes?")) ? value : fallback;
}
