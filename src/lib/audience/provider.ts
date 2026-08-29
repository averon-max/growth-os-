import type {
  AudienceConnectionStatus,
  FetchAudienceParams,
  NormalizedAudienceSegment,
  RawAudienceRow,
} from "./types";

export interface AudienceProvider {
  getConnectionStatus(workspaceId: string): Promise<AudienceConnectionStatus>;
  fetchAudienceData(params: FetchAudienceParams): Promise<RawAudienceRow[]>;
  normalizeSegments(rows: RawAudienceRow[]): NormalizedAudienceSegment[];
}
