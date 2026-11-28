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
  // Line icons (lucide shapes): search for Search Console, columns for Analytics, a cloud for Cloudflare.
  const rows = [
    { name: "Search Console", y: 30, icon: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></> },
    { name: "Analytics 4", y: 75, icon: <><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></> },
    { name: "Cloudflare", y: 120, icon: <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /> },
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
          <svg className={a.chipIcon} viewBox="0 0 24 24" width="12" height="12">{r.icon}</svg>
          {r.name}
          <svg className={a.chipOk} viewBox="0 0 16 16" width="13" height="13">
            <path d="M4 8.4 6.8 11 12 5.4" />
          </svg>
        </div>
      ))}
      <div className={a.hub}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mark-v2.webp" alt="" width={26} height={26} />
        <span className={a.ripple} />
        <span className={a.ripple} style={{ animationDelay: "3.35s" }} />
      </div>
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
            <svg className={a.fav} viewBox="0 0 24 24" width="12" height="12"><circle cx="12" cy="12" r="9" /><path d="M12 3a13 13 0 0 0 0 18 13 13 0 0 0 0-18" /><path d="M3 12h18" /></svg>
            <span className={a.resText}><b>{o}</b><i /></span>
          </div>
        ))}
        <div className={`${a.res} ${a.mine}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={a.favMine} src="/brand/mark-v2.webp" alt="" width={12} height={12} />
          <span className={a.resText}><b>nova.example</b><i /></span>
          <span className={a.rank}><span>#4</span><span>#1</span></span>
          <span className={a.up}>↑3</span>
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
        <span className={a.gain}>
          <svg viewBox="0 0 24 24" width="12" height="12"><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></svg>
          38%
        </span>
      </div>
      <svg className={a.chart} viewBox="0 0 300 140" preserveAspectRatio="none">
        <line x1="0" x2="300" y1="128.5" y2="128.5" className={a.base} />
        {bars.map((v, i) => (
          <rect key={i} className={i === bars.length - 1 ? `${a.bar} ${a.barNow}` : a.bar} x={6 + i * 24} y={128 - v * 1.1} width="16" height={v * 1.1} rx="3" style={{ ["--i" as string]: i }} />
        ))}
        <polyline className={a.trend} points={pts} pathLength={100} />
        {[40, 80].map((y) => <line key={y} x1="0" x2="300" y1={y + 0.5} y2={y + 0.5} className={a.gridLine} />)}
        <polygon className={a.area} points={`14,128 ${pts} ${14 + 11 * 24},128`} />
        <circle className={a.dotRing} cx={14 + 11 * 24} cy={128 - 84 * 1.1} r="4.5" />
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
        <span className={a.caret} />
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
