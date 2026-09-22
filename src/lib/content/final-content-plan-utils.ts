import {
  classifyPageType,
  type SerpPageType,
} from "./serp-utils";


export interface BenchmarkCandidate {
  fetched: boolean;

  statusCode:
    number | null;

  wordCount:
    number | null;

  h2: string[];
  h3: string[];
}


export interface OrganicCandidate {
  url: string;
  title: string;
}


export type TargetContentFormat =
  | SerpPageType
  | "HYBRID_TOOL_GUIDE";


export function isBenchmarkEligible(
  page:
    BenchmarkCandidate
): boolean {
  return (
    page.fetched &&
    page.statusCode !==
      null &&
    page.statusCode >=
      200 &&
    page.statusCode <
      400 &&
    (
      page.wordCount ??
      0
    ) >=
      500 &&
    (
      page.h2.length >=
        2 ||
      page.h3.length >=
        3
    )
  );
}


export function inferTargetFormat(
  organic:
    OrganicCandidate[]
): TargetContentFormat {
  const counts =
    new Map<
      SerpPageType,
      number
    >();

  for (
    const result of
    organic
  ) {
    const type =
      classifyPageType(
        result.url,
        result.title
      );

    counts.set(
      type,
      (
        counts.get(
          type
        ) ??
        0
      ) +
        1
    );
  }

  const tools =
    counts.get(
      "TOOL"
    ) ??
    0;

  const informational =
    (
      counts.get(
        "GUIDE"
      ) ??
      0
    ) +
    (
      counts.get(
        "ARTICLE"
      ) ??
      0
    ) +
    (
      counts.get(
        "LISTICLE"
      ) ??
      0
    );

  if (
    tools >= 2 &&
    informational >=
      1
  ) {
    return "HYBRID_TOOL_GUIDE";
  }

  const winner =
    Array.from(
      counts.entries()
    )
      .filter(
        ([type]) =>
          type !==
            "OTHER"
      )
      .sort(
        (a, b) =>
          b[1] -
          a[1]
      )[0];

  return (
    winner?.[0] ??
    "GUIDE"
  );
}
