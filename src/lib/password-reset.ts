import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";

const TOKEN_TTL_MS = 60 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 8;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function appUrl(): string {
  return (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Создаёт токен и отправляет письмо. Молча выходит, если пользователя нет:
 * ответ наружу одинаковый в обоих случаях, чтобы нельзя было перебирать адреса.
 */
export async function requestPasswordReset(rawEmail: string): Promise<void> {
  const email = rawEmail.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;

  // Старые неиспользованные токены этого пользователя больше не нужны.
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });

  const token = randomBytes(32).toString("hex");

  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  const link = `${appUrl()}/reset-password?token=${token}`;

  await sendMail({
    to: user.email,
    subject: "Сброс пароля в Growth OS",
    text: [
      "Вы запросили сброс пароля в Growth OS.",
      "",
      "Откройте ссылку, чтобы задать новый пароль:",
      link,
      "",
      "Ссылка действует час и срабатывает один раз.",
      "Если это были не вы — письмо можно удалить, пароль останется прежним.",
    ].join("\n"),
    html: `
      <div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#15161A">
        <p>Вы запросили сброс пароля в Growth OS.</p>
        <p><a href="${link}" style="display:inline-block;padding:10px 18px;border-radius:8px;background:#2F6FB5;color:#fff;text-decoration:none;font-weight:600">Задать новый пароль</a></p>
        <p style="color:#5F6672;font-size:13px">Ссылка действует час и срабатывает один раз.<br>Если это были не вы — письмо можно удалить, пароль останется прежним.</p>
      </div>
    `,
  });
}

export type ResetResult = { ok: true } | { ok: false; reason: "invalid" | "weak" };

export async function completePasswordReset(
  token: string,
  newPassword: string
): Promise<ResetResult> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, reason: "weak" };
  }

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, reason: "invalid" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.userId, usedAt: null },
    }),
  ]);

  return { ok: true };
}
