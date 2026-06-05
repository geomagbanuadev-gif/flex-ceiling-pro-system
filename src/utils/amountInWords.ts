const ONES = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const SCALES = ["", "thousand", "million", "billion"];

function threeDigits(n: number): string {
  let out = "";
  if (n >= 100) {
    out += ONES[Math.floor(n / 100)] + " hundred";
    n %= 100;
    if (n) out += " ";
  }
  if (n >= 20) {
    out += TENS[Math.floor(n / 10)];
    if (n % 10) out += "-" + ONES[n % 10];
  } else if (n > 0) {
    out += ONES[n];
  }
  return out;
}

function toWords(n: number): string {
  if (n === 0) return "zero";
  const parts: string[] = [];
  let scale = 0;
  while (n > 0) {
    const chunk = n % 1000;
    if (chunk) parts.unshift(threeDigits(chunk) + (SCALES[scale] ? " " + SCALES[scale] : ""));
    n = Math.floor(n / 1000);
    scale++;
  }
  return parts.join(" ");
}

/** "EIGHT THOUSAND FOUR HUNDRED DIRHAMS ONLY" (+ "AND XX FILS" when applicable). */
export function amountInWords(amount: number | null | undefined): string {
  const a = Number(amount) || 0;
  const dirhams = Math.floor(a);
  const fils = Math.round((a - dirhams) * 100);
  let s = toWords(dirhams).toUpperCase() + " DIRHAM" + (dirhams === 1 ? "" : "S");
  if (fils > 0) s += " AND " + toWords(fils).toUpperCase() + " FILS";
  return s + " ONLY";
}
