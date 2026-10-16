/**
 * One-section factual recovery, V3. No Writer, AI, paid search or DB writes.
 *
 * Requires the saved V2 live-verified evidence and preserves the original
 * checkpoint, old failed review, and the other four article sections exactly.
 * Creates a NEW candidate and manifest using exclusive file creation.
 *
 * npx tsx scripts/content-stage-supported-score-section-v3.ts BRIEF_ID ARTICLE_ID
 */
import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

loadEnvConfig(process.env.GROWTH_OS_ENV_ROOT?.trim() || process.cwd());
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
function assert(x: unknown, message: string): asserts x {
  if (!x) throw new Error(message);
}
function object(x: unknown): Record<string, any> {
  assert(x && typeof x === "object" && !Array.isArray(x), "REQUIRED_RECORD");
  return x as Record<string, any>;
}
const required = [
  "claim-credit-monitoring-soft-inquiries-v2",
  "claim-hard-inquiry-credit-application-v2",
  "claim-hard-inquiry-score-effect-v2",
  "claim-soft-inquiry-score-effect-v2",
  "claim-check-own-credit-report-v2",
  "claim-credit-monitoring-alerts-v2",
] as const;

async function main(): Promise<void> {
  const [briefId,articleId]=process.argv.slice(2);
  assert(process.argv.slice(2).length===2 &&
    [briefId,articleId].every(id=>/^[a-zA-Z0-9_-]{1,100}$/.test(id??"")),
    "USAGE: BRIEF_ID ARTICLE_ID");
  const dir=resolve(process.env.GROWTH_OS_REVIEW_ARTIFACT_DIR?.trim() ||
    ".growth-os-tmp/final-article-closure");
  const root=join(dir,articleId);
  const checkpointDir=resolve(process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR ||
    ".growth-os-tmp/article-checkpoints");
  const [v2Raw,v1Raw,failedRaw,originalMd,oldManifestRaw,checkpointRaw]=await Promise.all([
    readFile(root+"-STAGED-EVIDENCE-EXPANSION-V2.json","utf8"),
    readFile(root+"-STAGED-EVIDENCE-REVISION.json","utf8"),
    readFile(root+"-EXACT-CANDIDATE-REVIEW.json","utf8"),
    readFile(root+"-REVIEW-CANDIDATE.md","utf8"),
    readFile(root+"-REVIEW-CANDIDATE.json","utf8"),
    readFile(join(checkpointDir,articleId+"-POST_WRITER.json"),"utf8"),
  ]);
  const v2=object(JSON.parse(v2Raw)),v1=object(JSON.parse(v1Raw));
  const failed=object(JSON.parse(failedRaw));
  const manifest=object(JSON.parse(oldManifestRaw));
  const saved=object(JSON.parse(checkpointRaw)), cp=object(saved.checkpoint);
  assert(saved.sha256===sha(JSON.stringify(cp)) &&
    v2.status==="NOT_PERSISTED_NOT_READY_FOR_REVIEW" &&
    v2.version==="STAGED_SCORE_EVIDENCE_EXPANSION_V2" &&
    v2.articleId===articleId && v2.briefId===briefId &&
    v1.articleId===articleId && v1.briefId===briefId &&
    cp.articleId===articleId && cp.briefId===briefId &&
    v1.sourceCheckpointSha256===saved.sha256 &&
    v2.sourceCheckpointSha256===saved.sha256 &&
    v2.priorStageSha256===sha(v1Raw) &&
    v2.priorReviewSha256===sha(failedRaw) &&
    manifest.sourceCheckpointSha256===saved.sha256 &&
    JSON.stringify(manifest.changedSectionIndexes)==="[3]",
    "SOURCE_PROVENANCE_CHAIN_INVALID");
  assert(failed.status==="REVIEW_FAILED" &&
    failed.semanticVerification?.status==="BLOCK" &&
    failed.finalCritics===null && failed.serpReplay===null &&
    failed.candidateSha256===v2.candidateArticleSha256 &&
    v1.candidateArticleSha256===v2.candidateArticleSha256,
    "PREVIOUS_FAILED_REVIEW_MISMATCH");
  assert(v2.sourceEvidenceGate==="PASS" &&
    v2.preWriterGate==="PASS" && v2.unverified?.length===0,
    "EXPANDED_EVIDENCE_NOT_APPROVED");
  const verified=Array.isArray(v2.verified)?v2.verified:[];
  assert(verified.length===required.length &&
    required.every(id=>verified.some((f:any)=>f.id===id &&
      typeof f.quote==="string" && f.quote.length>=40 &&
      /^https:\/\//.test(f.sourceUrl??""))),
    "REQUIRED_VERIFIED_CLAIMS_NOT_PRESENT");

  const source=(id:string)=>{
    const row=verified.find((f:any)=>f.id===id);
    assert(row,"CLAIM_NOT_VERIFIED:"+id);
    return row as {id:string;quote:string;sourceUrl:string};
  };
  const e=source("claim-credit-monitoring-soft-inquiries-v2");
  const h=source("claim-hard-inquiry-credit-application-v2");
  const impact=source("claim-hard-inquiry-score-effect-v2");
  const soft=source("claim-soft-inquiry-score-effect-v2");
  const check=source("claim-check-own-credit-report-v2");
  const alerts=source("claim-credit-monitoring-alerts-v2");
  const sourceLink=(f:{sourceUrl:string},label:string)=>
    "["+label+"]("+f.sourceUrl+")";

  const sections=cp.writerRun.sections as Array<{heading:string;bodyMarkdown:string}>;
  assert(Array.isArray(sections) && sections.length===5 &&
    sections[3].heading==="Does Credit Monitoring Affect Your Credit Score?",
    "LOCKED_SECTION_IDENTITY_FAILED");
  const headingMatch=/^# ([^\r\n]+)\r?\n(?:\r?\n)*/.exec(originalMd);
  assert(headingMatch && headingMatch[1].trim()===cp.writerRun.shell.h1.trim(),
    "CANDIDATE_H1_MISMATCH");
  const originalBody=originalMd.slice(headingMatch[0].length).trimEnd();
  const originalArticle={
    title:cp.writerRun.shell.title,
    metaDescription:cp.writerRun.shell.metaDescription,
    h1:cp.writerRun.shell.h1,
    bodyMarkdown:originalBody,
  };
  assert(sha(JSON.stringify(originalArticle))===v2.candidateArticleSha256,
    "OLD_CANDIDATE_CHANGED");
  const startMarker="## "+sections[3].heading+"\n\n";
  const endMarker="\n\n## "+sections[4].heading+"\n\n";
  const start=originalBody.indexOf(startMarker),end=originalBody.indexOf(endMarker,start+startMarker.length);
  assert(start>=0 && end>start &&
    originalBody.indexOf(startMarker,start+1)===-1 &&
    originalBody.indexOf(endMarker,end+1)===-1,
    "SCORE_SECTION_BOUNDARIES_INVALID");
  for(const index of [0,1,2,4]){
    const marker="## "+sections[index].heading+"\n\n"+sections[index].bodyMarkdown;
    assert(originalBody.includes(marker),"UNCHANGED_SECTION_NOT_FOUND:"+index);
  }

  const scoreHeading=sections[3].heading;
  // All material statements below are restricted to the seven source-verified
  // propositions; remaining instructions are reader guidance, not new facts.
  const replacement=[
    "## "+scoreHeading,
    "",
    "**No. Credit monitoring itself does not lower your credit score.** Experian states that credit monitoring has no impact on credit scores. ("+
      "[Experian](https://www.experian.com/blogs/ask-experian/does-credit-monitoring-hurt-credit-score/))",
    "",
    "### Soft inquiries versus hard inquiries",
    "",
    "When you request your credit report or an authorized monitoring service requests it for you, Experian describes that request as a *soft inquiry*. "+sourceLink(e,"Experian")+
      " explains that these requests are recorded as soft inquiries.",
    "",
    "Soft inquiries do not affect credit scores. Hard inquiries can affect scores; "+
      sourceLink(soft,"Experian")+" explains the distinction. A hard inquiry may appear when a lender checks credit in connection with a loan or credit card application ("+
      sourceLink(h,"Experian")+"). Experian also says a hard inquiry can cause a small, temporary dip in a credit score ("+
      sourceLink(impact,"Experian")+").",
    "",
    "Checking your own credit report is not an application for new credit. The Consumer Financial Protection Bureau confirms that this kind of check does not affect your score ("+
      sourceLink(check,"CFPB")+").",
    "",
    "### What to check when an alert arrives",
    "",
    "Experian describes credit monitoring as a way to help protect credit and identity by alerting people to changes in their credit reports ("+
      sourceLink(alerts,"Experian")+").",
    "",
    "When an alert arrives, use it as a starting point for reviewing the reported item. Read the date and description, then look at the related entry in your credit report. For an inquiry, ask whether you recognize the lender or remember an application associated with it. If an item is unfamiliar, use the credit reporting agency's official help or dispute instructions to ask for clarification.",
    "",
    "Keep the two activities distinct: checking your own report or receiving monitoring alerts is not the same as a lender making a hard inquiry connected to a credit application. An alert is a reason to review the information rather than assume the notification itself changed your score.",
    "",
    "These examples concern U.S. consumer credit reports.",
  ].join("\n");
  assert(replacement.includes("### Soft inquiries versus hard inquiries") &&
    replacement.includes("### What to check when an alert arrives") &&
    !/^# /m.test(replacement) && !replacement.includes("\n## "),
    "REPLACEMENT_HEADING_STRUCTURE_INVALID");
  const newBody=originalBody.slice(0,start)+replacement+originalBody.slice(end);
  assert(newBody.slice(0,start)===originalBody.slice(0,start) &&
    newBody.slice(start+replacement.length)===originalBody.slice(end) &&
    newBody!==originalBody,
    "UNTOUCHED_ARTICLE_SPANS_MODIFIED");
  const candidate={
    ...originalArticle,
    bodyMarkdown:newBody,
  };
  const candidateMd=originalMd.slice(0,headingMatch[0].length)+newBody+"\n";
  const stage=object(v2.stagedSnapshot);
  const plan=stage.articleExecutionPlan;
  const runtime=stage.masterRuntime;
  const owner=plan.sections[3],blueprint=runtime.sectionBlueprints.sections[3];
  const originalClaim="claim-monitoring-score-direct-answer-v1";
  const requiredClaims=[originalClaim,...required];
  assert(requiredClaims.every(id=>owner.requiredClaimIds.includes(id) &&
    blueprint.requiredClaims.includes(id) &&
    runtime.claimLedger.claims.some((x:any)=>x.id===id && x.status==="VERIFIED")) &&
    required.every(id=>owner.evidenceIds.includes("evidence-"+id) &&
      blueprint.evidenceIds.includes("evidence-"+id)),
    "SEVEN_CLAIMS_NOT_BOUND_TO_TARGET_SECTION");

  // The original saved article and its snapshot are untouched; verify that
  // local database still matches the initial staging version.
  const {prisma}=await import("../src/lib/prisma");
  try{
    const [db,article,brief]=await Promise.all([
      prisma.contentEvidenceSnapshot.findUnique({
        where:{briefId},select:{plan:true},
      }),
      prisma.contentArticle.findUnique({
        where:{id:articleId},select:{briefId:true,status:true},
      }),
      prisma.contentBrief.findUnique({
        where:{id:briefId},select:{primaryKeyword:true,secondaryKeywords:true,websiteId:true},
      }),
    ]);
    assert(db && article?.status==="REJECTED" && article.briefId===briefId &&
      brief && sha(JSON.stringify(db.plan))===v2.originalPlanSha256,
      "DATABASE_CHANGED_SINCE_APPROVED_EVIDENCE");
    const {auditArticle}=await import("../src/lib/content/content-quality");
    const {evaluateContentGate}=await import("../src/lib/content/content-gate");
    const {analyzeArticleAgainstPlan}=await import("../src/lib/content/content-plan-analysis");
    const {evaluateArticlePublicationPolicy}=await import("../src/lib/content/article-publication-policy");
    const {getBusinessFactRegistryForBrief}=await import("../src/lib/content/evidence-snapshot");
    const {assertStoredPublicationEvidenceV1}=await import("../src/lib/content/stored-publication-evidence-gate-v1");
    assertStoredPublicationEvidenceV1(stage);
    const audit=auditArticle({article:candidate,primaryKeyword:brief.primaryKeyword});
    const registry=await getBusinessFactRegistryForBrief({briefId,websiteId:brief.websiteId});
    const gate=evaluateContentGate({article:candidate,primaryKeyword:brief.primaryKeyword,audit,registry});
    const intel=analyzeArticleAgainstPlan({
      ...candidate,primaryKeyword:brief.primaryKeyword,
      secondaryKeywords:brief.secondaryKeywords,plan:stage,
    });
    const policy=evaluateArticlePublicationPolicy({article:candidate,intelligence:intel});
    assert(gate.pass && policy.pass,
      "REVISED_CONTENT_GATE_BLOCKED:"+JSON.stringify({issues:gate.blockingIssues,policy:policy.blockingIssues}));

    const outBase=root+"-SUPPORTED-CANDIDATE-V3";
    const proof={
      version:"SUPPORTED_SCORE_CANDIDATE_V3",
      status:"NOT_PERSISTED_NOT_SEMANTICALLY_APPROVED",
      articleId,briefId,
      candidateArticleSha256:sha(JSON.stringify(candidate)),
      initialCandidateSha256:v2.candidateArticleSha256,
      checkpointSha256:saved.sha256,
      sourceCheckpointSha256:saved.sha256,
      changedSectionIndexes:[3],
      originalPlanSha256:v2.originalPlanSha256,
      evidenceExpansionSha256:sha(v2Raw),
      scoreSectionIndex:3,
      scoreSectionBodySha256:sha(replacement.slice(startMarker.length)),
      articleTitle:candidate.title,
      originalSectionHashes:sections.map(s=>sha(s.bodyMarkdown)),
      auditScore:audit.score,
      wordCount:audit.wordCount,
      contentGate:"PASS",
      publicationPolicy:"PASS",
      liveVerifiedClaimIds:requiredClaims,
      sourceUrls:[...new Set(verified.map((f:any)=>f.sourceUrl))],
      noDbMutation:true,
    };
    await writeFile(outBase+".json",JSON.stringify(proof,null,2)+"\n",{
      flag:"wx",mode:0o600,
    });
    await writeFile(outBase+".md",candidateMd,{flag:"wx",mode:0o600});
    console.log(JSON.stringify({
      result:"SUPPORTED_CANDIDATE_V3_STAGED",
      articleId,briefId,
      files:[outBase+".json",outBase+".md"],
      scoreSectionIndex:3,
      verifiedClaims:requiredClaims.length,
      originalSectionsPreserved:4,
      qualityAudit:audit.score,
      bodyWordCount:audit.wordCount,
      contentGate:"PASS",publicationPolicy:"PASS",
      next:"Run bounded exact-candidate semantic review for V3. Not IN_REVIEW.",
      databaseUnchanged:true,aiCalls:0,paidSearchCalls:0,
    },null,2));
  }finally{await prisma.$disconnect();}
}
main().catch(e=>{
  console.error("SUPPORTED_SCORE_CANDIDATE_V3_FAILED:",
    e instanceof Error?e.message:String(e));
  process.exitCode=1;
});
