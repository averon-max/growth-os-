"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "./section-heading";
import { Button } from "@/components/ui/button";

const rows = [
  { keyword: "emergency plumber calgary", volume: "880", competition: "Medium", intent: "Commercial", position: "Not ranking", score: 94 },
  { keyword: "plumber calgary", volume: "2,400", competition: "High", intent: "Commercial", position: "#18", score: 72 },
  { keyword: "drain cleaning calgary", volume: "390", competition: "Low", intent: "Commercial", position: "Not ranking", score: 81 },
  { keyword: "water heater repair calgary", volume: "260", competition: "Low", intent: "Commercial", position: "#7", score: 58 },
];

export function KeywordIntelligence() {
  return (
    <section id="features" className="border-b border-[var(--border)] py-24 md:py-32">
      <Container>
        <SectionHeading eyebrow="Keyword Intelligence" title="Stop guessing what people search for." description="Every keyword is scored on demand, competition, intent and how likely you are to rank — not just listed." align="center" className="mx-auto" />
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="mt-14 overflow-x-auto rounded-xl border border-[var(--border-strong)] bg-[var(--surface)]">
          <table className="w-full min-w-[640px] border-collapse text-left">
            <thead>
              <tr className="eyebrow border-b border-[var(--border)] [&>th]:px-4 [&>th]:py-3 [&>th]:font-normal">
                <th>Keyword</th>
                <th>Volume</th>
                <th>Competition</th>
                <th>Intent</th>
                <th>Position</th>
                <th className="text-right">Opportunity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.keyword} className="border-b border-[var(--border)] text-[0.85rem] last:border-b-0 [&>td]:px-4 [&>td]:py-3.5">
                  <td className="font-medium">{r.keyword}</td>
                  <td className="font-mono-num text-[var(--text-dim)]">{r.volume}</td>
                  <td className="text-[var(--text-dim)]">{r.competition}</td>
                  <td className="text-[var(--text-dim)]">{r.intent}</td>
                  <td className="text-[var(--text-dim)]">{r.position}</td>
                  <td className="text-right">
                    <span className={`font-mono-num text-[0.85rem] font-semibold ${r.score >= 85 ? "text-[var(--accent-strong)]" : "text-[var(--text-dim)]"}`}>
                      {r.score}/100
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
        <div className="mt-8 flex justify-center">
          <Button href="/signup" variant="secondary">Explore Keyword Intelligence</Button>
        </div>
      </Container>
    </section>
  );
}
