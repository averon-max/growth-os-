import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth-forms";

export const metadata: Metadata = { title: "Log in · Hyprlyx", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to your Hyprlyx workspace." footer={<>No account yet? <Link href="/signup">Sign up</Link></>}>
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
