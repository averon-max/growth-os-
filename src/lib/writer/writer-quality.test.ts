import { describe, expect, it } from "vitest";
import { cleanSectionText } from "./article-writer";
import { checkRepair, groupRepairs, mergeIssue, parseScorecard } from "./editorial-scorecard";
import type { LedgerEntry, ScorecardIssue } from "./editorial-scorecard";
import { evaluateReadiness, evidenceIssues, hasConcreteValue, quoteInText, quoteMatchesClaim } from "./publication-readiness";
import type { EvidenceRecord } from "./publication-readiness";
import { chatJson, LlmJsonError } from "./llm-json";
import { validateStepOrder } from "./procedure-order";
import { extractPlanTools, isOptionalTool, missingPlanTools, toolMentioned, toolName, toolsSectionIndex } from "./plan-binding";
import { checkFormat, firstSentence, formatContract } from "./format-contract";
import { overBudget, resetUsage, stepOf, tracked, usageTotals } from "./usage";
import { TEMPLATES } from "./templates";
import type OpenAI from "openai";
import { buildOutlineFromSerp } from "./orchestrator";
import { getTemplate } from "./templates";

describe("cleanSectionText", () => {
  it("applies US locale but keeps rules labeled as British", () => {
    expect(cleanSectionText("open the boot")).toBe("open the trunk");
    expect(cleanSectionText("the RAC says not to place one on a motorway")).toBe("the RAC says not to place one on a motorway"); // a quoted UK rule keeps its meaning
    expect(cleanSectionText("On a UK motorway, do not")).toBe("On a UK motorway, do not");
  });
  it("strips meta phrases without breaking normal English", () => {
    expect(cleanSectionText("under the established conditions")).toBe("under the conditions");
    expect(cleanSectionText("an established brand")).toBe("an established brand");
  });
  it("removes 'Source:' labels that the publish gate blocks, keeping the link", () => {
    expect(cleanSectionText("Wait ([Source: RAC](https://r.co/x)).")).toBe("Wait ([RAC](https://r.co/x)).");
    expect(cleanSectionText("Source: [RAC](https://r.co/x)")).toBe("[RAC](https://r.co/x)");
    expect(cleanSectionText("the power source: a battery")).toBe("the power source: a battery");
  });
});

describe("parseScorecard", () => {
  it("clamps scores, caps dimensions by issue severity, computes overall itself, keeps only issues on real headings", () => {
    const sc = parseScorecard(JSON.stringify({
      scores: { seo: 9, content: 8.5, eeat: 9, aeo: 9, geo: 9, ux: 12, business: 9 },
      issues: [
        { section: "## Remove the flat tire", dimension: "E-E-A-T", severity: "critical", problem: "p", fix: "f" },
        { section: "Nope", dimension: "ux", problem: "p", fix: "f" },
        { section: "Remove the Flat Tire", dimension: "ux", severity: "major", problem: "p", fix: "f" },
      ],
      closure: [{ id: "K1", closed: true, reason: "fixed" }, { id: "K2", closed: "yes" }],
    }), ["Remove the Flat Tire", "Frequently Asked Questions"]);
    expect(sc?.scores.eeat).toBe(6); // critical caps at 6
    expect(sc?.scores.ux).toBe(8); // major caps at 8
    expect(sc?.overall).toBe(8.4);
    expect(sc?.issues).toHaveLength(2);
    expect(sc?.issues[0].severity).toBe("critical");
    expect(sc?.closure.K1.closed).toBe(true);
    expect(sc?.closure.K2.closed).toBe(false); // only a literal true closes an issue
  });
  it("rejects a scorecard with a missing dimension", () => {
    expect(parseScorecard('{"scores":{"seo":9}}', [])).toBe(null);
  });
});

