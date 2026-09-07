import { NextRequest, NextResponse } from "next/server";
import { checkAuth, getPage, patchPage } from "@/lib/cms/mock-provider-store";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  const { id } = await params;
  const page = getPage(id);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(page);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const updated = patchPage(id, body);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
