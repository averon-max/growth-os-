import Link from "next/link";

import SubscribeButton from "@/components/subscribe-button";
import { FEATURES, usage } from "@/lib/billing/features";
import { type PlanId } from "@/lib/billing/plans";

import styles from "./paywall.module.css";

/*
 * A section the plan doesn't include, shown like Vercel's "Upgrade to Pro" screens: the page's outline stays
 * faintly in the background and one clear card in front says what the plan adds and how to get it.
 */
export default function Paywall({
  section,
  requiredPlan,
  requiredPlanId,
  currentPlan,
}: {
  section: string;
  requiredPlan: string;
  requiredPlanId: PlanId;
  currentPlan: string;
}) {
  const adds = [
    ...FEATURES.filter((f) => f.plan === requiredPlanId && !f.soon).map((f) => f.text),
    ...usage(requiredPlanId),
  ].slice(0, 4);

  return (
    <div className={styles.wrap}>
      <div className={styles.ghost} aria-hidden>
        <div className={styles.ghostHead} />
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className={styles.ghostRow}>
            <span style={{ width: `${38 + ((i * 17) % 30)}%` }} />
            <span style={{ width: "14%" }} />
          </div>
        ))}
      </div>

      <div className={styles.card} role="dialog" aria-labelledby="paywall-title">
        <div className={styles.body}>
          <h1 id="paywall-title" className={styles.title}>
            {section} is part of <span className={styles.plan}>{requiredPlan}</span>
          </h1>
          <p className={styles.text}>You&apos;re on {currentPlan}. Upgrade and this section opens right after payment.</p>
          {adds.length ? (
            <ul className={styles.list}>
              {adds.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className={styles.foot}>
          <Link href="/pricing" className={styles.compare}>
            Compare plans
          </Link>
          {requiredPlanId === "FREE" ? null : (
            <SubscribeButton plan={requiredPlanId as "STARTER" | "GROWTH" | "AUTOPILOT"} label={`Upgrade to ${requiredPlan}`} variant="accent" />
          )}
        </div>
      </div>
    </div>
  );
}
