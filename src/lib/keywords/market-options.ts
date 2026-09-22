export const MARKET_OPTIONS = [
  {
    code: "US",
    label: "United States",
    locationName: "United States",
    language: "English",
  },
  {
    code: "CA",
    label: "Canada",
    locationName: "Canada",
    language: "English",
  },
  {
    code: "GB",
    label: "United Kingdom",
    locationName: "United Kingdom",
    language: "English",
  },
  {
    code: "AU",
    label: "Australia",
    locationName: "Australia",
    language: "English",
  },
] as const;

export type MarketCode = (typeof MARKET_OPTIONS)[number]["code"];

export const INTENT_OPTIONS = [
  "ALL",
  "INFORMATIONAL",
  "COMMERCIAL",
  "TRANSACTIONAL",
  "NAVIGATIONAL",
] as const;

export type IntentOption = (typeof INTENT_OPTIONS)[number];

export const RANKING_PRESETS = [
  { value: "top3", label: "Top 3", min: 1, max: 3 },
  { value: "top10", label: "Top 10", min: 1, max: 10 },
  { value: "top20", label: "Top 20", min: 1, max: 20 },
  { value: "top50", label: "Top 50", min: 1, max: 50 },
  { value: "top100", label: "Top 100", min: 1, max: 100 },
  { value: "page2", label: "Page 2", min: 11, max: 20 },
] as const;