describe("evidence and readiness", () => {
  it("accepts a quote only when it is really in the fetched page text", () => {
    const page = "Before you drive, check the pressure of the spare tire with a tire gauge and inflate it as needed.";
    expect(quoteInText("check the pressure of the spare tire with a tire gauge", page)).toBe(true);
    expect(quoteInText("always check the spare with a gauge before driving anywhere", page)).toBe(false);
  });
  it("is READY only with no failures, score >= minimum and no open critical issue", () => {
    expect(evaluateReadiness({ qualityFailures: [], finalScore: 9.2, minScore: 9, openCritical: [], evidence: [] }).status).toBe("READY");
    expect(evaluateReadiness({ qualityFailures: [], finalScore: 8.7, minScore: 9, openCritical: [], evidence: [] }).status).toBe("REVIEW_REQUIRED");
    expect(evaluateReadiness({ qualityFailures: [], finalScore: 9.6, minScore: 9, openCritical: [{ id: "K1", section: "Lower Car", source: "feasibility", problem: "MISSING_TOOL" }], evidence: [] }).status).toBe("REVIEW_REQUIRED");
  });
});

describe("checkRepair", () => {
  const orig = "### A\n\nText one two three four five six seven eight nine ten ([X](https://a.com/p)).\n\n| a | b |\n|---|---|\n| 1 | 2 |";
  const allowed = new Set(["https://a.com/p", "https://b.gov/q"]);
  it("accepts an edit that adds a pool link", () => {
    expect(checkRepair(orig, orig.replace("ten", "ten eleven ([Y](https://b.gov/q))"), allowed, false)).toHaveLength(0);
  });
  it("rejects dropped links, invented links, renamed subheadings and dropped tables", () => {
    expect(checkRepair(orig, orig.replace("([X](https://a.com/p))", "(X)"), allowed, false)).toContain("dropped a link");
    expect(checkRepair(orig, orig + " [Z](https://z.com)", allowed, false)).toContain("link outside the verified pool");
    expect(checkRepair(orig, orig.replace("### A", "### B"), allowed, false)).toContain("subheadings changed");
    expect(checkRepair(orig, orig.split("\n\n| a")[0], allowed, false)).toContain("dropped the table");
  });
  it("allows a requested shortening when the dropped link is still cited elsewhere", () => {
    const short = "### A\n\nText one two three four five six.\n\n| a | b |\n|---|---|\n| 1 | 2 |";
    expect(checkRepair(orig, short, allowed, false)).toContain("dropped a link");
    expect(checkRepair(orig, short, allowed, false, { minRatio: 0.5, keptElsewhere: new Set(["https://a.com/p"]) })).toHaveLength(0);
  });
});

describe("buildOutlineFromSerp", () => {
  const topics = ["Change a Car Tire Step-by-Step", "Choose a Safe Stopping Location", "Gather Tools and Spare Tire", "Secure the Vehicle and Loosen Lug Nuts", "Remove the Flat and Mount the Spare", "Lower the Car and Torque the Nuts", "Check Spare Pressure and Limits", "DIY Versus Professional Tire Changes", "Repair the Flat and Get Help"];
  const subs = Object.fromEntries(topics.map((t) => [t, [`${t} question one?`, `${t} question two?`, `${t} question three?`]]));
  const { outline, overflowTopics, overflowQuestions, assignedSubtopics } = buildOutlineFromSerp(topics, getTemplate("how-to"), topics, "How to Change a Car Tire", subs, 2);
  it("does not force an over-budget topic under an unrelated H2 on a one-word match", () => {
    expect(outline.map((s) => s.h2)).not.toContain("Repair the Flat and Get Help");
    expect(outline.some((s) => s.keyPoints.join(" ").includes("Repair the Flat and Get Help"))).toBe(false);
    expect(overflowTopics).toContain("Repair the Flat and Get Help");
    expect(overflowQuestions).toContain("Repair the Flat and Get Help question one?");
  });
  it("caps subheadings per section and sends the rest to the FAQ candidates", () => {
    expect(assignedSubtopics).not.toContain("Gather Tools and Spare Tire question three?");
    expect(overflowQuestions).toContain("Gather Tools and Spare Tire question three?");
    expect(outline[outline.length - 1].h2).toBe("Frequently Asked Questions");
  });
});

