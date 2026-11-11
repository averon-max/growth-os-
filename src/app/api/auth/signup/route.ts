import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRequest, clientIp, limit, normalizeEmail, passwordProblem } from "@/lib/auth-guard";

export async function POST(req: Request) {
  const bad = checkRequest(req);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });

  const ip = clientIp(req.headers);
  if (!(await limit("signup-ip:" + ip, 5, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many attempts. Try again in an hour." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Honeypot: real people never see or fill this field; bots fill everything.
  if (typeof body.company === "string" && body.company.length > 0) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const email = normalizeEmail(body.email);
  const password = typeof body.password === "string" ? body.password : "";
  const name = typeof body.name === "string" ? body.name.replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 80) : "";

  if (!email) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const problem = await passwordProblem(password, email);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    await bcrypt.hash(password, 12); // keep timing the same as a real signup
    return NextResponse.json(
      { error: "Couldn't create an account with that email. If it's yours, log in or reset your password." },
      { status: 400 },
    );
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name: name || null, passwordHash, passwordChangedAt: new Date(0) },
      });
      const workspace = await tx.workspace.create({ data: { name: name ? `${name}'s Workspace` : "My Workspace" } });
      await tx.workspaceMember.create({ data: { userId: user.id, workspaceId: workspace.id, role: "OWNER" } });
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[signup]", err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
