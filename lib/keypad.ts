import { MAX_MAJOR_DIGITS } from "./money";

export type KeypadKey =
  "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | "back" | "clear";

/** Pure reducer for the amount keypad. Keeps a canonical decimal string (no grouping). */
export function applyKey(current: string, key: KeypadKey, decimals: number): string {
  if (key === "clear") return "";
  if (key === "back") return current.slice(0, -1);
  if (key === ".") {
    if (decimals === 0 || current.includes(".")) return current;
    return current === "" ? "0." : `${current}.`;
  }
  const [whole = "", frac] = current.split(".");
  if (frac !== undefined) {
    if (frac.length >= decimals) return current;
    return current + key;
  }
  if (whole === "0") return key;
  if (whole.length >= MAX_MAJOR_DIGITS) return current;
  return current + key;
}

/** Pretty-print the keypad string with locale grouping, preserving a trailing "." while typing. */
export function formatKeypadDisplay(value: string, locale: string): string {
  if (!value) return "0";
  const [whole = "0", frac] = value.split(".");
  let grouped: string;
  try {
    grouped = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
      BigInt(whole || "0"),
    );
  } catch {
    grouped = whole;
  }
  if (frac === undefined) return grouped;
  const sep = (1.1).toLocaleString(locale).charAt(1) || ".";
  return `${grouped}${sep}${frac}`;
}