describe("EDITORIAL_ISSUE_IDENTITY_V1", () => {
  const issue = (problem: string, extra: Partial<ScorecardIssue> = {}): ScorecardIssue => ({ section: "Check Tire Pressure and Safety", dimension: "content", severity: "critical", source: "scorecard", problem, fix: "add a tire-pressure gauge to the equipment list and say what to do without one", ...extra });
  it("gauge missing but pressure check required, reported 3 times in different words -> ONE open issue", () => {
    const ledger: LedgerEntry[] = [];
    let n = 0;
    const id = () => `K${++n}`;
    mergeIssue(ledger, issue("The instructions require a tire-pressure gauge and possibly a compressor, but neither tool appears in the required tools list"), 0, id);
    mergeIssue(ledger, issue("The article requires a tire-pressure gauge and, if needed, a suitable compressor, but neither appears in the equipment the reader is told to gather"), 1, id);
    mergeIssue(ledger, issue("A tire-pressure gauge and a suitable compressor are needed to verify the spare's inflation, but the reader is told they are not part of the kit", { alsoEdit: ["Gather Tire-Change Tools"] }), 2, id);
    expect(ledger.filter((e) => e.status === "open")).toHaveLength(1);
    expect(ledger[0].id).toBe("K1");
    expect(ledger[0].reports).toBe(3);
    expect(ledger[0].alsoEdit).toContain("Gather Tire-Change Tools");
  });
  it("an unrelated defect in another section stays a separate issue", () => {
    const ledger: LedgerEntry[] = [];
    let n = 0;
    const id = () => `K${++n}`;
    mergeIssue(ledger, issue("The instructions require a tire-pressure gauge but the tools list omits it"), 0, id);
    mergeIssue(ledger, issue("No action is given if the owner's manual does not identify an approved jacking point", { section: "Gather Tire-Change Tools" }), 0, id);
    expect(ledger).toHaveLength(2);
  });
  it("a keyed defect reported again after closure is reopened under its old id", () => {
    const ledger: LedgerEntry[] = [];
    let n = 0;
    const id = () => `K${++n}`;
    const e = mergeIssue(ledger, issue("claim unproven", { source: "evidence", key: "evidence:C4" }), 0, id);
    e.status = "closed";
    mergeIssue(ledger, issue("claim still unproven", { source: "evidence", key: "evidence:C4" }), "final", id);
    expect(ledger).toHaveLength(1);
    expect(ledger[0].status).toBe("open");
  });
  it("sections that must change together are repaired in one unit", () => {
    const units = groupRepairs([issue("gauge missing", { alsoEdit: ["Gather Tire-Change Tools"] }), issue("minor wording", { severity: "minor", section: "Gather Tire-Change Tools" })]);
    expect(units).toHaveLength(1);
    expect(units[0].sections).toEqual(["Check Tire Pressure and Safety", "Gather Tire-Change Tools"]);
  });
});

describe("chatJson", () => {
  const fake = (replies: string[]) => ({ chat: { completions: { create: async () => ({ choices: [{ message: { content: replies.shift() ?? "" }, finish_reason: "length" }] }) } } }) as unknown as OpenAI;
  it("retries once after a truncated (empty) reply", async () => {
    const r = await chatJson<{ issues: unknown[] }>(fake(["", '{"issues":[]}']), "T", "p", { validate: (x) => Array.isArray((x as { issues?: unknown }).issues) });
    expect(r.issues).toHaveLength(0);
  });
  it("raises LlmJsonError after the second failure instead of returning 'no issues'", async () => {
    let err: unknown = null;
    try { await chatJson(fake(["", "{bad"]), "PROCEDURE_FEASIBILITY", "p"); } catch (e) { err = e; }
    expect(err instanceof LlmJsonError).toBe(true);
  });
});

describe("evidence semantics", () => {
  it("a real quote about something else does not support the claim", () => {
    expect(quoteMatchesClaim("check the spare tire pressure with a gauge before driving", "Check the spare's pressure with a gauge before you drive.")).toBe(true);
    expect(quoteMatchesClaim("Choose a safe spot away from traffic and pets", "Tighten the lug nuts in a star pattern.")).toBe(false);
  });
  it("a failed check blocks READY even with a high score", () => {
    expect(evaluateReadiness({ qualityFailures: [], finalScore: 9.6, minScore: 9, openCritical: [], evidence: [], checkFailures: ["PROCEDURE_FEASIBILITY: no valid JSON"] }).status).toBe("REVIEW_REQUIRED");
  });
});

