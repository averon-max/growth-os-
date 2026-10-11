import {
  ContentRunBudgetExceededErrorV1,
} from "@/lib/content/content-run-budget-v1";

import {
  runContentCrawlPreflightV1,
} from "@/lib/content/content-crawl-preflight-v1";

import {
  parseContentGenerationPolicyV1,
  resolveGenerationTopicV1,
} from "@/lib/content/content-generation-mode-v1";

import {
  BRIEF_RESEARCH_BUDGET_V1,
  createContentRunBudgetV1,
  withContentRunBudgetV1,
} from "@/lib/content/content-run-budget-v1";

import {
  parseArticleTemplateOverrideV1,
} from "@/lib/content/article-template-policy-v1";

import { resolveApprovedKeywordPrimaryV2 } from "@/lib/keywords/keyword-decision-authority-v2";
import { parseCachedKeywordResearchV2 } from "@/lib/keywords/keyword-research-cache-v2";
import type { RelatedKeywordResult } from "@/lib/keywords/dataforseo-provider";

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

    /*
     * CONTENT_GENERATION_MODE_INGRESS_V1
     *
     * Existing behavior defaults to EXACT_KEYWORD.
     * BEST_OPPORTUNITY must be explicitly requested.
     */
    let generationPolicy =
      parseContentGenerationPolicyV1(
        body
      );


    const templateOverride =
      parseArticleTemplateOverrideV1(
        (
          body as {
            templateOverride?:
              unknown;
          }
        ).templateOverride
      );


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

    /*
     * KEYWORD_INTELLIGENCE_V2_APPROVED_WINNER
     * The client supplies only a cache key. The server loads the previously
     * stored research decision and locks the existing EXACT primary gate.
     * No client-supplied candidate keywords are trusted here.
     */
    const approvedResearchKey = (
      body as { approvedResearchKey?: unknown }
    ).approvedResearchKey;
    let relatedKeywordEvidence: RelatedKeywordResult[] | undefined;

    if (approvedResearchKey !== undefined) {
      if (generationPolicy.mode !== "BEST_OPPORTUNITY" ||
          typeof approvedResearchKey !== "string" ||
          approvedResearchKey.length > 512) {
        return NextResponse.json(
          { error: "Invalid BEST_OPPORTUNITY research reference",
            code: "KEYWORD_V2_REFERENCE_INVALID" },
          { status: 400 }
        );
      }
      const snapshot = await prisma.keywordSuggestionCache.findUnique({
        where: {
          normalized_source: {
            normalized: approvedResearchKey,
            source: "KEYWORD_INTELLIGENCE_V2",
          },
        },
      });
      if (!snapshot || Date.now() - snapshot.fetchedAt.getTime() > 24 * 60 * 60 * 1000) {
        return NextResponse.json(
          { error: "Approved keyword research not found or expired",
            code: "KEYWORD_V2_RESEARCH_NOT_FOUND" },
          { status: 422 }
        );
      }

      let primary: string;
      try {
        const parts = approvedResearchKey.split(":");
        const market = parts[1];
        const expectedMarket = market === "US" || market === "CA" ||
          market === "GB" || market === "AU" ? market : null;
        if (!expectedMarket) throw new Error("KEYWORD_V2_RESEARCH_MARKET_INVALID");
        const snapshotData = snapshot.payload as { seed?: unknown };
        const seed = typeof snapshotData?.seed === "string" ? snapshotData.seed : "";
        const parsed = parseCachedKeywordResearchV2(snapshot.payload, {
          websiteId, cacheKey: approvedResearchKey, seed, market: expectedMarket,
        });
        if (!parsed) throw new Error("KEYWORD_V2_RESEARCH_INVALID");
        primary = resolveApprovedKeywordPrimaryV2(parsed, websiteId);
        relatedKeywordEvidence = parsed.candidateSnapshots
          .filter(candidate => candidate.sources.includes("DATAFORSEO"))
          .map(candidate => ({
            keyword: candidate.keyword,
            searchVolume: candidate.searchVolume,
            keywordDifficulty: candidate.keywordDifficulty,
            cpc: candidate.cpc,
            competitionLevel: null,
            monthlySearches: [],
            trend: null,
          }));
        if (!relatedKeywordEvidence.some(candidate =>
          candidate.keyword.trim().toLowerCase() === primary.toLowerCase())) {
          relatedKeywordEvidence.unshift({
            keyword: primary, searchVolume: null, keywordDifficulty: null,
            cpc: null, competitionLevel: null, monthlySearches: [], trend: null,
          });
        }
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Invalid research",
            code: "KEYWORD_V2_RESEARCH_INVALID" },
          { status: 422 }
        );
      }
      // Reuse the EXISTING exact keyword lock, which already asserts
      // downstream primary identity and prevents StagePlanner drift.
      generationPolicy = parseContentGenerationPolicyV1({
        generationMode: "EXACT_KEYWORD",
        topic: primary,
        exactKeyword: primary,
      });
    }

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

    /*
     * CONTENT_GENERATION_TOPIC_RESOLUTION_V1
     */
    topic =
      resolveGenerationTopicV1(
        generationPolicy
      );

    const business = await prisma.business.findUnique({ where: { id: website.businessId } });
    if (!business) {
      return NextResponse.json({ error: "Business not found for this website." }, { status: 500 });
    }


    /*
     * CONTENT_REAL_CRAWL_PREFLIGHT_V1
     *
     * Uses the existing SSRF-safe crawler.
     * Never dumps full page body text into the Writer context.
     */
    const crawlPreflight =
      await runContentCrawlPreflightV1({
        websiteUrl:
          website.url,

        query:
          generationPolicy.requestedTopic,
      });

    const effectiveRecommendation =
      [
        recommendation,

        crawlPreflight
          .promptContext,
      ]
        .filter(
          Boolean
        )
        .join(
          "\n\n"
        );


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

    const contentRunBudget =
      createContentRunBudgetV1(
        BRIEF_RESEARCH_BUDGET_V1
      );

    const budgetedGenerator =
      withContentRunBudgetV1({
        generator:
          geminiGenerator,

        budget:
          contentRunBudget,
      });

    const brief = await createContentBrief(
      budgetedGenerator,
      {
      websiteId,
      opportunityId,
      topic,
      reason,
      recommendation:
        effectiveRecommendation,
      businessName: business.name,
      websiteUrl: website.url,
      searchMission:
        effectiveSearchMission,

      templateOverride,

      generationMode:
        generationPolicy.mode,

      requiredPrimaryKeyword:
        generationPolicy.mode ===
        "EXACT_KEYWORD"
          ? generationPolicy
              .exactKeyword ??
            undefined
          : undefined,

      exactKeyword:
        generationPolicy.exactKeyword ??
        undefined,

      generationPolicy,
      relatedKeywordEvidence,
      }
    );

    return NextResponse.json(
      {
        brief,

        generationMode:
          generationPolicy.mode,

        crawlPreflight: {
          version:
            crawlPreflight.version,

          status:
            crawlPreflight.status,

          pagesCrawled:
            crawlPreflight.pagesCrawled,

          usablePages:
            crawlPreflight.usablePages,

          ownershipSignal:
            crawlPreflight.ownershipSignal,

          candidates:
            crawlPreflight.candidates,
        },

        runBudget:
          contentRunBudget
            .snapshot(),
      },
      {
        status:
          201,
      }
    );
  } catch (err) {
    /*
     * CONTENT_RUN_BUDGET_EXCEEDED_SURFACE_V1
     */
    if (
      err instanceof
        ContentRunBudgetExceededErrorV1
    ) {
      return NextResponse.json(
        {
          error:
            "Content generation stopped before exceeding the configured AI budget.",

          code:
            err.code,

          budget:
            err.snapshot,

          retryable:
            false,
        },
        {
          status:
            422,
        }
      );
    }

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
