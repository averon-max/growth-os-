import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuthShell } from "@/components/auth-shell";
import SupportForm from "./support-form";

export const metadata: Metadata = { title: "Support · Hyprlyx", description: "Contact Hyprlyx support.", alternates: { canonical: "/support" } };

export default async function SupportPage() {
  const session = await getServerSession(authOptions);
  return (
    <AuthShell
      title="How can we help?"
      subtitle={<>We usually reply within one business day. You can also email <a href="mailto:support@hyprlyx.com" style={{ color: "#f7f8f8" }}>support@hyprlyx.com</a>.</>}
      footer={<Link href={session ? "/dashboard" : "/"}>← Back</Link>}
    >
      <SupportForm email={session?.user?.email ?? ""} name={session?.user?.name ?? ""} />
    </AuthShell>
  );
}