describe("PROCEDURE_DEPENDENCY_GRAPH (code, not the model, checks the order)", () => {
  // the plan from the 2026-11-03 run: wedges and the pressure check came BEFORE getting out and taking out the tools
  const steps = [
    { n: 1, section: "plan", action: "stop safely, hazards, parking brake", uses: [], obtains: [], requires: [], produces: ["vehicle stopped"] },
    { n: 2, section: "plan", action: "open the hood", uses: [], obtains: [], requires: ["vehicle stopped"], produces: ["hood open"] },
    { n: 3, section: "plan", action: "place wedges and check the spare pressure", uses: ["wheel wedge", "tire-pressure gauge"], obtains: [], requires: ["outside the vehicle"], produces: ["spare checked"] },
    { n: 4, section: "plan", action: "get out and retrieve spare, jack, gauge, wrench", uses: [], obtains: ["spare tire", "jack", "tire-pressure gauge", "lug wrench"], requires: ["vehicle stopped"], produces: ["outside the vehicle"] },
    { n: 9, section: "plan", action: "lower the car fully and torque", uses: ["jack"], obtains: [], requires: [], produces: ["vehicle fully lowered"] },
    { n: 10, section: "plan", action: "fully lower and remove the jack", uses: ["jack"], obtains: [], requires: [], produces: ["vehicle fully lowered"] },
  ];
  const v = validateStepOrder(steps);
  it("flags a tool used before the step that takes it out", () => {
    expect(v.some((x) => x.kind === "USED_BEFORE_OBTAINED" && x.item === "tire-pressure gauge" && x.step === 3 && x.otherStep === 4)).toBe(true);
  });
  it("flags a step that needs a state created only later", () => {
    expect(v.some((x) => x.kind === "REQUIRED_BEFORE_PRODUCED" && x.item === "outside the vehicle" && x.step === 3)).toBe(true);
  });
  it("flags the same action done twice", () => {
    expect(v.some((x) => x.kind === "DUPLICATE_STEP" && x.item === "vehicle fully lowered")).toBe(true);
  });
  it("accepts a correctly ordered procedure", () => {
    const ok = [steps[0], steps[1], { ...steps[3], n: 3 }, { ...steps[2], n: 4 }, steps[4]];
    expect(validateStepOrder(ok)).toHaveLength(0);
  });
});

describe("v5 evidence severity and matching", () => {
  const rec = (over: Partial<EvidenceRecord>): EvidenceRecord => ({ claimId: "C1", section: "Check Spare", claim: "x", citedUrl: null, sourceUrl: null, sourceKind: null, quote: "", quoteVerified: false, status: "unsupported", applicability: "", critical: true, kind: "value", ...over });
  const heads = ["Check Spare"];
  it("an unproven value (number, limit, permission) blocks publication", () => {
    expect(evidenceIssues([rec({ claim: "You can drive 70 miles on a spare." })], heads)[0].severity).toBe("critical");
  });
  it("an unproven conservative warning or instruction is fixed but does not block", () => {
    expect(evidenceIssues([rec({ kind: "precaution", claim: "Never put any part of your body under a car held only by a jack." })], heads)[0].severity).toBe("major");
    expect(evidenceIssues([rec({ kind: "instruction", claim: "Loosen the lug nuts while the tire is on the ground." })], heads)[0].severity).toBe("major");
  });
  it("a claim contradicted by an official source always blocks", () => {
    expect(evidenceIssues([rec({ kind: "precaution", status: "contradicted", sourceUrl: "https://a.gov/x", sourceKind: "OFFICIAL", quote: "q" })], heads)[0].severity).toBe("critical");
  });
  it("a source whose quote is about something else is never suggested as the link", () => {
    const fix = evidenceIssues([rec({ kind: "instruction", status: "unverified", note: "quote is not about the claim", sourceUrl: "https://a.com/p" })], heads, [{ url: "https://a.com/p", title: "A" }])[0].fix;
    expect(fix.includes("https://a.com/p")).toBe(false);
  });
  it("hyphens, possessives and word endings no longer hide a matching quote", () => {
    expect(quoteMatchesClaim("check the tire pressure of the spare with a gauge before you install it", "Use a tire-pressure gauge before fitting the spare.")).toBe(true);
    expect(quoteMatchesClaim("Loosening the lug nuts while the tire's still on the ground", "Loosen each lug nut while the tire still contacts the ground")).toBe(true);
  });
  it("checks from different checkers never merge into one ledger entry", () => {
    const ledger: LedgerEntry[] = [];
    let n = 0;
    const id = () => `K${++n}`;
    const base = { section: "Gather Tools", dimension: "content" as const, severity: "critical" as const, fix: "add the tire-pressure gauge to the tools list" };
    mergeIssue(ledger, { ...base, source: "feasibility", key: "feasibility:gather tools", problem: "MISSING_TOOL: the tire-pressure gauge is not in the tools list" }, 0, id);
    mergeIssue(ledger, { ...base, source: "evidence", key: "evidence:C14", problem: "[C14] tire-pressure gauge claim is not in the tools list source" }, 0, id);
    expect(ledger).toHaveLength(2);
  });
});

