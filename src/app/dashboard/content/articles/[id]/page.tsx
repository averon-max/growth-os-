import Link from "next/link";

import {
  ArrowLeft,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  requireUser,
  requireWebsiteAccess,
} from "@/lib/auth-helpers";

import {
  prisma,
} from "@/lib/prisma";

import {
  Topbar,
} from "@/components/dashboard/topbar";

import {
  ArticleWorkspace,
} from "@/components/dashboard/article-workspace";

import styles from "@/components/dashboard/article-workspace.module.css";
import { parsePersistedArticleExecutionPlanV1 }
  from "@/lib/content/article-execution-plan-binding-v1";
import { resolveArticleLengthContractV1 }
  from "@/lib/content/article-length-contract-v1";
import {inspectMasterRuntimeSnapshot}
  from "@/lib/content/master-runtime-adapter";
import {evaluateArticleSearchReadinessV2}
  from "@/lib/content/article-search-readiness-v2";

export default async function ArticlePage({
  params,
}: {
  params:
    Promise<{
      id: string;
    }>;
}) {
  const {
    id,
  } =
    await params;

  const user =
    await requireUser();

  const article =
    await prisma.contentArticle.findUnique({
      where: {
        id,
      },

      include: {
        brief: {
          select: {
            id:
              true,

            websiteId:
              true,

            topic:
              true,

            primaryKeyword:
              true,

            searchIntent:
              true,
            secondaryKeywords:
              true,
          },
        },
      },
    });

  if (!article) {
    notFound();
  }

  await requireWebsiteAccess(
    user.id,
    article.brief
      .websiteId
  );

  const evidence=await prisma.contentEvidenceSnapshot.findUnique({
    where:{briefId:article.brief.id},select:{plan:true},
  });
  const latestReplay=await prisma.serpReplayArtifact.findFirst({
    where:{contentArticleId:id},
    orderBy:[{createdAt:"desc"},{id:"desc"}],
  });
  let qualityMinimumWords=0;
  try{
    const plan=evidence?.plan as Record<string,unknown> | null;
    if(plan?.articleExecutionPlan){
      const execution=parsePersistedArticleExecutionPlanV1(
        plan.articleExecutionPlan);
      qualityMinimumWords=resolveArticleLengthContractV1(execution)
        .targetWords?.min??0;
    }
  }catch{
    // Missing historical plan cannot be fabricated into a quality target.
  }
  let qualityExecutionPlan:null|ReturnType<
    typeof parsePersistedArticleExecutionPlanV1>=null;
  try{
    const saved=evidence?.plan;
    const value=saved&&typeof saved==="object"&&!Array.isArray(saved)
      ?saved as Record<string,unknown>:null;
    if(value?.articleExecutionPlan)
      qualityExecutionPlan=parsePersistedArticleExecutionPlanV1(
        value.articleExecutionPlan);
  }catch{
    // Historic invalid plan => explicit readiness blocker.
  }
  const qualityRuntime=inspectMasterRuntimeSnapshot(
    evidence?.plan).runtime;
  const searchReadiness=evaluateArticleSearchReadinessV2({
    article:{title:article.title,metaDescription:article.metaDescription,
      h1:article.h1,bodyMarkdown:article.bodyMarkdown},
    primaryKeyword:article.brief.primaryKeyword,
    secondaryKeywords:article.brief.secondaryKeywords,
    plan:qualityExecutionPlan,runtime:qualityRuntime,
    replay:latestReplay,
  });
  return (
    <>
      <Topbar
        title="Article"
        subtitle={
          article.brief
            .primaryKeyword
        }
      />

      <div
        className={
          styles.page
        }
      >
        <Link
          href={`/dashboard/content?websiteId=${encodeURIComponent(
            article.brief
              .websiteId
          )}`}
          className={
            styles.back
          }
        >
          <ArrowLeft
            size={13}
          />

          Content
        </Link>

        <section aria-label="Search readiness and market evidence"
          style={{border:"1px solid #2A2E33",borderRadius:12,
            background:"#0F1011",padding:16,marginBottom:18}}>
          <h2 style={{fontSize:15,fontWeight:650,color:"#F7F8F8",marginBottom:8}}>
            Search readiness — {searchReadiness.status.replaceAll("_"," ")}
          </h2>
          <p style={{fontSize:13,color:"#9CA0A8",marginBottom:8}}>
            Brief keyword phrases: {searchReadiness.briefLexicalCoverage.filter(
              x=>x.exactMentions>0).length}/
            {searchReadiness.briefLexicalCoverage.length} (lexical only).
            Real observed supporting queries: {searchReadiness.observedSupportingQueries},
            mapped to H2: {searchReadiness.assignedSupportingQueries}.
            SERP Replay: {searchReadiness.replay.status??"MISSING"}.
          </p>
          <p style={{fontSize:12,color:"#9CA0A8",marginBottom:10}}>
            Exact keywords and article word count do not predict Google rankings.
            This review uses only persisted search evidence.
          </p>
          {searchReadiness.findings.length>0?(
            <ul style={{paddingLeft:18,marginTop:6,marginBottom:10}}>
              {searchReadiness.findings.slice(0,7).map(finding=>(
                <li key={finding.code} style={{
                  color:finding.severity==="BLOCK"?"#ECA7A5":"#CED0D5",
                  fontSize:12,marginBottom:7}}>
                  <strong>{finding.code}</strong>: {finding.reason}
                  <span style={{color:"#9CA0A8"}}> Next: {finding.action}</span>
                </li>
              ))}
            </ul>
          ):null}
          <Link href="/dashboard/keywords" style={{fontSize:12,
            color:"#A8AEFF",textDecoration:"underline"}}>
            Review real keyword research
          </Link>
        </section>
        <ArticleWorkspace
          qualityMinimumWords={qualityMinimumWords}
          initialArticle={{
            id:
              article.id,

            websiteId:
              article.brief
                .websiteId,

            title:
              article.title,

            metaDescription:
              article.metaDescription,

            h1:
              article.h1,

            bodyMarkdown:
              article.bodyMarkdown,

            status:
              article.status,

            publishedUrl:
              article.publishedUrl,

            publishedAt:
              article.publishedAt
                ?.toISOString() ??
              null,

            updatedAt:
              article.updatedAt.toISOString(),

            topic:
              article.brief
                .topic,

            primaryKeyword:
              article.brief
                .primaryKeyword,

            searchIntent:
              article.brief
                .searchIntent,
          }}
        />
      </div>
    </>
  );
}
