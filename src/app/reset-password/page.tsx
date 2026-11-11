import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ResetForm } from "@/components/auth-forms";

export const metadata: Metadata = {
  title: "New password · Hyprlyx",
  robots: { index: false, follow: false },
  referrer: "no-referrer", // the token in the URL never leaks to other sites
};

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const valid = typeof token === "string" && /^[A-Za-z0-9_-]{20,200}$/.test(token);

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={valid ? "Pick something you don't use anywhere else." : "This link is incomplete or broken. Request a new one."}
      footer={<Link href="/login">Back to log in</Link>}
    >
      {valid ? (
        <ResetForm token={token} />
      ) : (
        <p style={{ marginTop: 24 }}>
          <Link href="/forgot-password" style={{ color: "#f7f8f8" }}>Request a new link →</Link>
        </p>
      )}
    </AuthShell>
  );
}
