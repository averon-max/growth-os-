import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Sign up · Hyprlyx", robots: { index: false, follow: false } };

export default function SignupPage() {
  return (
    <AuthShell title="Create your account" subtitle="Plan, write and rank in one workspace. Free to start." footer={<>Already have an account? <Link href="/login">Log in</Link></>}>
      <Suspense>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}
