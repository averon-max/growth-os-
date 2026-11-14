import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { emailHtml } from "@/lib/email-template";
import { passwordProblem } from "@/lib/auth-guard";

const TOKEN_TTL_MS = 30 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function appUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Creates a one-time token and emails it. Silently does nothing for unknown emails — the caller answers the same either way. */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });

  const token = randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.create({
    data: { tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });

  const link = `${appUrl()}/reset-password?token=${token}`;

  await sendMail({
    to: user.email,
    subject: "Reset your Hyprlyx password",
    text: [
      "Someone asked to reset the password for your Hyprlyx account.",
      "",
      "Set a new password here (the link works once and expires in 30 minutes):",
      link,
      "",
      "If this wasn't you, ignore this email — your password stays the same.",
    ].join("\n"),
    html: emailHtml({
      preview: "Set a new password for your Hyprlyx account. The link expires in 30 minutes.",
      title: "Reset your password",
      body: "Someone asked to reset the password for your Hyprlyx account. Click the button to choose a new one. The link works once and expires in 30 minutes.",
      button: { label: "Set a new password", url: link },
      note: "Didn't ask for this? Ignore this email. Your password stays the same, and nobody can change it without this link.",
    }),
  });
}

export type ResetResult = { ok: true } | { ok: false; reason: "invalid" | "weak"; message?: string };

export async function completePasswordReset(token: string, newPassword: string): Promise<ResetResult> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { email: true } } },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) return { ok: false, reason: "invalid" };

  const problem = await passwordProblem(newPassword, record.user.email);
  if (problem) return { ok: false, reason: "weak", message: problem };

  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Mark the token used atomically: if two requests race with the same link, only one wins.
  const claimed = await prisma.passwordResetToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return { ok: false, reason: "invalid" };

  await prisma.$transaction([
    // passwordChangedAt signs out every existing session on every device.
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash, passwordChangedAt: new Date() } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null } }),
  ]);

  return { ok: true };
}
