import { SettingsShell } from "@/components/dashboard/settings/settings-shell";
import BillingPanel from "./billing-panel";

export const dynamic = "force-dynamic";

export default function BillingPage() {
  return (
    <SettingsShell active="billing" title="Billing" description="Your plan, payment method and invoices.">
      <BillingPanel />
    </SettingsShell>
  );
}
