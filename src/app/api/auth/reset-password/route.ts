import { NextResponse } from "next/server";
import { rateLimit, ipFrom } from "@/lib/rate-limit";
import { completePasswordReset, MIN_PASSWORD_LENGTH } from "@/lib/password-reset";

export async function POST(request: Request) {
  let token = "";
  let password = "";
  try {
    const body = await request.json();
    token = typeof body?.token === "string" ? body.token : "";
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "Ссылка недействительна" }, { status: 400 });
  }

  const ip = ipFrom(request.headers.get("x-forwarded-for"));
  if (rateLimit("reset-confirm-ip:" + ip, 20, 60 * 60 * 1000) === false) {
    return NextResponse.json({ error: "Слишком много попыток. Попробуйте позже." }, { status: 429 });
  }

  const result = await completePasswordReset(token, password);

  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.reason === "weak"
            ? `Пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов`
            : "Ссылка недействительна или уже использована",
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
