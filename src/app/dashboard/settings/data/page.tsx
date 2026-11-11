import type { Metadata } from "next";
import { TIERS } from "@/lib/retention";
import RetentionForm from "./retention-form";

export const metadata: Metadata = { title: "Data retention · Hyprlyx" };

export default function DataRetentionPage() {
  const tiers = Object.entries(TIERS).map(([key, t]) => ({ key, ...t }));
  return (
    <div style={{ maxWidth: 720, padding: "32px 40px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>Data retention</h1>
      <p style={{ color: "var(--secondary)", fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>
        How long Hyprlyx keeps working data for this workspace. Cleanup runs every night. Your account, keywords, tracked keywords and
        approved or published articles are never deleted automatically.
      </p>
      <RetentionForm tiers={JSON.parse(JSON.stringify(tiers))} />
    </div>
  );
}
