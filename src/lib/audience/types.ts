export interface AudienceCriteria {
  [key: string]: string | number;
}

export interface RawAudienceRow {
  segmentName: string;
  date: string;
  userCount: number;
  criteria: AudienceCriteria;
}

export interface NormalizedAudienceSegment {
  name: string;
  criteria: AudienceCriteria;
  rows: RawAudienceRow[];
}

export interface AudienceConnectionStatus {
  connected: boolean;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  lastSyncedAt: Date | null;
}

export interface FetchAudienceParams {
  workspaceId: string;
  websiteId: string;
  dateRange: { start: Date; end: Date };
}
