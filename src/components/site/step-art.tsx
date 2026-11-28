import a from "./step-art.module.css";

/*
 * Small, product-like animations for the "how it works" steps: each one is a tiny piece of Hyprlyx's own UI
 * playing a slow loop. Pure SVG/HTML + CSS — nothing loads, and motion stops for people who turn it off.
 */
export type StepArtKind = "connect" | "serp" | "chart" | "publish";

export function StepArt({ kind }: { kind: StepArtKind }) {
  return (
    <div className={a.art} aria-hidden>
      {kind === "connect" ? <Connect /> : kind === "serp" ? <Serp /> : kind === "chart" ? <Chart /> : <Publish />}
    </div>
  );
}

/* Three sources connect one after another: spinner, then a green check and "Connected". */
function Connect() {
  const rows = ["Search Console", "Analytics 4", "Cloudflare"];
  return (
    <div className={a.panel}>
      {rows.map((r, i) => (
        <div key={r} className={a.src} style={{ ["--d" as string]: `${i * 0.9}s` }}>
          <span className={a.srcName}>{r}</span>
          <span className={a.state}>
            <span className={a.spin} />
            <span className={a.ok}>
              <svg viewBox="0 0 16 16" width="14" height="14">
                <circle cx="8" cy="8" r="7.25" />
                <path d="M4.8 8.2 7 10.4l4.2-4.6" />
              </svg>
              Connected
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

/* Your result climbs from #9 to #1 while the others shift down. */
function Serp() {
  return (
    <div className={a.panel}>
      <div className={a.query}>
        <svg viewBox="0 0 16 16" width="13" height="13"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
        data broker removal
      </div>
      <div className={a.results}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={a.result} style={{ ["--i" as string]: i }}>
            <i />
            <b />
          </div>
        ))}
        <div className={a.mine}>
          <span className={a.mineName}>nova.example</span>
          <span className={a.rank}>
            <span className={a.rankFrom}>#9</span>
            <span className={a.rankTo}>#1</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* Clicks grow: the area draws in, a dot rides the line, then the gain shows up. */
function Chart() {
  const line = "M4 82 C 30 78, 44 70, 64 72 S 100 60, 120 56 S 160 40, 182 30 S 214 14, 236 10";
  return (
    <div className={a.panel}>
      <div className={a.chartHead}>
        <span>Clicks</span>
        <span className={a.gain}>+38%</span>
      </div>
      <svg viewBox="0 0 240 92" className={a.chart}>
        <defs>
          <linearGradient id="stepArtFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#0090ff" stopOpacity=".28" />
            <stop offset="1" stopColor="#0090ff" stopOpacity="0" />
          </linearGradient>
          <clipPath id="stepArtReveal">
            <rect className={a.reveal} x="0" y="0" width="240" height="92" />
          </clipPath>
        </defs>
        {[24, 48, 72].map((y) => (
          <line key={y} x1="0" x2="240" y1={y} y2={y} className={a.grid} />
        ))}
        <g clipPath="url(#stepArtReveal)">
          <path d={`${line} L236 92 L4 92 Z`} fill="url(#stepArtFill)" />
          <path d={line} className={a.line} />
        </g>
        <circle r="4" className={a.rider}>
          <animateMotion dur="5.5s" repeatCount="indefinite" path={line} keyPoints="0;1;1" keyTimes="0;0.55;1" calcMode="linear" />
        </circle>
      </svg>
    </div>
  );
}

/* A draft fills in, then its status moves Draft → Approved → Published. */
function Publish() {
  return (
    <div className={a.panel}>
      <div className={a.docHead}>
        <span className={a.docTitle}>How data brokers work</span>
        <span className={a.status}>
          <span className={a.s1}>Draft</span>
          <span className={a.s2}>Approved</span>
          <span className={a.s3}>Published</span>
        </span>
      </div>
      <div className={a.lines}>
        {[100, 92, 96, 64, 88].map((w, i) => (
          <i key={i} style={{ width: `${w}%`, ["--d" as string]: `${i * 0.25}s` }} />
        ))}
      </div>
    </div>
  );
}