describe("v6 plan binding and TOOLS_COVERAGE (code, not the model)", () => {
  it("reads the plan's tools list in the formats the planner writes", () => {
    expect(extractPlanTools("## Tools\n- Jack\n- Torque wrench (if available; fallback: tighten firmly)\n\n## Schedule\n| Step | Action |\n|---|---|\n| 1 | Park |")).toEqual(["Jack", "Torque wrench (if available; fallback: tighten firmly)"]);
    expect(extractPlanTools("**1) Tools and ingredients**\n- Jack\n- Lug wrench\n\n**2) Schedule**\n| Step | Action |")).toEqual(["Jack", "Lug wrench"]);
    expect(extractPlanTools("1) Tools and ingredients: spare tire, jack, lug wrench, and wheel chocks.\n2) Schedule table:\n| Step | Action |")).toEqual(["spare tire", "jack", "lug wrench", "wheel chocks"]);
    expect(extractPlanTools("### 1. Tools\n| Tool | Purpose |\n|---|---|\n| Jack | lift |\n| Torque wrench | tighten |\n\n### 2. Schedule\n| Step | Action |")).toEqual(["Jack", "Torque wrench"]);
    expect(extractPlanTools("Tools needed:\n1. Jack\n2. Flashlight or headlamp\n\nSafety stop rules:\n- Stop if the jack tilts")).toEqual(["Jack", "Flashlight or headlamp"]);
    expect(extractPlanTools("| Step | Action |\n|---|---|\n| 1 | Park |")).toEqual([]);
  });
  it("matches a tool by its name, alternatives and head noun, not by loose words", () => {
    expect(toolName("Torque wrench (if available) – to tighten the nuts")).toBe("Torque wrench");
    expect(toolMentioned("Tire-pressure gauge (if available)", "use a tire pressure gauge")).toBe(true);
    expect(toolMentioned("Torque wrench", "the lug wrench and the spare")).toBe(false); // the 05-52 failure
    expect(toolMentioned("Lug wrench / wheel wrench", "a lug/wheel wrench")).toBe(true);
    expect(toolMentioned("Owner's manual", "the owner’s manual")).toBe(true);
    expect(toolMentioned("Digital kitchen scale", "weigh it on a kitchen scale")).toBe(true);
    expect(toolMentioned("Reflective warning triangle or flares", "set out flares")).toBe(true);
    expect(isOptionalTool("Tire-pressure gauge (if available)")).toBe(true);
    expect(isOptionalTool("Jack")).toBe(false);
  });
  it("finds the gauge and torque wrench missing from an equipment list like the 05-52 article", () => {
    const sections = [
      { heading: "How to Change a Tire Safely", level: 2, content: "| 8 | Lower fully and tighten nuts with a torque wrench |" },
      { heading: "Gather Tools and Check the Spare", level: 2, content: "Gather the vehicle-specific jack, lug/wheel wrench, properly inflated spare when supplied, wheel chock, wheel-lock key, owner’s manual, gloves, and flashlight beside the tire. Check the spare’s pressure against the manual." },
      { heading: "Frequently Asked Questions", level: 2, content: "### Do I need a torque wrench and a tire pressure gauge?" },
    ];
    const plan = ["Spare tire", "Jack", "Lug wrench", "Wheel chock", "Tire-pressure gauge (if available)", "Torque wrench (if available)", "Owner's manual"];
    const r = missingPlanTools(plan, sections);
    expect(r.section).toBe("Gather Tools and Check the Spare");
    expect(r.missing.map(toolName)).toEqual(["Tire-pressure gauge", "Torque wrench"]); // a mention elsewhere (step table, FAQ) does not count
  });
  it("picks the equipment section, not a repair-kit section or the FAQ", () => {
    expect(toolsSectionIndex(["Use a Tire Repair Kit Instead", "Gather Tools and Check the Spare"])).toBe(1);
    expect(toolsSectionIndex(["Pull Over Safely", "Frequently Asked Questions"])).toBe(-1);
  });
});

