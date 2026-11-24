import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * One session lookup per request. The layout, the plan gate and the page all ask for the session;
 * each lookup checks the user in the database, so without this a dashboard page paid for it three times.
 */
export const getSession = cache(() => getServerSession(authOptions));
