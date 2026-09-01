import type { CMSConnectionInfo, ApplyFixRequest, ApplyFixResult, FixType, CMSType, PublishContentRequest, PublishContentResult } from "./types";

export const SUPPORTED_FIX_TYPES: readonly FixType[] = ["META_TITLE"];

export class UnsupportedFixTypeError extends Error {
  constructor(fixType: FixType) {
    super(`Fix type "${fixType}" is not supported by this CMS provider yet.`);
    this.name = "UnsupportedFixTypeError";
  }
}

export class CMSNotConnectedError extends Error {
  constructor(message = "CMS is not connected for this website") {
    super(message);
    this.name = "CMSNotConnectedError";
  }
}

export class PostResolutionError extends Error {
  constructor(pageUrl: string) {
    super(`Could not resolve a WordPress post or page for URL: ${pageUrl}`);
    this.name = "PostResolutionError";
  }
}

export interface CMSProvider {
  readonly cmsType: CMSType;

  getConnectionInfo(websiteId: string): Promise<CMSConnectionInfo>;

  verifyCredentials(siteUrl: string, username: string, password: string): Promise<{ valid: boolean; error: string | null }>;

  applyFix(websiteId: string, request: ApplyFixRequest): Promise<ApplyFixResult>;

  publishContent(websiteId: string, request: PublishContentRequest): Promise<PublishContentResult>;
}
