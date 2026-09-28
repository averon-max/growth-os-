import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { applyFix } from "@/lib/cms/service";
import { getProviderForType } from "@/lib/cms/registry";
import { getCMSConnection } from "@/lib/cms/repository";
import { UnsupportedFixTypeError, CMSNotConnectedError } from "@/lib/cms/provider";
import type { FixType } from "@/lib/cms/types";
import { assertOutcomeActionExecutable, markOutcomeActionExecuted } from "@/lib/keywords/outcome-service";

const ApplyFixSchema = z.object({
  websiteId: z.string().trim().min(1),
  opportunityId: z.string().trim().min(1).optional(),
  issueId: z.string().trim().min(1).optional(),
  pageUrl: z.string().trim().min(1),
  fixType: z.string().trim().min(1),
  newValue: z.string().min(1),
  outcomeActionId: z.string().trim().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const parsed = ApplyFixSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const {
      websiteId,
      opportunityId,
      issueId,
      pageUrl,
      newValue,
      outcomeActionId: rawOutcomeActionId,
    } = parsed.data;
    const fixType = parsed.data.fixType as FixType;

    const outcomeActionId = rawOutcomeActionId?.trim() ?? "";

    const website = await requireWebsiteAccess(user.id, websiteId);

    if (outcomeActionId) {
      try {
        await assertOutcomeActionExecutable({
          workspaceId: website.business.workspaceId,
          websiteId,
          actionId: outcomeActionId,
          executionKind: "CMS_FIX",
          requestedPageUrl: pageUrl,
        });
      } catch {
        return NextResponse.json(
          { error: "This Growth OS action cannot be linked to this website execution." },
          { status: 409 }
        );
      }
    }

    const connection = await getCMSConnection(websiteId);

    if (!connection) {
      return NextResponse.json({ error: "CMS is not connected for this website" }, { status: 409 });
    }

    const provider = getProviderForType(connection.cmsType);

    const result = await applyFix(provider, {
      websiteId,
      opportunityId,
      issueId,
      pageUrl,
      fixType,
      newValue,
    });

    let outcomeLink:
      | { status: "EXECUTED"; actionId: string }
      | { status: "NOT_EXECUTED"; actionId: string }
      | { status: "FAILED_TO_RECORD"; actionId: string }
      | null = null;

    if (outcomeActionId) {
      if (result.status === "SUCCESS") {
        try {
          await markOutcomeActionExecuted({
            workspaceId: website.business.workspaceId,
            websiteId,
            actionId: outcomeActionId,
            executionKind: "CMS_FIX",
            requestedPageUrl: pageUrl,
            appliedFixId: result.id,
          });

          outcomeLink = { status: "EXECUTED", actionId: outcomeActionId };
        } catch (linkError) {
          console.error("cms/apply-fix outcome link error", linkError);
          outcomeLink = { status: "FAILED_TO_RECORD", actionId: outcomeActionId };
        }
      } else {
        outcomeLink = { status: "NOT_EXECUTED", actionId: outcomeActionId };
      }
    }

    return NextResponse.json(
      outcomeLink ? { fix: result, outcomeLink } : { fix: result },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof UnsupportedFixTypeError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }

    if (err instanceof CMSNotConnectedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }

    console.error("cms/apply-fix POST error", err);

    const { status, body: errBody } = authErrorResponse(err);

    return NextResponse.json(errBody, { status });
  }
}
