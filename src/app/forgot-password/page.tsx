import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ForgotForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Reset password · Hyprlyx", robots: { index: false, follow: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="Enter the email you log in with and we'll send you a link." footer={<Link href="/login">Back to log in</Link>}>
      <ForgotForm />
    </AuthShell>
  );
}
