import { Suspense } from "react";

import { PaywallCard } from "@/components/paywall-card";
import { FEATURES, usage } from "@/lib/billing/features";
import { type PlanId } from "@/lib/billing/plans";

import styles from "./paywall.module.css";

/*
 * A section the plan doesn't include, shown like Vercel's upgrade dialogs: the page's outline stays faintly
 * in the background and one card in front. The card (client) follows the open tab, so each tab explains itself.
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
  const adds = [...FEATURES.filter((f) => f.plan === requiredPlanId && !f.soon).map((f) => f.text), ...usage(requiredPlanId)].slice(0, 4);

  return (
    <div className={styles.wrap}>
      <div className={styles.ghost} aria-hidden>
        <div className={styles.ghostHead} />
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className={styles.ghostRow}>
            <i />
            <i />
            <span style={{ width: `${34 + ((i * 17) % 30)}%` }} />
            <span className={styles.ghostSide} />
          </div>
        ))}
      </div>
      <Suspense fallback={null}>
        <PaywallCard section={section} requiredPlan={requiredPlan} requiredPlanId={requiredPlanId} currentPlan={currentPlan} adds={adds} />
      </Suspense>
    </div>
  );
}
