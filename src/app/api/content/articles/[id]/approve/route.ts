import { EditorialRepetitionGateErrorV1 } from "@/lib/content/editorial-repetition-guard-v1";
import { ArticleInformationGainGateErrorV1 } from "@/lib/content/article-editorial-information-gain-v1";
import {ArticleProseHygieneErrorV2}
  from "@/lib/content/article-search-readiness-v2";
import {ComprehensiveEditorialReleaseErrorV1}
  from "@/lib/content/comprehensive-editorial-release-gate-v1";
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
    if(err instanceof ComprehensiveEditorialReleaseErrorV1){
      return NextResponse.json({
        error:"This guide needs useful sourced depth and H3 subsection structure before approval. Use Improve existing article; no duplicate brief is needed.",
        code:err.code,blockers:err.blockers,retryable:false,
      },{status:409});
    }
    if(err instanceof ArticleProseHygieneErrorV2){
      return NextResponse.json({
        code:err.code,
        error:"Article requires a controlled spacing and punctuation copyedit before approval or publication.",
        defects:err.defects,
        retryable:false,
        guidance:"Edit and review only affected sentences, then rerun factual and SERP Replay gates for the new fingerprint.",
      },{status:409});
    }
    if(err instanceof ArticleInformationGainGateErrorV1){
      return NextResponse.json({
        code:err.code,
        error:"The article has low-information filler or intrusive Source labels. Rewrite the affected meaning using only verified claims, keep research references outside prose, and rerun exact article verification.",
        findings:err.findings,
      },{status:422});
    }
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
