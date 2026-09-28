import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createContentBrief } from "@/lib/content/service";
import {
  ProductionMasterBriefBlockedError,
} from "@/lib/content/production-master-brief-required";
import { geminiGenerator } from "@/lib/content/gemini-generator";
import { getContentBriefs } from "@/lib/content/repository";
import {
  parseOptionalExplicitSearchMissionInput,
} from "@/lib/content/search-mission-ingress";

import {
  resolveAutomaticSearchMission,
} from "@/lib/content/automatic-search-mission";

import {
  ProductionMasterLiveStagePlanError,
} from "@/lib/content/production-master-live-stage-planner";

import {
  ProductionMasterLiveSourceError,
} from "@/lib/content/production-master-live-source-adapter";

import {
  ProductionMasterLiveResearchAssemblyError,
} from "@/lib/content/production-master-live-research-assembler";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const missionIngress =
      parseOptionalExplicitSearchMissionInput(
        (
          body as {
            searchMission?: unknown;
          }
        ).searchMission
      );

    if (
      !missionIngress.ok
    ) {
      return NextResponse.json(
        {
          error:
            missionIngress.error,

          code:
            missionIngress.code,
        },
        {
          status:
            400,
        }
      );
    }

    const searchMission =
      missionIngress.value;
    const { websiteId, opportunityId } = body as { websiteId?: string; opportunityId?: string };

    if (!websiteId) {
      return NextResponse.json({ error: "websiteId is required." }, { status: 400 });
    }

    const website = await requireWebsiteAccess(user.id, websiteId);

    let topic: string;
    let reason: string;
    let recommendation: string;

    if (opportunityId) {
      const opportunity = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
      if (!opportunity) {
        return NextResponse.json({ error: "Opportunity not found." }, { status: 404 });
      }
      topic = opportunity.title;
      reason = opportunity.reason;
      recommendation = opportunity.recommendation;
    } else {
      const { topic: bodyTopic, reason: bodyReason, recommendation: bodyRecommendation } = body as {
        topic?: string;
        reason?: string;
        recommendation?: string;
      };
      if (!bodyTopic || !bodyReason || !bodyRecommendation) {
        return NextResponse.json({ error: "topic, reason and recommendation are required when no opportunityId is given." }, { status: 400 });
      }
      topic = bodyTopic;
      reason = bodyReason;
      recommendation = bodyRecommendation;
    }

    const business = await prisma.business.findUnique({ where: { id: website.businessId } });
    if (!business) {
      return NextResponse.json({ error: "Business not found for this website." }, { status: 500 });
    }


    /*
     * AUTO_SEARCH_MISSION_V1
     *
     * Manual SearchMission remains a supported override.
     * Normal article creation only needs a topic.
     */
    const effectiveSearchMission =
      searchMission ??
      resolveAutomaticSearchMission({
        topic,

        industry:
          business.industry,

        businessLocation:
          business.location,
      });

    const brief = await createContentBrief(geminiGenerator, {
      websiteId,
      opportunityId,
      topic,
      reason,
      recommendation,
      businessName: business.name,
      websiteUrl: website.url,
      searchMission:
        effectiveSearchMission,
    });

    return NextResponse.json({ brief }, { status: 201 });
  } catch (err) {
    /*
     * CONTENT_BRIEF_ASSEMBLY_ERROR_SURFACE_V1
     */
    if (
      err instanceof
        ProductionMasterLiveResearchAssemblyError
    ) {
      console.warn(
        "content/briefs POST live research assembly blocked",
        {
          code:
            err.code,
        }
      );

      return NextResponse.json(
        {
          error:
            err.message,

          code:
            err.code,
        },
        {
          status:
            422,
        }
      );
    }

    /*
     * PRODUCTION_MASTER_RESEARCH_ERROR_SURFACE_V1
     *
     * These are deliberate fail-closed production research
     * errors, not anonymous HTTP 500s. Surface their stable
     * codes so the UI can explain the real blocker.
     */
    if (
      err instanceof
        ProductionMasterLiveStagePlanError ||
      err instanceof
        ProductionMasterLiveSourceError
    ) {
      console.warn(
        "content/briefs POST production research blocked",
        {
          code:
            err.code,
        }
      );

      return NextResponse.json(
        {
          error:
            err.message,

          code:
            err.code,
        },
        {
          status:
            422,
        }
      );
    }

    if (
      err instanceof
        ProductionMasterBriefBlockedError
    ) {
      return NextResponse.json(
        {
          error:
            "The production SEO research pipeline is not ready for this brief. Growth OS will not create a legacy article without a validated Stage 1-8 Master Runtime.",

          code:
            err.code,

          blockers:
            err.blockers,

          adapterBlockers:
            err.adapterBlockers,
        },
        {
          status:
            409,
        }
      );
    }

    const providerMessage =
      err instanceof Error
        ? err.message
        : "";

    const providerMatch =
      /(?:Gemini|Groq) API error (429|500|502|503|504)\b/.exec(
        providerMessage
      );

    if (providerMatch) {
      const providerStatus =
        Number(
          providerMatch[1]
        );

      console.warn(
        "content/briefs POST error provider failure",
        {
          status:
            providerStatus,
        }
      );

      if (
        providerStatus ===
        429
      ) {
        return NextResponse.json(
          {
            error:
              "AI provider rate limit or quota was reached. Check provider quota/billing and try again.",

            code:
              "CONTENT_PROVIDER_RATE_LIMIT",

            retryable:
              true,
          },
          {
            status:
              429,

            headers: {
              "Retry-After":
                "30",
            },
          }
        );
      }

      return NextResponse.json(
        {
          error:
            "AI generation is temporarily unavailable. Please try again.",

          code:
            "CONTENT_PROVIDER_TEMPORARY",

          retryable:
            true,
        },
        {
          status:
            503,

          headers: {
            "Retry-After":
              "15",
          },
        }
      );
    }

    if (
      /AbortError|aborted|timeout/i.test(
        providerMessage
      )
    ) {
      console.warn(
        "content/briefs POST error provider timeout"
      );

      return NextResponse.json(
        {
          error:
            "AI generation timed out. Please try again.",

          code:
            "CONTENT_PROVIDER_TIMEOUT",

          retryable:
            true,
        },
        {
          status:
            504,

          headers: {
            "Retry-After":
              "10",
          },
        }
      );
    }

    console.error(
      "content/briefs POST error",
      err
    );

    const {
      status,
      body:
        errBody,
    } =
      authErrorResponse(
        err
      );

    return NextResponse.json(
      errBody,
      {
        status,
      }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const websiteId = req.nextUrl.searchParams.get("websiteId");
    if (!websiteId) {
      return NextResponse.json({ error: "websiteId query parameter is required." }, { status: 400 });
    }

    await requireWebsiteAccess(user.id, websiteId);

    const page = Number(req.nextUrl.searchParams.get("page") ?? "1");
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? "25");

    const result = await getContentBriefs(websiteId, page, limit);
    return NextResponse.json(result);
  } catch (err) {
    console.error("content/briefs GET error", err);
    const { status, body: errBody } = authErrorResponse(err);
    return NextResponse.json(errBody, { status });
  }
}
