import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { emailHtml } from "@/lib/email-template";
import { checkRequest, clientIp, limit, normalizeEmail } from "@/lib/auth-guard";

const CATEGORIES = ["Account & login", "Billing", "Bug", "Feature request", "Other"];
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\u0000/g, "").trim().slice(0, max) : "");
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function POST(req: Request) {
  const bad = checkRequest(req);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  const ip = clientIp(req.headers);
  if (!(await limit("support-ip:" + ip, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many requests. Try again in an hour or email support@hyprlyx.com." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  if (typeof body?.website === "string" && body.website) return NextResponse.json({ ok: true, number: 0 }); // honeypot

  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const email = normalizeEmail(session?.user?.email ?? body?.email);
  const name = clean(body?.name, 80);
  const category = CATEGORIES.includes(body?.category) ? body.category : "Other";
  const subject = clean(body?.subject, 140);
  const message = clean(body?.message, 5000);

  if (!email) return NextResponse.json({ error: "Enter a valid email so we can reply." }, { status: 400 });
  if (subject.length < 3) return NextResponse.json({ error: "Add a short subject." }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ error: "Tell us a bit more (at least 10 characters)." }, { status: 400 });
  if (!(await limit("support-email:" + email, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many requests from this email. Try again later." }, { status: 429 });
  }

  const ticket = await prisma.supportTicket.create({ data: { userId, email, name: name || null, category, subject, message } });
  const site = (process.env.NEXTAUTH_URL ?? "https://hyprlyx.com").replace(/\/$/, "");
  const inbox = process.env.SUPPORT_EMAIL ?? "support@hyprlyx.com";

  try {
    await sendMail({
      to: inbox,
      replyTo: email,
      subject: `[#${ticket.number}] ${category}: ${subject}`,
      text: `Ticket #${ticket.number}\nFrom: ${name || "-"} <${email}>${userId ? ` (user ${userId})` : " (not logged in)"}\nCategory: ${category}\n\n${message}\n\nReply to this email to answer the customer.\n${site}/dashboard/admin/tickets`,
      html: `<div style="font:14px/1.6 -apple-system,Segoe UI,Arial,sans-serif;color:#111">
        <p><b>Ticket #${ticket.number}</b> · ${esc(category)}</p>
        <p>From: ${esc(name || "-")} &lt;${esc(email)}&gt;${userId ? "" : " · not logged in"}</p>
        <h3 style="margin:16px 0 8px">${esc(subject)}</h3>
        <pre style="white-space:pre-wrap;font:inherit;background:#f4f4f5;padding:12px;border-radius:8px">${esc(message)}</pre>
        <p style="color:#666">Reply to this email to answer the customer · <a href="${site}/dashboard/admin/tickets">All tickets</a></p></div>`,
    });
    await sendMail({
      to: email,
      replyTo: inbox,
      subject: `We got your message [#${ticket.number}]`,
      text: `Thanks for reaching out. We received your request #${ticket.number} ("${subject}") and usually reply within one business day.\n\nJust reply to this email to add details.\n\n— Hyprlyx support`,
      html: emailHtml({
        preview: `Request #${ticket.number} received. We usually reply within one business day.`,
        title: `We got your message`,
        body: `Thanks for reaching out. Your request #${ticket.number} — “${subject}” — is with our team. We usually reply within one business day. To add details, just reply to this email.`,
        button: { label: "Open Hyprlyx", url: `${site}/dashboard` },
        note: "You're receiving this because you contacted Hyprlyx support.",
      }),
    });
  } catch (error) {
    console.error("[support] mail", error);
  }
  return NextResponse.json({ ok: true, number: ticket.number });
}
