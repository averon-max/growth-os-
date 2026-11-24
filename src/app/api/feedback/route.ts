import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { checkRequest, clientIp, limit, normalizeEmail } from "@/lib/auth-guard";

const KINDS = ["Bug", "Idea", "Confusing", "Praise"];
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function POST(req: Request) {
  const bad = checkRequest(req);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  if (!(await limit("feedback-ip:" + clientIp(req.headers), 10, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many messages. Try again later." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 4000) : "";
  if (message.length < 5) return NextResponse.json({ error: "Write a few words." }, { status: 400 });
  const kind = KINDS.includes(body?.kind) ? body.kind : "Idea";
  const pageUrl = typeof body?.pageUrl === "string" && body.pageUrl.startsWith("/") ? body.pageUrl.slice(0, 300) : null;
  const ua = `${(req.headers.get("user-agent") ?? "").slice(0, 200)}${typeof body?.viewport === "string" ? " · " + body.viewport.slice(0, 20) : ""}`;

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const email = normalizeEmail(session?.user?.email ?? body?.email) ?? "anonymous";

  const t = await prisma.supportTicket.create({
    data: { kind: "feedback", userId, email, category: kind, subject: message.split("\n")[0].slice(0, 100), message, pageUrl, userAgent: ua },
  });

  if (kind === "Bug") {
    const site = (process.env.NEXTAUTH_URL ?? "https://hyprlyx.com").replace(/\/$/, "");
    sendMail({
      to: process.env.SUPPORT_EMAIL ?? "support@hyprlyx.com",
      ...(email !== "anonymous" ? { replyTo: email } : {}),
      subject: `[Bug #${t.number}] ${t.subject}`,
      text: `${message}\n\nPage: ${pageUrl ?? "-"}\nFrom: ${email}\n${ua}\n${site}/dashboard/admin/feedback`,
      html: `<div style="font:14px/1.6 -apple-system,Arial,sans-serif"><pre style="white-space:pre-wrap;font:inherit">${esc(message)}</pre><p style="color:#666">Page: ${esc(pageUrl ?? "-")}<br>From: ${esc(email)}<br>${esc(ua)}</p><a href="${site}/dashboard/admin/feedback">All feedback</a></div>`,
    }).catch((e) => console.error("[feedback] mail", e));
  }
  return NextResponse.json({ ok: true });
}
