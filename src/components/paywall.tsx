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
        <span className={styles.eyebrow}>Тариф {requiredPlan}</span>

        <h1 className={styles.title}>Раздел «{section}» входит в {requiredPlan}</h1>

        <p className={styles.text}>
          Сейчас у вас {currentPlan}. Подключите {requiredPlan}, и раздел откроется сразу
          после оплаты — выходить и заходить заново не нужно.
        </p>

        <div className={styles.actions}>
          {requiredPlanId === "FREE" ? null : (
            <SubscribeButton
              plan={requiredPlanId as "STARTER" | "GROWTH" | "AUTOPILOT"}
              label={`Подключить ${requiredPlan}`}
              variant="accent"
            />
          )}
          <Link href="/pricing" className={styles.compare}>
            Сравнить тарифы
          </Link>
        </div>
      </div>
    </div>
  );
}
