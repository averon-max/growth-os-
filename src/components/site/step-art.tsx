import a from "./step-art.module.css";

/*
 * Small, product-like animations for the "how it works" steps. Each one is a tiny piece of Hyprlyx playing a
 * slow loop: data flowing in from three sources, a result climbing Google, a chart drawing itself, an article
 * moving from draft to live. Pure SVG + CSS, one accent colour, no glow; motion stops for people who turn it off.
 */
export type StepArtKind = "connect" | "serp" | "chart" | "publish";

export function StepArt({ kind }: { kind: StepArtKind }) {
  return (
    <div className={a.art} aria-hidden>
      {kind === "connect" ? <Connect /> : kind === "serp" ? <Serp /> : kind === "chart" ? <Chart /> : <Publish />}
    </div>
  );
}

/* Three sources on the left; a pulse travels along each line into Hyprlyx, then the source shows a check. */
function Connect() {
  const rows = [
    { name: "Search Console", y: 30 },
    { name: "Analytics 4", y: 75 },
    { name: "Cloudflare", y: 120 },
  ];
  return (
    <div className={a.panel}>
      <svg className={a.wires} viewBox="0 0 300 150" preserveAspectRatio="none">
        {rows.map((r, i) => (
          <g key={r.name} style={{ ["--d" as string]: `${i * 0.7}s` }}>
            <path className={a.wire} d={`M132 ${r.y} C 190 ${r.y}, 200 75, 246 75`} />
            <path className={a.pulse} d={`M132 ${r.y} C 190 ${r.y}, 200 75, 246 75`} pathLength={100} />
          </g>
        ))}
      </svg>
      {rows.map((r, i) => (
        <div key={r.name} className={a.chip} style={{ top: r.y - 13, ["--d" as string]: `${i * 0.7}s` }}>
          <span className={a.chipDot} />
          {r.name}
          <svg className={a.chipOk} viewBox="0 0 16 16" width="13" height="13">
            <path d="M4 8.4 6.8 11 12 5.4" />
          </svg>
        </div>
      ))}
      <div className={a.hub}>h</div>
    </div>
  );
}

/* A Google result list: nova.example climbs from fourth place to first while the others step down. */
function Serp() {
  const others = ["eraseit.example", "privly.example", "clearpath.example"];
  return (
    <div className={a.panel}>
      <div className={a.query}>
        <svg viewBox="0 0 16 16" width="12" height="12"><circle cx="7" cy="7" r="4.5" /><path d="m10.4 10.4 3 3" /></svg>
        data broker removal
      </div>
      <div className={a.results}>
        {others.map((o, i) => (
          <div key={o} className={a.res} style={{ ["--i" as string]: i }}>
            <span className={a.fav} />
            <span className={a.resText}><b>{o}</b><i /></span>
          </div>
        ))}
        <div className={`${a.res} ${a.mine}`}>
          <span className={a.favMine}>h</span>
          <span className={a.resText}><b>nova.example</b><i /></span>
          <span className={a.rank}><span>#4</span><span>#1</span></span>
        </div>
      </div>
    </div>
  );
}

/* Bars rise day by day, the trend line draws over them and a marker settles on today with the gain. */
function Chart() {
  const bars = [34, 40, 37, 48, 45, 56, 52, 63, 61, 72, 70, 84];
  const pts = bars.map((v, i) => `${14 + i * 24},${128 - v * 1.1}`).join(" ");
  return (
    <div className={a.panel}>
      <div className={a.chartHead}>
        <span>Clicks · 28 days</span>
        <span className={a.gain}>↑ 38%</span>
      </div>
      <svg className={a.chart} viewBox="0 0 300 140" preserveAspectRatio="none">
        <line x1="0" x2="300" y1="128.5" y2="128.5" className={a.base} />
        {bars.map((v, i) => (
          <rect key={i} className={a.bar} x={6 + i * 24} y={128 - v * 1.1} width="16" height={v * 1.1} rx="3" style={{ ["--i" as string]: i }} />
        ))}
        <polyline className={a.trend} points={pts} pathLength={100} />
        <circle className={a.dot} cx={14 + 11 * 24} cy={128 - 84 * 1.1} r="4.5" />
      </svg>
    </div>
  );
}

/* A draft writes itself, then moves along Draft → In review → Approved → Live; the last step lights up. */
function Publish() {
  const steps = ["Draft", "Review", "Approved", "Live"];
  return (
    <div className={a.panel}>
      <div className={a.doc}>
        <span className={a.docTitle} />
        <span className={a.line} style={{ ["--w" as string]: "92%", ["--i" as string]: 0 }} />
        <span className={a.line} style={{ ["--w" as string]: "78%", ["--i" as string]: 1 }} />
        <span className={a.line} style={{ ["--w" as string]: "86%", ["--i" as string]: 2 }} />
      </div>
      <div className={a.track}>
        <span className={a.trackFill} />
        {steps.map((s, i) => (
          <span key={s} className={a.step} style={{ ["--i" as string]: i }}>
            <span className={a.stepDot} />
            <span className={a.stepName}>{s}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
