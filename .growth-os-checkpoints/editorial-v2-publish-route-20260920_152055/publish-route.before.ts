import {
  ContentGateError,
} from "@/lib/content/content-gate";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireUser,
  requireWebsiteAccess,
  authErrorResponse,
} from "@/lib/auth-helpers";

import {
  getContentArticleById,
} from "@/lib/content/repository";

import {
  publishArticle,
} from "@/lib/content/service";

import {
  getCMSConnection,
} from "@/lib/cms/repository";

import {
  getProviderForType,
} from "@/lib/cms/registry";

import {
  assertOutcomeActionExecutable,
  markOutcomeActionExecuted,
} from "@/lib/keywords/outcome-service";

export async function POST(
  req: NextRequest,
  {
    params,
  }: {
    params:
      Promise<{
        id:
          string;
      }>;
  }
) {
  try {
    const {
      id,
    } =
      await params;

    const user =
      await requireUser();

    const body =
      await req
        .json()
        .catch(
          () => ({})
        ) as {
          outcomeActionId?:
            string;
        };

    const outcomeActionId =
      typeof body.outcomeActionId ===
        "string"
        ? body.outcomeActionId.trim()
        : "";

    const article =
      await getContentArticleById(
        id
      );

    if (
      !article
    ) {
      return NextResponse.json(
        {
          error:
            "Article not found.",
        },
        {
          status:
            404,
        }
      );
    }

    const website =
      await requireWebsiteAccess(
        user.id,
        article.brief.websiteId
      );

    const effectiveOutcomeActionId =
      outcomeActionId ||
      article.brief.outcomeActionId?.trim() ||
      "";

    if (
      effectiveOutcomeActionId
    ) {
      try {
        await assertOutcomeActionExecutable({
          workspaceId:
            website.business.workspaceId,

          websiteId:
            article.brief.websiteId,

          actionId:
            effectiveOutcomeActionId,

          executionKind:
            "CONTENT_PUBLISH",

          primaryKeyword:
            article.brief.primaryKeyword,
        });
      } catch {
        return NextResponse.json(
          {
            error:
              "This Growth OS action cannot be linked to this content execution.",
          },
          {
            status:
              409,
          }
        );
      }
    }

    const connection =
      await getCMSConnection(
        article.brief.websiteId
      );

    if (
      !connection
    ) {
      return NextResponse.json(
        {
          error:
            "CMS is not connected for this website.",
        },
        {
          status:
            409,
        }
      );
    }

    const provider =
      getProviderForType(
        connection.cmsType
      );

    const updated =
      await publishArticle(
        provider,
        id
      );

    let outcomeLink:
      | {
          status:
            "EXECUTED";
          actionId:
            string;
        }
      | {
          status:
            "NOT_EXECUTED";
          actionId:
            string;
        }
      | {
          status:
            "FAILED_TO_RECORD";
          actionId:
            string;
        }
      | null =
      null;

    if (
      effectiveOutcomeActionId
    ) {
      if (
        updated.status ===
        "PUBLISHED"
      ) {
        try {
          await markOutcomeActionExecuted({
            workspaceId:
              website.business.workspaceId,

            websiteId:
              article.brief.websiteId,

            actionId:
              effectiveOutcomeActionId,

            executionKind:
              "CONTENT_PUBLISH",

            primaryKeyword:
              article.brief.primaryKeyword,

            contentArticleId:
              updated.id,
          });

          outcomeLink = {
            status:
              "EXECUTED",

            actionId:
              effectiveOutcomeActionId,
          };
        } catch (
          linkError
        ) {
          console.error(
            "content publish outcome link error",
            linkError
          );

          outcomeLink = {
            status:
              "FAILED_TO_RECORD",

            actionId:
              effectiveOutcomeActionId,
          };
        }
      } else {
        outcomeLink = {
          status:
            "NOT_EXECUTED",

          actionId:
            effectiveOutcomeActionId,
        };
      }
    }

    return NextResponse.json(
      outcomeLink
        ? {
            article:
              updated,

            outcomeLink,
          }
        : {
            article:
              updated,
          }
    );
  } catch (
    err
  ) {
    if (
      err instanceof
      ContentGateError
    ) {
      return NextResponse.json(
        {
          error:
            "Article blocked by Content Quality Gate.",

          issues:
            err.issues,

          claims:
            err.claimFindings,
        },
        {
          status:
            409,
        }
      );
    }

    console.error(
      "content/articles/[id]/publish POST error",
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
