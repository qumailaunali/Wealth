export interface CurrencyInfo {
  code: string;
  name: string;
  /** Number of minor-unit digits (PKR/USD = 2, JPY = 0, KWD = 3) */
  decimals: number;
}

export const CURRENCIES: CurrencyInfo[] = [
  { code: "PKR", name: "Pakistani Rupee", decimals: 2 },
  { code: "USD", name: "US Dollar", decimals: 2 },
  { code: "EUR", name: "Euro", decimals: 2 },
  { code: "GBP", name: "British Pound", decimals: 2 },
  { code: "AED", name: "UAE Dirham", decimals: 2 },
  { code: "SAR", name: "Saudi Riyal", decimals: 2 },
  { code: "QAR", name: "Qatari Riyal", decimals: 2 },
  { code: "KWD", name: "Kuwaiti Dinar", decimals: 3 },
  { code: "OMR", name: "Omani Rial", decimals: 3 },
  { code: "INR", name: "Indian Rupee", decimals: 2 },
  { code: "BDT", name: "Bangladeshi Taka", decimals: 2 },
  { code: "CAD", name: "Canadian Dollar", decimals: 2 },
  { code: "AUD", name: "Australian Dollar", decimals: 2 },
  { code: "CNY", name: "Chinese Yuan", decimals: 2 },
  { code: "TRY", name: "Turkish Lira", decimals: 2 },
  { code: "MYR", name: "Malaysian Ringgit", decimals: 2 },
  { code: "JPY", name: "Japanese Yen", decimals: 0 },
];

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code) as [string, ...string[]];

export const LOCALES = [
  { value: "en-PK", label: "1,234,567.89 (Pakistan)" },
  { value: "en-IN", label: "12,34,567.89 (Lakh / Crore)" },
  { value: "en-US", label: "1,234,567.89 (US)" },
  { value: "en-GB", label: "1,234,567.89 (UK)" },
  { value: "de-DE", label: "1.234.567,89 (Europe)" },
  { value: "fr-FR", label: "1 234 567,89 (France)" },
] as const;

export const LOCALE_VALUES = LOCALES.map((l) => l.value) as [string, ...string[]];

export const TIMEZONES = [
  "Asia/Karachi",
  "Asia/Dubai",
  "Asia/Riyadh",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Kuala_Lumpur",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Istanbul",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Toronto",
  "Australia/Sydney",
  "UTC",
] as const;
