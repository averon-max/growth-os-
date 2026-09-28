import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { assertMockProviderEnabled, MockProviderDisabledError, checkAuth, getPage, patchPage } from "@/lib/cms/mock-provider-store";

const PatchPageSchema = z.object({
  title: z.string().trim().min(1).optional(),
  metaDescription: z.string().nullable().optional(),
  h1: z.string().nullable().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertMockProviderEnabled();
  } catch (err) {
    if (err instanceof MockProviderDisabledError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw err;
  }
  if (!checkAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  const { id } = await params;
  const page = getPage(id);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(page);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertMockProviderEnabled();
  } catch (err) {
    if (err instanceof MockProviderDisabledError) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw err;
  }
  if (!checkAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  const { id } = await params;
  const parsed = PatchPageSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const updated = patchPage(id, parsed.data);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
