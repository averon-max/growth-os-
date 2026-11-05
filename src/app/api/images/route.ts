import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import heicConvert from "heic-convert";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";
const MAX_BYTES = 25 * 1024 * 1024;
const SESSION_COOKIES = ["next-auth.session-token", "__Secure-next-auth.session-token", "authjs.session-token", "__Secure-authjs.session-token"];
const slug = (s: string) => s.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "image";
const isHeic = (f: File) => /heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name);

export async function POST(req: NextRequest) {
  if (!SESSION_COOKIES.some((c) => req.cookies.get(c))) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File is larger than 25 MB" }, { status: 413 });

  const alt = String(form.get("alt") ?? "").replace(/[\[\]]/g, "").slice(0, 200);
  const maxWidth = Math.min(Number(form.get("maxWidth")) || 1600, 3000);
  const quality = Math.min(Math.max(Number(form.get("quality")) || 80, 40), 95);

  try {
    let input: Buffer = Buffer.from(await file.arrayBuffer());
    if (isHeic(file)) input = Buffer.from(await heicConvert({ buffer: input, format: "JPEG", quality: 0.92 }));
    const animated = /gif/i.test(file.type) || /\.gif$/i.test(file.name);
    const out = await sharp(input, { animated, limitInputPixels: 100_000_000 })
      .rotate()
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });
    const name = `${slug(file.name)}-${crypto.randomBytes(4).toString("hex")}.webp`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), out.data);
    const url = `/uploads/${name}`;
    return NextResponse.json({ url, alt, width: out.info.width, height: out.info.height, bytesIn: file.size, bytesOut: out.info.size, markdown: `![${alt}](${url})` });
  } catch (e) {
    return NextResponse.json({ error: `Could not convert ${file.name}: ${(e as Error).message}` }, { status: 422 });
  }
}