describe("v7 FORMAT_CONTRACT: every template has its deliverable, checked by code", () => {
  const sec = (heading: string, content: string) => ({ heading, content, level: 2 });
  const keys = (issues: { key?: string }[]) => issues.map((i) => i.key ?? "");
  const table = "| Criterion | Heat pump | Furnace |\n|---|---|---|\n| Fuel | Electricity | Gas |";
  it("all 15 templates have writer rules and a first-section duty", () => {
    for (const cat of Object.keys(TEMPLATES)) {
      const f = formatContract(cat);
      expect(f.category).toBe(cat);
      expect(f.rules.length > 80 && (f.first ?? "").startsWith("FORMAT_FIRST")).toBe(true);
    }
  });
  it("comparison: a table near the top and decision rules at the end", () => {
    const bad = [sec("Heat Pump vs Furnace at a Glance", "A heat pump moves heat; a furnace burns fuel."), sec("Costs", "Costs vary."), sec("Which One Fits Your Home", "Both work.")];
    expect(keys(checkFormat("comparison", bad))).toEqual(["format:table-early", "format:decision-rules"]);
    const good = [sec("Heat Pump vs Furnace at a Glance", `A heat pump moves heat; a furnace burns fuel.\n\n${table}`), sec("Costs", "Costs vary."), sec("Which One Fits Your Home", "Choose a heat pump if winters are mild; choose a furnace if they are severe.")];
    expect(checkFormat("comparison", good)).toHaveLength(0);
  });
  it("pricing: the price comes first and prices carry a date", () => {
    const bad = [sec("Roof Replacement Cost", "Roof replacement cost depends on size. Asphalt runs $5 per square foot and metal $12."), sec("What Changes the Price", "Labor matters.")];
    expect(keys(checkFormat("pricing", bad))).toEqual(["format:table", "format:price-first", "format:price-dates"]);
    const good = [sec("Roof Replacement Cost", `A roof replacement typically costs $9,000 to $25,000 as of November 2026 in the US.\n\n| Item | Typical price | Included |\n|---|---|---|\n| Asphalt | $5/sq ft | tear-off |`), sec("What Changes the Price", "Labor matters.")];
    expect(checkFormat("pricing", good)).toHaveLength(0);
  });
  it("invented first-hand testing is critical in any format, a disclosure is not", () => {
    const issues = checkFormat("review", [sec("Instant Pot Duo Verdict", "We tested the Duo for two weeks. Buy it if you cook beans often."), sec("Pros and Cons", "Skip it if you need a large pot.")]);
    expect(issues.filter((i) => i.severity === "critical").map((i) => i.key)).toEqual(["format:invented-testing:instant pot duo verdict"]);
    const ok = checkFormat("review", [sec("Instant Pot Duo Verdict", "No hands-on testing was done for this review; it is based on published specs. Buy it if you cook beans often."), sec("Pros and Cons", "Skip it if you need a large pot.")]);
    expect(ok.filter((i) => i.severity === "critical")).toHaveLength(0);
  });
  it("statistics: each statistic needs a source link in its own sentence", () => {
    const bad = [sec("Remote Work Statistics", "About 28% of US workdays were remote in 2025 ([WFH Research](https://wfhresearch.com/x)). Roughly 35% of workers can work remotely. Hybrid work rose to 41%. About 12 million people are fully remote.")];
    expect(keys(checkFormat("statistics", bad))).toEqual(["format:stat-sources"]);
  });
  it("checklist and definition keep their core element first", () => {
    expect(keys(checkFormat("checklist", [sec("Moving Checklist", "Moving takes planning. Start early.")]))).toEqual(["format:checklist-first"]);
    expect(checkFormat("checklist", [sec("Moving Checklist", "- Book movers\n- Order boxes\n- Forward mail\n- Transfer utilities\n- Pack a first-night bag")])).toHaveLength(0);
    expect(keys(checkFormat("definition", [sec("Heat Pump Basics", "Heat pumps move heat instead of making it.")]))).toEqual(["format:first-definition"]);
    expect(firstSentence("### Intro\n\nA heat pump is a device that moves heat ([DOE](https://energy.gov/x)). It runs on electricity.")).toBe("A heat pump is a device that moves heat ([DOE](L)).");
  });
});

