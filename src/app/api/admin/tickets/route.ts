import { NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth-helpers";
import { checkRequest } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { emailHtml } from "@/lib/email-template";
import { audit } from "@/lib/admin/core";

const STATUSES = ["open", "pending", "closed"];
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function fail(error: unknown, where: string) {
  const mapped = authErrorResponse(error);
  if (mapped.status === 500) console.error(where, error);
  return NextResponse.json(mapped.body, { status: mapped.status });
}

/** Change status. Body: { id, status } */
export async function PATCH(req: Request) {
  try {
    const bad = checkRequest(req);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const status = STATUSES.includes(body?.status) ? body.status : null;
    if (typeof body?.id !== "string" || !status) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    const t = await prisma.supportTicket.findUnique({ where: { id: body.id }, select: { id: true, number: true, status: true } });
    if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (t.status !== status) {
      await prisma.supportTicket.update({ where: { id: t.id }, data: { status } });
      await audit(admin, "ticket.status", { type: "ticket", id: t.id, label: `#${t.number}` }, { from: t.status, to: status });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return fail(error, "[admin/tickets PATCH]");
  }
}

/**
 * Reply to the customer by email, or add an internal note. Body: { id, body, internal }
 * A reply is emailed from the support address; the customer's answer comes back to the support inbox.
 */
export async function POST(req: Request) {
  try {
    const bad = checkRequest(req);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    const admin = await requireAdmin();
    const body = await req.json().catch(() => ({}));
    const text = typeof body?.body === "string" ? body.body.replace(/\u0000/g, "").trim().slice(0, 10000) : "";
    const internal = body?.internal === true;
    if (typeof body?.id !== "string" || text.length < 2) return NextResponse.json({ error: "Write a message first." }, { status: 400 });

    const t = await prisma.supportTicket.findUnique({ where: { id: body.id } });
    if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const canEmail = t.email.includes("@");
    if (!internal && !canEmail) return NextResponse.json({ error: "This message has no email address to reply to. Add an internal note instead." }, { status: 400 });

    let emailed = false;
    if (!internal) {
      const inbox = process.env.SUPPORT_EMAIL ?? "support@hyprlyx.com";
      const site = (process.env.NEXTAUTH_URL ?? "https://hyprlyx.com").replace(/\/$/, "");
      try {
        await sendMail({
          to: t.email,
          replyTo: inbox,
          subject: `Re: [#${t.number}] ${t.subject}`,
          text: `${text}\n\n— Hyprlyx support\nReply to this email to answer.`,
          html: emailHtml({
            preview: text.slice(0, 120),
            title: `Re: ${t.subject}`,
            body: esc(text).replace(/\n/g, "<br>"),
            button: { label: "Open Hyprlyx", url: `${site}/dashboard` },
            note: `Request #${t.number}. Reply to this email to answer.`,
          }),
        });
        emailed = true;
      } catch (e) {
        console.error("[admin/tickets] mail", e);
        return NextResponse.json({ error: "The email could not be sent. Nothing was saved — try again." }, { status: 502 });
      }
    }

    const message = await prisma.ticketMessage.create({
      data: { ticketId: t.id, authorId: admin.id, authorEmail: admin.email, body: text, internal, emailed },
    });
    // Replied → waiting for the customer.
    if (!internal && t.status === "open") await prisma.supportTicket.update({ where: { id: t.id }, data: { status: "pending" } });
    await audit(admin, internal ? "ticket.note" : "ticket.reply", { type: "ticket", id: t.id, label: `#${t.number}` }, { chars: text.length });
    return NextResponse.json({ ok: true, id: message.id });
  } catch (error) {
    return fail(error, "[admin/tickets POST]");
  }
}
