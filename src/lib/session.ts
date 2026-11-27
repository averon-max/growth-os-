import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { registerUserResolver } from "@/lib/billing/data-budget";

/**
 * One session lookup per request. The layout, the plan gate and the page all ask for the session;
 * each lookup checks the user in the database, so without this a dashboard page paid for it three times.
 */
export const getSession = cache(() => getServerSession(authOptions));

// Lets the paid-data meter (instrumentation.ts) charge a request's data to the signed-in user's workspace.
registerUserResolver(async () => {
  const session = await getServerSession(authOptions);
  return (session?.user as { id?: string } | undefined)?.id ?? null;
});
