import { redirect } from "next/navigation";
import Paywall from "@/components/paywall";
import { sectionGate } from "@/lib/billing/guard";

export default async function SectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = await sectionGate("websites");

  if (gate.unauthenticated) {
    redirect("/login");
  }

  if (!gate.allowed) {
    return (
      <Paywall
        section="Websites"
        requiredPlan={gate.requiredPlan}
        requiredPlanId={gate.requiredPlanId}
        currentPlan={gate.currentPlan}
      />
    );
  }

  return <>{children}</>;
}
