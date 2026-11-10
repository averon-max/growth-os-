import { NextResponse } from "next/server";
import { rateLimit, ipFrom } from "@/lib/rate-limit";
import { requestPasswordReset } from "@/lib/password-reset";

export async function POST(request: Request) {
  let email = "";
  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email : "";
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const normalized = email.toLowerCase().trim();
  if (!normalized || !normalized.includes("@")) {
    return NextResponse.json({ error: "Введите корректный email" }, { status: 400 });
  }

  const ip = ipFrom(request.headers.get("x-forwarded-for"));
  if (
    rateLimit("reset:" + normalized, 3, 60 * 60 * 1000) === false ||
    rateLimit("reset-ip:" + ip, 20, 60 * 60 * 1000) === false
  ) {
    return NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
  }

  try {
    await requestPasswordReset(normalized);
  } catch (error) {
    console.error("[forgot-password]", error);
  }

  // Ответ одинаковый, есть такой пользователь или нет.
  return NextResponse.json({ ok: true });
}
