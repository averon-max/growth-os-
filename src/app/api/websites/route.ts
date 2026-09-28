import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireWorkspaceAccess, authErrorResponse } from "@/lib/auth-helpers";

function normalizeUrl(input: string): string | null {
  try {
    let url = input.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

const CreateWebsiteSchema = z.object({
  businessName: z.string().trim().min(1).max(200),
  industry: z.string().trim().max(200).optional(),
  location: z.string().trim().max(200).optional(),
  websiteUrl: z.string().trim().min(1),
  workspaceId: z.string().trim().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const parsed = CreateWebsiteSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { businessName, industry, location, websiteUrl, workspaceId } = parsed.data;

    await requireWorkspaceAccess(user.id, workspaceId);

    const normalizedUrl = normalizeUrl(websiteUrl);
    if (!normalizedUrl) {
      return NextResponse.json(
        { error: "Invalid website URL." },
        { status: 400 }
      );
    }

    const business = await prisma.business.create({
      data: {
        name: businessName,
        industry: industry || null,
        location: location || null,
        workspaceId,
      },
    });

    const website = await prisma.website.create({
      data: {
        url: normalizedUrl,
        businessId: business.id,
      },
    });

    return NextResponse.json({ website, business }, { status: 201 });
  } catch (err) {
    console.error("websites POST error", err);
    const { status, body: errBody } = authErrorResponse(err);
    return NextResponse.json(errBody, { status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId query parameter is required." },
        { status: 400 }
      );
    }

    await requireWorkspaceAccess(user.id, workspaceId);

    const websites = await prisma.website.findMany({
      where: {
        business: {
          workspaceId,
        },
      },
      include: {
        business: true,
        analyses: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ websites });
  } catch (err) {
    console.error("websites GET error", err);
    const { status, body: errBody } = authErrorResponse(err);
    return NextResponse.json(errBody, { status });
  }
}
