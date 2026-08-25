"use client";

import { useState } from "react";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "./section-heading";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    price: 49,
    featured: false,
    features: ["Website monitoring", "SEO analysis", "Basic keyword intelligence", "Opportunity tracking", "Monthly reports"],
  },
  {
    name: "Growth",
    price: 99,
    featured: true,
    features: ["Everything in Starter", "Advanced keyword intelligence", "Search Console integration", "Audience analytics", "Content opportunities", "Competitor monitoring", "Automations"],
  },
  {
    name: "Autopilot",
    price: 199,
    featured: false,
    features: ["Everything in Growth", "Advanced automation", "Automatic content workflows", "Advanced competitor intelligence", "Continuous optimization", "Priority processing"],
  },
];

export function Pricing() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing-section" className="border-b border-[var(--border)] py-24 md:py-32">
      <Container>
        <SectionHeading eyebrow="Pricing" title="Plans that grow with your website." align="center" className="mx-auto" />
        <div className="mt-8 flex items-center justify-center gap-3">
          <span className={cn("text-[0.85rem]", !yearly ? "text-[var(--text)]" : "text-[var(--text-faint)]")}>Monthly</span>
          <button onClick={() => setYearly((v) => !v)} className="relative h-6 w-11 rounded-full bg-[var(--surface-2)] transition-colors" aria-label="Toggle yearly">
            <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-[var(--accent)] transition-transform", yearly ? "translate-x-6" : "translate-x-1")} />
          </button>
          <span className={cn("text-[0.85rem]", yearly ? "text-[var(--text)]" : "text-[var(--text-faint)]")}>Yearly</span>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <div key={plan.name} className={cn("flex flex-col rounded-xl border p-7", plan.featured ? "border-[var(--accent)]/50 bg-[var(--surface)]" : "border-[var(--border-strong)] bg-[var(--surface)]")}>
              {plan.featured && (
                <span className="mb-4 w-fit rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[0.65rem] font-mono uppercase tracking-wide text-[var(--accent-strong)]">Most popular</span>
              )}
              <p className="font-display text-[1.05rem] font-semibold">{plan.name}</p>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="font-mono-num text-3xl font-semibold">${yearly ? Math.round(plan.price * 0.83) : plan.price}</span>
                <span className="text-[0.8rem] text-[var(--text-faint)]">/month</span>
              </p>
              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[0.83rem] text-[var(--text-dim)]">
                    <Check size={14} className="mt-0.5 shrink-0 text-[var(--accent)]" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button href="/signup" variant={plan.featured ? "primary" : "secondary"} className="mt-7 w-full">Start Free</Button>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}