describe("v8 evidence: only concrete values block, numbers make a quote match", () => {
  const base = { claimId: "C1", section: "Costs", citedUrl: null, sourceUrl: null, sourceKind: null, quote: "", quoteVerified: false, applicability: "", critical: true } as unknown as EvidenceRecord;
  it("a general statement the model labeled value is fixed, not blocking", () => {
    expect(hasConcreteValue("Solar panels generally produce no usable electricity at night.")).toBe(false);
    const soft = evidenceIssues([{ ...base, claim: "Solar panels generally produce no usable electricity at night.", status: "unverified", kind: "value" } as EvidenceRecord], ["Costs"]);
    expect(soft[0].severity).toBe("major");
    const hard = evidenceIssues([{ ...base, claim: "A temporary spare is limited to 50 mph.", status: "unverified", kind: "value" } as EvidenceRecord], ["Costs"]);
    expect(hard[0].severity).toBe("critical");
  });
  it("a quote that states every number of the claim is about the claim", () => {
    expect(quoteMatchesClaim("In 2024 the company recorded revenue of $11.1 billion, up 12% year over year.", "Airbnb recorded $11.1 billion in 2024 revenue.")).toBe(true);
    expect(quoteMatchesClaim("Bookings rose sharply in Europe.", "Airbnb recorded $11.1 billion in 2024 revenue.")).toBe(false);
  });
});

describe("v9 TOKEN_LEDGER", () => {
  it("names every pipeline step from its prompt", () => {
    expect(stepOf('ARTICLE FORMAT: x\n=== YOUR TASK ===\nYou are writing the "Intro" section')).toBe("section");
    expect(stepOf("You are a strict senior editor scoring an article")).toBe("critic");
    expect(stepOf('Topic: "x" (audience: United States).')).toBe("authority");
  });
  it("counts usage, enforces the budget, and lowers effort only for mechanical steps on reasoning models", async () => {
    resetUsage();
    const seen: Record<string, unknown>[] = [];
    const client = tracked({ chat: { completions: { create: async (b: Record<string, unknown>) => { seen.push(b); return { usage: { prompt_tokens: 600, completion_tokens: 50, prompt_tokens_details: { cached_tokens: 400 } } }; } } } });
    await client.chat.completions.create({ model: "gpt-5-mini", messages: [{ role: "user", content: "Extract the substantive points these pages cover" }] });
    await client.chat.completions.create({ model: "gpt-5-mini", messages: [{ role: "user", content: "You are a strict senior editor scoring" }] });
    await client.chat.completions.create({ model: "gpt-4o", messages: [{ role: "user", content: "Extract the substantive points" }] });
    expect(seen.map((b) => b.reasoning_effort ?? null)).toEqual(["low", null, null]);
    expect(usageTotals()).toEqual({ calls: 3, input: 1800, cached: 1200, output: 150, reasoning: 0 });
    process.env.WRITER_TOKEN_BUDGET = "1000";
    expect(overBudget()).toBe(true);
    delete process.env.WRITER_TOKEN_BUDGET;
    expect(overBudget()).toBe(false);
  });
});

