import { Topbar } from "@/components/dashboard/topbar";
import ui from "@/components/dashboard/ui.module.css";
import BillingPanel from "./billing-panel";

export const dynamic = "force-dynamic";

export default function BillingPage() {
  return (
    <>
      <Topbar title="Settings" subtitle="Billing" />
      <div className={ui.pageBody}>
        <BillingPanel />
      </div>
    </>
  );
}
