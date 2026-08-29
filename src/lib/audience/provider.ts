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

// TODO(следующий слайс): GA4Provider implements AudienceProvider —
// по образцу gsc-provider.ts, тот же token-crypto.ts, provider = GOOGLE_ANALYTICS_4.
// Пока провайдера нет — repository.ts обязан честно отдавать пустой список.