describe("v10 fixes from the paid matrix (no new runs needed)", () => {
  const sec = (heading: string, content: string) => ({ heading, content, level: 2 });
  it("model names are not values; units, money, percent and years are", () => {
    expect(hasConcreteValue("The Dreame D9 Max Gen 2 is worth checking with the retailer.")).toBe(false);
    expect(hasConcreteValue("A temporary spare is limited to 50 mph.")).toBe(true);
    expect(hasConcreteValue("It costs about $9,500.")).toBe(true);
    expect(hasConcreteValue("Hybrid work rose to 41% in 2025.")).toBe(true);
  });
  it("'follow Step 5' without numbered steps is flagged; with a step table it is fine", () => {
    const bad = [sec("Why It Dies", "A weak battery is the usual cause."), sec("How to Diagnose and Fix It", "Follow Step 5 before you charge it.")];
    expect(checkFormat("troubleshooting", bad).some((i) => i.key === "format:step-refs")).toBe(true);
    const ok = [sec("Steps", "| Step | Action |\n|---|---|\n| 1 | Park |\n| 2 | Chock |"), sec("Fix", "Repeat step 2 if the car rolls.")];
    expect(checkFormat("how-to", ok).some((i) => i.key === "format:step-refs")).toBe(false);
  });
  it("explainers are told they explain, tasks are not", () => {
    expect(formatContract("how-it-works").rules.includes("never tell them to check a manual")).toBe(true);
    expect(formatContract("how-to").rules.includes("never tell them to check a manual")).toBe(false);
  });
});

describe("v11 from the first real v10 run", () => {
  const base = { claimId: "C5", section: "Gather Tools", citedUrl: null, sourceUrl: "https://www.coopertire.com/x", quote: "use bricks, rocks or wood", quoteVerified: true, applicability: "", critical: true, status: "contradicted" } as unknown as EvidenceRecord;
  it("a stricter safety precaution contradicted only by a competitor page does not block", () => {
    expect(evidenceIssues([{ ...base, kind: "precaution", sourceKind: "COMPETITOR", claim: "Do not substitute unsuitable objects for missing chocks." } as EvidenceRecord], ["Gather Tools"])[0].severity).toBe("major");
    expect(evidenceIssues([{ ...base, kind: "precaution", sourceKind: "OFFICIAL", claim: "Do not substitute unsuitable objects for missing chocks." } as EvidenceRecord], ["Gather Tools"])[0].severity).toBe("critical");
    expect(evidenceIssues([{ ...base, kind: "instruction", sourceKind: "COMPETITOR", claim: "Loosen the nuts after lifting the car." } as EvidenceRecord], ["Gather Tools"])[0].severity).toBe("critical");
  });
  it("adds one cache key per article and drops it if the API rejects it", async () => {
    const { setCacheKey } = await import("./usage");
    setCacheKey("How to Change a Car Tire");
    const seen: Record<string, unknown>[] = [];
    let fail = true;
    const client = tracked({ chat: { completions: { create: async (b: Record<string, unknown>) => { seen.push(b); if (fail && b.prompt_cache_key) { fail = false; throw new Error("400 Unrecognized request argument supplied: prompt_cache_key"); } return { usage: undefined }; } } } });
    await client.chat.completions.create({ model: "gpt-5", messages: [{ role: "user", content: 'X\n=== YOUR TASK ===\nYou are writing the "A" section' }] });
    await client.chat.completions.create({ model: "gpt-5", messages: [{ role: "user", content: 'X\n=== YOUR TASK ===\nYou are writing the "B" section' }] });
    expect(seen.map((b) => (b.prompt_cache_key as string | undefined) ?? null)).toEqual(["growth-os-section-how-to-change-a-car-tire", null, null]);
    setCacheKey(null);
  });
});
