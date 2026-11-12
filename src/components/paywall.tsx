import Link from "next/link";

import SubscribeButton from "@/components/subscribe-button";
import { type PlanId } from "@/lib/billing/plans";

import styles from "./paywall.module.css";

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
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <span className={styles.eyebrow}>{requiredPlan} plan</span>

        <h1 className={styles.title}>{section} is part of {requiredPlan}</h1>

        <p className={styles.text}>
          You're on {currentPlan}. Upgrade to {requiredPlan} and this section unlocks right after payment —
          no need to log out and back in.
        </p>

        <div className={styles.actions}>
          {requiredPlanId === "FREE" ? null : (
            <SubscribeButton
              plan={requiredPlanId as "STARTER" | "GROWTH" | "AUTOPILOT"}
              label={`Upgrade to ${requiredPlan}`}
              variant="accent"
            />
          )}
          <Link href="/pricing" className={styles.compare}>
            Compare plans
          </Link>
        </div>
      </div>
    </div>
  );
}
