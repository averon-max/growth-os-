export const KEYWORD_MARKETS = {
  US: {
    code: "US",
    label: "United States",
    locationName: "United States",
    languageName: "English",
    trendsGeo: "US",
  },
  CA: {
    code: "CA",
    label: "Canada",
    locationName: "Canada",
    languageName: "English",
    trendsGeo: "CA",
  },
  GB: {
    code: "GB",
    label: "United Kingdom",
    locationName: "United Kingdom",
    languageName: "English",
    trendsGeo: "GB",
  },
  AU: {
    code: "AU",
    label: "Australia",
    locationName: "Australia",
    languageName: "English",
    trendsGeo: "AU",
  },
} as const;

export type KeywordMarketCode = keyof typeof KEYWORD_MARKETS;

export function getKeywordMarket(code?: string) {
  const normalized = (code ?? "US").toUpperCase() as KeywordMarketCode;
  return KEYWORD_MARKETS[normalized] ?? KEYWORD_MARKETS.US;
}
