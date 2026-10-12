import {
  ArticlePreWriterEvidenceGateErrorV1,
} from "@/lib/content/article-prewriter-evidence-gate-v1";

import {
  ContentRunBudgetExceededErrorV1,
} from "@/lib/content/content-run-budget-v1";

import {
  ARTICLE_GENERATION_BUDGET_V1,
  createContentRunBudgetV1,
  withContentRunBudgetV1,
} from "@/lib/content/content-run-budget-v1";

import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { getContentBriefById } from "@/lib/content/repository";
import { generateArticleFromBrief } from "@/lib/content/service";
import {
  ARTICLE_RECOVERY_ORCHESTRATOR_V1,
  executeArticleRecoveryOrchestratorV1,
} from "@/lib/content/article-recovery-orchestrator-v1";

import { geminiGenerator } from "@/lib/content/gemini-generator";
import { describeRejectedArticleV1 } from "@/lib/content/article-failure-diagnostic-v1";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();

    const brief = await getContentBriefById(id);
    if (!brief) {
      return NextResponse.json({ error: "Content brief not found." }, { status: 404 });
    }

    await requireWebsiteAccess(user.id, brief.websiteId);

    /*
     * CONTENT_ARTICLE_RUN_BUDGET_V1
     */
    const contentRunBudget =
      createContentRunBudgetV1(
        ARTICLE_GENERATION_BUDGET_V1
      );

    const budgetedGenerator =
      withContentRunBudgetV1({
        generator:
          geminiGenerator,

        budget:
          contentRunBudget,
      });

    /*
     * ARTICLE_RECOVERY_ORCHESTRATOR_V1
     *
     * Tier 1:
     * owning stages perform their own bounded repair.
     *
     * Tier 2:
     * if the completed pass still returns a recoverable REJECTED
     * article, execute exactly ONE fresh production pass using
     * the SAME logical ContentArticle and SAME run budget.
     */
    const recoveryExecution =
      await executeArticleRecoveryOrchestratorV1({
        run:
          () =>
            generateArticleFromBrief(
              budgetedGenerator,
              id
            ),

        onTransition:
          (
            transition
          ) => {
            console.warn(
              "[content article recovery]",
              {
                version:
                  ARTICLE_RECOVERY_ORCHESTRATOR_V1,

                briefId:
                  id,

                attempt:
                  transition.attempt,

                failureClass:
                  transition
                    .recovery
                    .failureClass,

                owner:
                  transition
                    .recovery
                    .owner,

                action:
                  transition
                    .recovery
                    .nextAction,
              }
            );
          },
      });


    const article =
      recoveryExecution
        .article;


    /*
     * FINAL_REJECTED_IS_NOT_HTTP_SUCCESS_V1
     *
     * Never send the UI into an empty REJECTED editor.
     */
    if (
      article.status ===
        "REJECTED"
    ) {
      return NextResponse.json(
        {
          error:
            recoveryExecution
              .recoveryAttempted
              ? "Growth OS attempted automatic recovery, but the article still could not pass its production gates safely."
              : "The article could not pass its production gates safely.",

          ...describeRejectedArticleV1(article.publishError),

          articleCreated:
            true,

          articleId:
            article.id,

          recovery: {
            version:
              ARTICLE_RECOVERY_ORCHESTRATOR_V1,

            attempts:
              recoveryExecution
                .attempts,

            attempted:
              recoveryExecution
                .recoveryAttempted,

            transitions:
              recoveryExecution
                .transitions
                .map(
                  (
                    transition
                  ) => ({
                    attempt:
                      transition
                        .attempt,

                    failureClass:
                      transition
                        .recovery
                        .failureClass,

                    owner:
                      transition
                        .recovery
                        .owner,

                    action:
                      transition
                        .recovery
                        .nextAction,
                  })
                ),
          },

          runBudget:
            contentRunBudget
              .snapshot(),

          retryable:
            false,
        },
        {
          status:
            422,
        }
      );
    }

    return NextResponse.json(
      {
        article,

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
     * ARTICLE_PREWRITER_BLOCKED_SURFACE_V1
     *
     * Upstream evidence/planning blocker. No ContentArticle exists
     * for this attempt (the gate runs before any article row is
     * touched), so surface an actionable state instead of a
     * failed-article page.
     */
    if (
      err instanceof
        ArticlePreWriterEvidenceGateErrorV1 ||
      (
        err instanceof Error &&
        err.name ===
          "ArticlePreWriterEvidenceGateErrorV1"
      )
    ) {
      const gateError =
        err as ArticlePreWriterEvidenceGateErrorV1;

      return NextResponse.json(
        {
          error:
            "Not enough verified evidence to write every required section yet. No article was created. Add verified sources or adjust the brief, then try again.",

          code:
            gateError.code,

          sectionIds:
            gateError.sectionIds ??
            [],

          articleCreated:
            false,

          retryable:
            false,
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
      /(?:OpenAI|Gemini|Groq) API error (413|429|500|502|503|504)\b/.exec(
        providerMessage
      );

    if (providerMatch) {
      const providerStatus =
        Number(
          providerMatch[1]
        );

      console.warn(
        "content/briefs/[id]/generate-article POST error provider failure",
        {
          status:
            providerStatus,
        }
      );

      if (
        providerStatus ===
        413
      ) {
        return NextResponse.json(
          {
            error:
              "The AI request exceeded the provider token budget. Growth OS did not save a rejected article.",

            code:
              "CONTENT_PROVIDER_REQUEST_TOO_LARGE",

            retryable:
              false,
          },
          {
            status:
              413,
          }
        );
      }


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
        "content/briefs/[id]/generate-article POST error provider timeout"
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
      "content/briefs/[id]/generate-article POST error",
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
