import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { getContentBriefById } from "@/lib/content/repository";
import { generateArticleFromBrief } from "@/lib/content/service";
import { geminiGenerator } from "@/lib/content/gemini-generator";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();

    const brief = await getContentBriefById(id);
    if (!brief) {
      return NextResponse.json({ error: "Content brief not found." }, { status: 404 });
    }

    await requireWebsiteAccess(user.id, brief.websiteId);

    const article = await generateArticleFromBrief(geminiGenerator, id);
    return NextResponse.json({ article }, { status: 201 });
  } catch (err) {
    const providerMessage =
      err instanceof Error
        ? err.message
        : "";

    const providerMatch =
      /(?:Gemini|Groq) API error (413|429|500|502|503|504)\b/.exec(
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
