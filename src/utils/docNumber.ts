// Sequential document numbering. Finds the highest trailing number across the
// given list and returns the next one, zero-padded to 4 digits.
// e.g. nextDocNumber(["PF-0006","PF-0010"], "PF-") -> "PF-0011"
export function nextDocNumber(numbers: (string | null | undefined)[], prefix: string): string {
  let max = 0;
  for (const n of numbers) {
    const m = String(n ?? "").match(/(\d+)\s*$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return prefix + String(max + 1).padStart(4, "0");
}
