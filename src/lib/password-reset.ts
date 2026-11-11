import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
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
    html: `
      <div style="background:#08090a;padding:40px 0;font-family:Inter,-apple-system,Segoe UI,sans-serif">
        <div style="max-width:440px;margin:0 auto;background:#0f1011;border:1px solid #23252a;border-radius:14px;padding:32px;color:#f7f8f8">
          <div style="font-size:15px;font-weight:600;margin-bottom:24px">Hyprlyx</div>
          <div style="font-size:20px;font-weight:600;margin-bottom:10px">Reset your password</div>
          <p style="font-size:14px;line-height:1.6;color:#9ca0a8;margin:0 0 24px">Someone asked to reset the password for your account. The link works once and expires in 30 minutes.</p>
          <a href="${link}" style="display:inline-block;padding:11px 20px;border-radius:999px;background:#f7f8f8;color:#08090a;text-decoration:none;font-weight:600;font-size:14px">Set a new password</a>
          <p style="font-size:12px;line-height:1.6;color:#62666e;margin:28px 0 0">If this wasn't you, ignore this email — your password stays the same.</p>
        </div>
      </div>`,
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
