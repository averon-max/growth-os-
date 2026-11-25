import type { Metadata } from "next";
import { TIERS } from "@/lib/retention";
import RetentionForm from "./retention-form";
import CachePanel from "./cache-panel";
import { SettingsShell } from "@/components/dashboard/settings/settings-shell";

export const metadata: Metadata = { title: "Data retention · Hyprlyx" };

export default function DataRetentionPage() {
  const tiers = Object.entries(TIERS).map(([key, t]) => ({ key, ...t }));
  return (
    <SettingsShell
      active="data"
      title="Data and costs"
      description="How long Hyprlyx keeps working data, what paid data costs, and a switch to pause it. Cleanup runs every night. Your account, keywords and approved or published articles are never deleted automatically."
    >
      <RetentionForm tiers={JSON.parse(JSON.stringify(tiers))} />
      <CachePanel />
    </SettingsShell>
  );
}
