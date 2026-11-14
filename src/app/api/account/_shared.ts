import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function sessionUserId(): Promise<string | null> {
  const s = await getServerSession(authOptions);
  return (s?.user as { id?: string } | undefined)?.id ?? null;
}
