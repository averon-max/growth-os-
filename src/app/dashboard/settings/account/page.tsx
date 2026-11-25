import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { SettingsShell } from "@/components/dashboard/settings/settings-shell";
import AccountForms from "./account-forms";

export const metadata: Metadata = { title: "Account · Hyprlyx" };

export default async function AccountPage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { email: true, name: true, createdAt: true, memberships: { select: { role: true, workspace: { select: { name: true, subscription: { select: { plan: true, status: true, source: true, currentPeriodEnd: true } } } } } } },
  });
  if (!user) return null;
  const ws = user.memberships[0]?.workspace;
  const sub = ws?.subscription;

  return (
    <SettingsShell active="account" title="Account" description={user.email}>
        <AccountForms
          email={user.email}
          name={user.name ?? ""}
          since={user.createdAt.toISOString().slice(0, 10)}
          plan={sub?.plan ?? "FREE"}
          planStatus={sub?.status ?? "active"}
          planSource={sub?.source ?? "stripe"}
          renews={sub?.currentPeriodEnd ? sub.currentPeriodEnd.toISOString().slice(0, 10) : null}
        />
    </SettingsShell>
  );
}
