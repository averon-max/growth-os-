import { EditorialRepetitionGateErrorV1 } from "@/lib/content/editorial-repetition-guard-v1";
import {
  ContentGateError,
} from "@/lib/content/content-gate";
import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { getContentArticleById } from "@/lib/content/repository";
import { approveArticle } from "@/lib/content/service";
import {
  ArticlePublicationPolicyError,
} from "@/lib/content/article-publication-policy";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();

    const article = await getContentArticleById(id);
    if (!article) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 });
    }

    await requireWebsiteAccess(user.id, article.brief.websiteId);

    if (article.status !== "IN_REVIEW") {
      return NextResponse.json(
        {
          error:
            `Cannot approve an article with status ${article.status}. Article must be IN_REVIEW.`,
        },
        {
          status:
            409,
        }
      );
    }

    const updated = await approveArticle(id);
    return NextResponse.json({ article: updated });
  } catch (err) {
    if (err instanceof EditorialRepetitionGateErrorV1) {
      return NextResponse.json({
        error:err.message,code:err.code,
        sections:err.findings.map(f=>({
          sectionIndex:f.sectionIndex,issue:f.code,
          affectedSections:f.affectedSections,
        })),
      },{status:409});
    }

    if (
      err instanceof
      ArticlePublicationPolicyError
    ) {
      return NextResponse.json(
        {
          error:
            "Article requires editorial or evidence review.",

          issues:
            err.issues,

          planWarnings:
            err.planWarnings,

          evidenceFindings:
            err.evidenceFindings,
        },
        {
          status:
            409,
        }
      );
    }


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
          status: 409,
        }
      );
    }

    console.error("content/articles/[id]/approve POST error", err);
    const { status, body: errBody } = authErrorResponse(err);
    return NextResponse.json(errBody, { status });
  }
}
