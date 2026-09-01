export type CMSType = "CUSTOM_API" | "WORDPRESS";

export type CMSConnectionStatus = "CONNECTED" | "DISCONNECTED" | "ERROR";

export type FixType =
  | "META_TITLE"
  | "META_DESCRIPTION"
  | "H1"
  | "ALT_TEXT"
  | "CANONICAL"
  | "INTERNAL_LINK"
  | "CONTENT";

export type FixRiskLevel = "SAFE" | "REVIEW" | "DANGEROUS";

export type AppliedFixStatus = "PENDING" | "SUCCESS" | "FAILED" | "ROLLED_BACK";

export interface CMSConnectionInfo {
  cmsType: CMSType;
  status: CMSConnectionStatus;
  siteUrl: string;
  lastConnectedAt: Date | null;
  lastError: string | null;
}

export interface ApplyFixRequest {
  pageUrl: string;
  fixType: FixType;
  newValue: string;
}

export interface ApplyFixResult {
  status: "SUCCESS" | "FAILED";
  previousValue: string | null;
  errorMessage: string | null;
  verified: boolean;
}

export interface PublishContentRequest {
  title: string;
  metaDescription: string;
  h1: string;
  bodyMarkdown: string;
}

export interface PublishContentResult {
  status: "SUCCESS" | "FAILED";
  publishedUrl: string | null;
  errorMessage: string | null;
}
