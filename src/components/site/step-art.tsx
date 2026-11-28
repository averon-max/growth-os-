import a from "./step-art.module.css";

/*
 * Line illustrations for the "how it works" steps: thin grey strokes, one blue accent, one slow loop each.
 * Pure SVG + CSS, so nothing loads and motion stops for people who turn it off.
 */
export type StepArtKind = "connect" | "serp" | "chart" | "publish";

export function StepArt({ kind }: { kind: StepArtKind }) {
  return (
    <div className={a.art} aria-hidden>
      {kind === "connect" ? <Connect /> : kind === "serp" ? <Serp /> : kind === "chart" ? <Chart /> : <Publish />}
    </div>
  );
}

function Connect() {
  const nodes = [
    { x: 30, y: 26, t: "GSC" },
    { x: 30, y: 74, t: "GA4" },
    { x: 30, y: 122, t: "CF" },
  ];
  return (
    <svg viewBox="0 0 240 148" className={a.svg}>
      {nodes.map((n, i) => (
        <g key={n.t}>
          <path d={`M${n.x + 28} ${n.y} C 120 ${n.y}, 120 74, 176 74`} className={a.wire} />
          <path d={`M${n.x + 28} ${n.y} C 120 ${n.y}, 120 74, 176 74`} className={a.flow} style={{ animationDelay: `${i * 0.6}s` }} />
          <rect x={n.x - 26} y={n.y - 15} width="54" height="30" rx="8" className={a.box} />
          <text x={n.x + 1} y={n.y + 4} className={a.label}>{n.t}</text>
        </g>
      ))}
      <rect x="176" y="50" width="56" height="48" rx="12" className={a.hub} />
      <text x="204" y="80" className={a.hubText}>h</text>
    </svg>
  );
}

function Serp() {
  return (
    <svg viewBox="0 0 240 148" className={a.svg}>
      <rect x="8" y="6" width="224" height="26" rx="13" className={a.box} />
      <circle cx="24" cy="19" r="5" className={a.stroke} />
      <path d="M28 23 L32 27" className={a.stroke} />
      <rect x="42" y="16" width="84" height="6" rx="3" className={a.ghost} />
      {[44, 72, 100, 128].map((y) => (
        <g key={y}>
          <rect x="12" y={y} width="60" height="5" rx="2.5" className={a.ghost} />
          <rect x="12" y={y + 10} width="150" height="5" rx="2.5" className={a.ghostSoft} />
        </g>
      ))}
      <g className={a.rise}>
        <rect x="6" y="122" width="228" height="26" rx="7" className={a.mine} />
        <rect x="12" y="128" width="70" height="5" rx="2.5" className={a.accent} />
        <rect x="12" y="138" width="130" height="5" rx="2.5" className={a.accentSoft} />
        <text x="226" y="139" className={a.rank}>#1</text>
      </g>
    </svg>
  );
}

function Chart() {
  const bars = [26, 34, 30, 44, 52, 48, 66, 78, 92, 104];
  return (
    <svg viewBox="0 0 240 148" className={a.svg}>
      {[36, 72, 108].map((y) => (
        <line key={y} x1="8" x2="232" y1={y} y2={y} className={a.grid} />
      ))}
      {bars.map((h, i) => (
        <rect key={i} x={12 + i * 22} y={140 - h} width="14" height={h} rx="3" className={i === bars.length - 1 ? a.barHot : a.bar} style={{ animationDelay: `${i * 0.08}s` }} />
      ))}
      <path d="M19 110 L41 104 L63 108 L85 96 L107 88 L129 92 L151 74 L173 62 L195 48 L217 34" className={a.line} />
    </svg>
  );
}

function Publish() {
  return (
    <svg viewBox="0 0 240 148" className={a.svg}>
      <rect x="40" y="6" width="130" height="136" rx="10" className={a.box} />
      <rect x="54" y="22" width="80" height="8" rx="4" className={a.ghost} />
      {[44, 58, 72, 86, 100, 114].map((y, i) => (
        <rect key={y} x="54" y={y} width={i % 3 === 2 ? 70 : 102} height="5" rx="2.5" className={a.type} style={{ animationDelay: `${i * 0.25}s` }} />
      ))}
      <g className={a.check}>
        <circle cx="184" cy="112" r="22" className={a.done} />
        <path d="M174 112 L181 119 L195 105" className={a.tick} />
      </g>
    </svg>
  );
}
