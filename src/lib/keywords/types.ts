export type KeywordIntent =
  | "INFORMATIONAL"
  | "COMMERCIAL"
  | "TRANSACTIONAL"
  | "NAVIGATIONAL";

export type ProviderType = "GOOGLE_SEARCH_CONSOLE";

export type ProviderStatus = "CONNECTED" | "DISCONNECTED" | "ERROR";

export interface KeywordData {
  text: string;
  normalized: string;
  intent?: KeywordIntent;
  cluster?: string;
  volume?: number;
  difficulty?: number;
  cpc?: number;
}

export interface SnapshotData {
  date: Date;
  position?: number;
  clicks?: number;
  impressions?: number;
  ctr?: number;
  device: string;
  country: string;
  source: ProviderType;
  retrievedAt: Date;
}

export interface KeywordWithSnapshots extends KeywordData {
  id: string;
  workspaceId: string;
  snapshots: SnapshotData[];
}

export interface KeywordProvenance {
  provider: ProviderType;
  retrievedAt: Date;
  dateRangeStart: Date;
  dateRangeEnd: Date;
  country: string;
  device: string;
}

export interface KeywordSignal {
  type:
    | "QUICK_WIN"
    | "HIGH_IMPRESSION_LOW_CTR"
    | "DECLINING"
    | "GROWING"
    | "LOST";
  keywordId: string;
  keyword: string;
  evidence: Record<string, number | string>;
}

export interface ProviderConnectionStatus {
  provider: ProviderType;
  status: ProviderStatus;
  expiresAt?: Date;
}
