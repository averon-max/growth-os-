/**
 * One-call ZERO-provider, ZERO-model, ZERO-database-write editorial draft.
 * Never stores, approves, publishes or certifies an article.
 * Produces canonical existing H2 + only exact-text, section-owned source
 * citations from the previously signed Evidence Ledger.
 *
 * GROWTH_OS_ENV_DIR=/Users/user/growth-os NODE_OPTIONS=--conditions=react-server
 * npx tsx scripts/content-existing-article-citation-draft.ts
 * --article=ID --original-sha256=EXACT_LOCAL_SAVED_EXPORT_SHA256
 */
import {loadEnvConfig} from "@next/env";
import {createHash} from "node:crypto";
import {mkdir,writeFile} from "node:fs/promises";
import {resolve,join} from "node:path";
loadEnvConfig(process.env.GROWTH_OS_ENV_DIR?.trim()||process.cwd());
const sha=(value:string)=>createHash("sha256").update(value,"utf8").digest("hex");
async function main(){
  const args=process.argv.slice(2);
  const articleId=args.find(a=>a.startsWith("--article="))?.slice(10);
  const expectedSha=args.find(a=>a.startsWith("--original-sha256="))
    ?.slice("--original-sha256=".length)?.toLowerCase();
  if(args.length!==2||!articleId||
    !/^[a-z0-9_-]{5,100}$/i.test(articleId)||
    !expectedSha||!/^[a-f0-9]{64}$/.test(expectedSha))
    throw new Error("USAGE: --article=ID --original-sha256=64_CHAR_SHA256");
  const {prisma}=await import("../src/lib/prisma");
  try{
    const original=await prisma.contentArticle.findUnique({
      where:{id:articleId},include:{brief:{include:{evidenceSnapshot:true}}},
    });
    if(!original||original.status!=="IN_REVIEW"||
      original.publishedAt||original.publishedUrl)
      throw new Error("EXISTING_ARTICLE_NOT_UNPUBLISHED_IN_REVIEW");
    const exactExport=original.bodyMarkdown.endsWith("\n")?
      original.bodyMarkdown:original.bodyMarkdown+"\n";
    if(sha(exactExport)!==expectedSha)
      throw new Error("EXISTING_ARTICLE_EXPORT_FINGERPRINT_CHANGED");
    const snapshot=original.brief.evidenceSnapshot?.plan;
    if(!snapshot)throw new Error("ARTICLE_SAVED_RESEARCH_MISSING");
    const {inspectMasterRuntimeSnapshot}=await import(
      "../src/lib/content/master-runtime-adapter");
    const {parsePersistedArticleExecutionPlanV1}=
      await import("../src/lib/content/article-execution-plan-binding-v1");
    const {assertStoredPublicationEvidenceV1}=
      await import("../src/lib/content/stored-publication-evidence-gate-v1");
    const {draftExistingArticleSignedCitationsV1}=await import(
      "../src/lib/content/existing-article-source-citation-repair-v1");
    const {buildSerpReplayArticleFingerprintV1}=await import(
      "../src/lib/content/serp-replay-fingerprint");
    assertStoredPublicationEvidenceV1(snapshot);
    const runtime=inspectMasterRuntimeSnapshot(snapshot).runtime;
    if(!runtime)throw new Error("SIGNED_MASTER_RUNTIME_INVALID");
    const plan=parsePersistedArticleExecutionPlanV1(
      (snapshot as Record<string,unknown>).articleExecutionPlan);
    if(plan.websiteId!==original.brief.websiteId)
      throw new Error("ARTICLE_PLAN_WEBSITE_MISMATCH");
    const result=draftExistingArticleSignedCitationsV1({
      bodyMarkdown:original.bodyMarkdown,plan,runtime});
    const {verifyExistingArticleCitationScopeV1}=await import(
      "../src/lib/content/existing-article-citation-authority-v1");
    const scope=verifyExistingArticleCitationScopeV1({
      candidateBodyMarkdown:result.proposedBodyMarkdown,plan,runtime,
    });
    if(scope.unapprovedLinks>0)
      throw new Error("PROPOSED_CITATIONS_OUTSIDE_SIGNED_H2_AUTHORITY");
    const beforeFingerprint=buildSerpReplayArticleFingerprintV1(original);
    const afterFingerprint=buildSerpReplayArticleFingerprintV1({
      title:original.title,metaDescription:original.metaDescription,
      h1:original.h1,bodyMarkdown:result.proposedBodyMarkdown,
    });
    const safeReport={
      mode:result.mode,articleId,
      oldArticleUpdatedAt:original.updatedAt.toISOString(),
      exactExportSha256:expectedSha,
      oldArticleFingerprint:beforeFingerprint,
      proposedArticleFingerprint:afterFingerprint,
      totalAddedCitations:result.totalAddedCitations,
      citationScope:scope,
      sections:result.sections.map(({proposedBody,...r})=>r),
      next:result.totalAddedCitations>0
        ?"SEMANTIC_CLAIM_LINK_VERIFICATION_PLUS_9_CRITICS_PLUS_FRESH_SERP_REPLAY_REQUIRED"
        :"EXACT_CLAIM_SENTENCES_NOT_FOUND_NEED_SCOPED_SEMANTIC_CITATION_REVIEW",
      commitAllowed:false,paidCalls:0,modelCalls:0,databaseUnchanged:true,
    };
    if(result.totalAddedCitations>0){
      const destination=resolve(".growth-os-tmp/citation-review");
      await mkdir(destination,{recursive:true});
      const candidate=join(destination,articleId+"-signed-citation-draft.md");
      const report=join(destination,articleId+"-signed-citation-draft.json");
      await writeFile(candidate,result.proposedBodyMarkdown+"\n","utf8");
      await writeFile(report,JSON.stringify(safeReport,null,2)+"\n","utf8");
      console.log(JSON.stringify({...safeReport,
        draftFile:candidate,reportFile:report},null,2));
    }else console.log(JSON.stringify(safeReport,null,2));
  }finally{await prisma.$disconnect();}
}
main().catch(error=>{
  console.error("CITATION_DRAFT_FAILED="+(
    error instanceof Error?error.message:String(error)));
  process.exitCode=1;
});
