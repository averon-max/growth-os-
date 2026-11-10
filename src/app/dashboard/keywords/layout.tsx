import { redirect } from "next/navigation";
import Paywall from "@/components/paywall";
import { sectionGate } from "@/lib/billing/guard";

export default async function SectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await sectionGate("keywords");

  if (gate.unauthenticated) {
    redirect("/login");
  }

  if (!gate.allowed) {
    return (
      <Paywall
        section="Keywords"
        requiredPlan={gate.requiredPlan}
        requiredPlanId={gate.requiredPlanId}
        currentPlan={gate.currentPlan}
      />
    );
  }

  return <>{children}</>;
}
