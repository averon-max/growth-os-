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
  provider: "GOOGLE_ANALYTICS_4";
  status: "CONNECTED" | "DISCONNECTED" | "ERROR";
  expiresAt?: Date;
}

export interface FetchAudienceParams {
  workspaceId: string;
  propertyId: string;
  startDate: Date;
  endDate: Date;
}
