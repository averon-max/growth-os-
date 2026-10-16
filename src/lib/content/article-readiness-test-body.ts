/*
 * Test-only helper.
 *
 * Builds a structurally valid article body for a plan: one heading per
 * WRITABLE section (at the planned level) plus neutral body words.
 * Total length is ~2600 words so comprehensive-informational fixtures
 * land inside the 2000-3200 product-specific editorial range.
 */
export function buildCompliantArticleBody(
  plan: {
    readonly sections: readonly {
      readonly state: string;
      readonly heading: string;
      readonly level?: number;
    }[];
  },
  totalWords = 2600
): string {
  const writable =
    plan.sections.filter(
      (section) =>
        section.state ===
        "WRITABLE"
    );

  const perSection =
    Math.max(
      1,
      Math.round(
        totalWords /
          Math.max(
            1,
            writable.length
          )
      )
    );

  return writable
    .map(
      (section) =>
        [
          `${"#".repeat(
            section.level ?? 2
          )} ${section.heading}`,
          "",
          Array.from(
            { length: perSection },
            () => "explained"
          ).join(" "),
        ].join("\n")
    )
    .join("\n\n");
}
