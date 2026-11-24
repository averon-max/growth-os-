"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

/**
 * Only the dashboard needs the session on the client (the account button in the top bar).
 * The server already has it, so it is passed in: no extra /api/auth/session request on every page.
 */
export function Providers({ session, children }: { session: Session | null; children: React.ReactNode }) {
  return (
    <SessionProvider session={session} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}
