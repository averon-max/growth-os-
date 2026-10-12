"use client";

import styles from "./keyword-orbit-visualization.module.css";

interface KeywordOrbitVisualizationProps {
  topic: string;
  keywords?: readonly string[];
}

/**
 * Purely visual, deterministic rendering of the current seed and previously
 * observed queries. No keyword discovery, fake scoring, network, or timers.
 */
export function KeywordOrbitVisualization({
  topic,
  keywords = [],
}: KeywordOrbitVisualizationProps) {
  const seed = topic.trim() || "Your next article";
  const unique = new Set<string>();
  const observed = [seed, ...keywords]
    .map(word => word.trim())
    .filter(word => {
      const key = word.toLocaleLowerCase("en-US");
      if (!key || unique.has(key)) return false;
      unique.add(key);
      return true;
    })
    .slice(0, 9);

  const words = [
    observed[0] ?? seed,
    observed[1] ?? "SEARCH INTENT",
    observed[2] ?? "KEYWORD CLUSTERS",
    observed[3] ?? "SEARCH DEMAND",
    observed[4] ?? "SERP ANALYSIS",
    observed[5] ?? "TOPIC AUTHORITY",
    observed[6] ?? "TREND SIGNALS",
    observed[7] ?? "RANK OPPORTUNITY",
    observed[8] ?? "CONTENT EVIDENCE",
  ];
  const orbitalLabels = words.slice(1);

  return (
    <div
      className={styles.stage}
      aria-hidden="true"
      data-testid="keyword-orbit-visualization"
    >
      <div className={styles.backGlow} />
      <div className={styles.starField} />
      <div className={styles.ambientRing} />
      <div className={styles.ambientRingTwo} />

      <div className={styles.orbitOuter}>
        <div className={styles.orbitPath} />
        {orbitalLabels.slice(0, 4).map((word, index) => (
          <div
            key={index}
            className={styles[`point${index}`]}
          >
            <span className={styles.outerCounter}>
              <span className={styles.keywordChip} title={word}>
                <span className={styles.keywordDot} />
                {word}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className={styles.orbitInner}>
        <div className={styles.innerPath} />
        {orbitalLabels.slice(4, 8).map((word, index) => (
          <div
            key={index}
            className={styles[`innerPoint${index}`]}
          >
            <span className={styles.innerCounter}>
              <span className={styles.keywordChip} title={word}>
                <span className={styles.keywordDot} />
                {word}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className={styles.coreHalo} />
      <div className={styles.core}>
        <div className={styles.coreShine} />
        <div className={styles.coreGrid} />
        <div className={styles.coreContent}>
          <span className={styles.coreEyebrow}>GROWTH OS</span>
          <span className={styles.coreIcon}>✳</span>
          <strong>SEO INTELLIGENCE</strong>
        </div>
      </div>

      <div className={styles.orbitCaption}>
        <span className={styles.captionDot} />
        <span className={styles.captionText} title={seed}>{seed}</span>
        <span className={styles.captionSeparator}>/</span>
        <span>KEYWORD UNIVERSE</span>
      </div>
    </div>
  );
}
