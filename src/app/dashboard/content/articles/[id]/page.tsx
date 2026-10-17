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
import {buildArticleDemandOutlineAuditV1}
  from "@/lib/content/article-demand-outline-audit-v1";
import {proposeExistingArticleQueryOwnerRebindV1}
  from "@/lib/content/existing-article-query-owner-proposal-v1";
import {evaluateApprovedExistingArticleQueryOwnerV1}
  from "@/lib/content/existing-article-approved-query-owner-v1";

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
    where:{briefId:article.brief.id},select:{id:true,plan:true},
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
  const articleShape={
    title:article.title,metaDescription:article.metaDescription,
    h1:article.h1,bodyMarkdown:article.bodyMarkdown,
  };
  const input=qualityRuntime&&qualityExecutionPlan?{
    article:articleShape,runtime:qualityRuntime,plan:qualityExecutionPlan,
    primaryKeyword:article.brief.primaryKeyword,
    secondaryKeywords:article.brief.secondaryKeywords,
    replay:latestReplay,
  }:null;
  const suggested=input?proposeExistingArticleQueryOwnerRebindV1(input):null;
  const onlyNode=suggested?.candidateCount===1?
    suggested.proposals[0]?.nodeId:null;
  const reviewed=onlyNode?await prisma.contentQueryOwnerReview.findFirst({
    where:{contentArticleId:id,queryNodeId:onlyNode},
    orderBy:[{createdAt:"desc"},{id:"desc"}],
  }):null;
  const approved=input&&evidence?
    evaluateApprovedExistingArticleQueryOwnerV1({
      ...input,articleId:id,evidenceSnapshotId:evidence.id,
      replayArtifactId:latestReplay?.id??null,review:reviewed,
    }):null;
  const effectiveRuntime=approved?.valid?approved.runtime:qualityRuntime;
  const searchReadiness=evaluateArticleSearchReadinessV2({
    article:articleShape,
    primaryKeyword:article.brief.primaryKeyword,
    secondaryKeywords:article.brief.secondaryKeywords,
    plan:qualityExecutionPlan,runtime:effectiveRuntime,
    replay:latestReplay,
  });
  const demandOutline=buildArticleDemandOutlineAuditV1({
    ...articleShape,
    primaryKeyword:article.brief.primaryKeyword,
    secondaryKeywords:article.brief.secondaryKeywords,
    runtime:qualityRuntime,
    approvedNodeOwners:approved?.valid?
      {[approved.queryNodeId]:approved.ownerSectionIndex}:{},
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
            assigned to H2: {searchReadiness.assignedSupportingQueries}.
            Existing evidenced H2 matches awaiting re-binding:
            {" "}{searchReadiness.existingH2MatchSuggestions}.
            SERP Replay: {searchReadiness.replay.status??"MISSING"}.
          </p>
          <p style={{fontSize:12,color:"#9CA0A8",marginBottom:10}}>
            Exact keywords and article word count do not predict Google rankings.
            This review uses only persisted search evidence.
          </p>
          {searchReadiness.suggestedQueryRebindings.length>0?(
            <div style={{fontSize:12,color:"#CED0D5",marginBottom:9}}>
              <strong>Queries already matching an evidenced H2
                (unsigned suggestion only):</strong>
              <ul style={{paddingLeft:18,marginTop:5}}>
                {searchReadiness.suggestedQueryRebindings.slice(0,5).map(
                  match=>(
                    <li key={match.query} style={{marginBottom:4}}>
                      {match.query} → {match.ownerHeading}
                      {" "}(H2 #{match.ownerSectionIndex+1}; planning
                      re-binding required)
                    </li>
                  ))}
              </ul>
            </div>
          ):null}
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
        <section aria-label="Article search demand and outline"
          style={{border:"1px solid #2A2E33",borderRadius:12,
            background:"#0F1011",padding:16,marginBottom:18}}>
          <h2 style={{fontSize:15,fontWeight:650,marginBottom:8}}>
            Search demand & actual heading outline
          </h2>
          <p style={{fontSize:12,color:"#9CA0A8",marginBottom:10}}>
            {demandOutline.briefExactCoverage.used}/
            {demandOutline.briefExactCoverage.total} brief phrases matched;
            this is NOT total SEO coverage. {demandOutline.realSearchQueries.length}
            {" "}additional real same-page queries found in saved research.
            H1 {demandOutline.article.h1}; H2 {demandOutline.article.h2};
            H3 {demandOutline.article.h3}.
          </p>
          {demandOutline.realSearchQueries.length>0?(
            <div style={{marginBottom:10}}>
              <strong style={{fontSize:12}}>Observed search queries (not invented targets)</strong>
              <ul style={{paddingLeft:18,fontSize:12}}>
                {demandOutline.realSearchQueries.map(item=>(
                  <li key={item.nodeId}>
                    {item.query} — {item.searchVolume===null?"volume unknown":
                      item.searchVolume+" searches/month"}
                    ; exact wording in article {item.exactMentions}×
                    {item.ownerH2Index!==null?
                      "; assigned to H2 #"+(item.ownerH2Index+1):
                      "; not assigned"}
                  </li>
                ))}
              </ul>
            </div>
          ):<p style={{fontSize:12}}>No extra verified query data in saved Research.</p>}
          <div style={{fontSize:12}}>
            <strong>Actual sections & useful subsections</strong>
            <ol style={{paddingLeft:18,marginTop:6}}>
              {demandOutline.sections.map(sec=>(
                <li key={sec.index} style={{marginBottom:8}}>
                  {sec.heading} — {sec.words} words,
                  {" "}{sec.h3.length} H3,
                  {" "}{sec.visibleSourceLinks} citation links
                  {sec.h3.length>0?(
                    <ul style={{paddingLeft:18}}>
                      {sec.h3.map(h=><li key={h}>{h}</li>)}
                    </ul>
                  ):null}
                </li>
              ))}
            </ol>
          </div>
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
