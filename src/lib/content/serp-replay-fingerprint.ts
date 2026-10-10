import { createHash } from "node:crypto";

export interface SerpReplayArticleFingerprintInputV1 {
  title:
    string;

  metaDescription:
    string;

  h1:
    string;

  bodyMarkdown:
    string;
}

export function buildSerpReplayArticleFingerprintV1(
  article:
    Readonly<
      SerpReplayArticleFingerprintInputV1
    >
): string {
  /*
   * Fixed field order is intentional.
   *
   * The fingerprint binds a replay artifact to the exact article
   * representation that was compared.
   */
  const canonical =
    JSON.stringify({
      version:
        "SERP_REPLAY_ARTICLE_FINGERPRINT_V1",

      title:
        article.title,

      metaDescription:
        article.metaDescription,

      h1:
        article.h1,

      bodyMarkdown:
        article.bodyMarkdown,
    });


  return createHash(
    "sha256"
  )
    .update(
      canonical,
      "utf8"
    )
    .digest(
      "hex"
    );
}
