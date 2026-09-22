export interface KeywordAdvancedFilters {
  minVolume?: number;
  maxVolume?: number;

  minKd?: number;
  maxKd?: number;

  minCpc?: number;
  maxCpc?: number;

  minCompetition?: number;
  maxCompetition?: number;

  minPosition?: number;
  maxPosition?: number;

  minImpressions?: number;
  maxImpressions?: number;

  minClicks?: number;
  maxClicks?: number;

  minCtr?: number;
  maxCtr?: number;

  minWords?: number;
  maxWords?: number;

  include?: string;
  exclude?: string;
  exact?: string;

  hasVolume?: boolean;
  hasRanking?: boolean;
}

export function countActiveFilters(filters: KeywordAdvancedFilters): number {
  return Object.values(filters).filter(
    value =>
      value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== false,
  ).length;
}

export function wordCount(keyword: string): number {
  return keyword.trim().split(/\\s+/).filter(Boolean).length;
}

export function matchesTextFilters(
  keyword: string,
  filters: KeywordAdvancedFilters,
): boolean {
  const value = keyword.toLowerCase();

  if (filters.include) {
    const terms = filters.include
      .split(",")
      .map(v => v.trim().toLowerCase())
      .filter(Boolean);

    if (terms.length && !terms.every(term => value.includes(term))) {
      return false;
    }
  }

  if (filters.exclude) {
    const terms = filters.exclude
      .split(",")
      .map(v => v.trim().toLowerCase())
      .filter(Boolean);

    if (terms.some(term => value.includes(term))) {
      return false;
    }
  }

  if (filters.exact && value !== filters.exact.trim().toLowerCase()) {
    return false;
  }

  const words = wordCount(keyword);

  if (filters.minWords !== undefined && words < filters.minWords) {
    return false;
  }

  if (filters.maxWords !== undefined && words > filters.maxWords) {
    return false;
  }

  return true;
}
