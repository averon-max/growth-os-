import type {
  KeywordData,
  SnapshotData,
  KeywordProvenance,
  ProviderConnectionStatus,
} from "./types";

export interface SearchConsoleRow {
  keyword: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  date: Date;
  device: string;
  country: string;
}

export interface KeywordMetricsResult {
  keyword: string;
  volume?: number;
  difficulty?: number;
  cpc?: number;
}

export interface KeywordProvider {
  readonly providerType: "GOOGLE_SEARCH_CONSOLE";

  /**
   * Returns current connection status for this workspace.
   */
  getConnectionStatus(workspaceId: string): Promise<ProviderConnectionStatus>;

  /**
   * Fetches raw search performance rows for the given site and date range.
   * Returns normalized internal rows — no provider-specific fields leak out.
   */
  fetchSearchPerformance(options: {
    workspaceId: string;
    siteUrl: string;
    startDate: Date;
    endDate: Date;
    device?: string;
    country?: string;
  }): Promise<SearchConsoleRow[]>;

  /**
   * Converts raw provider rows into KeywordData + SnapshotData pairs
   * ready for upsert into the database.
   */
  normalizeRows(
    rows: SearchConsoleRow[],
    provenance: KeywordProvenance
  ): Array<{ keyword: KeywordData; snapshot: SnapshotData }>;
}
