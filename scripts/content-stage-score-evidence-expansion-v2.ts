/**
 * Existing score-impact section: source-verified evidence expansion V2.
 * No AI calls. No paid search. No DB writes. Does not modify article text.
 * Immutable V1 staging artifact and failed semantic verdict remain intact.
 */
import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
loadEnvConfig(process.env.GROWTH_OS_ENV_ROOT?.trim() || process.cwd());

function digest(x: string) { return createHash("sha256").update(x).digest("hex"); }
function assert(v: unknown, code: string): asserts v {
  if (!v) throw new Error(code);
}
function asRecord(x: unknown): Record<string, any> {
  assert(x && typeof x === "object" && !Array.isArray(x), "EXPECTED_OBJECT");
  return x as Record<string, any>;
}

const sources=[
  {key:"experian-monitoring",url:"https://www.experian.com/blogs/ask-experian/does-credit-monitoring-hurt-credit-score/",
    publisher:"Experian",sourceType:"REPUTABLE_SECONDARY",authorityTier:"C"},
  {key:"experian-inquiries",url:"https://www.experian.com/blogs/ask-experian/does-checking-your-credit-score-lower-it/",
    publisher:"Experian",sourceType:"REPUTABLE_SECONDARY",authorityTier:"C"},
  {key:"experian-alerts",url:"https://www.experian.com/blogs/ask-experian/what-can-credit-monitoring-do-for-me/",
    publisher:"Experian",sourceType:"REPUTABLE_SECONDARY",authorityTier:"C"},
  {key:"cfpb-report",url:"https://www.consumerfinance.gov/ask-cfpb/does-requesting-my-credit-report-hurt-my-credit-score-en-1229/",
    publisher:"Consumer Financial Protection Bureau",sourceType:"PRIMARY_GOVERNMENT",authorityTier:"A"},
] as const;

const requiredFacts=[
  {
    id:"claim-credit-monitoring-soft-inquiries-v2",key:"experian-monitoring",
    alternatives:[
      "Requests for credit scores or credit reports made by you, or by any monitoring service you authorize, are logged on credit reports as soft inquiries.",
    ],
  },
  {
    id:"claim-hard-inquiry-credit-application-v2",key:"experian-monitoring",
    alternatives:[
      "In contrast to a soft inquiry, a hard inquiry may appear when a lender checks your credit in connection with a loan or credit card application.",
    ],
  },
  {
    id:"claim-hard-inquiry-score-effect-v2",key:"experian-monitoring",
    alternatives:[
      "A hard inquiry may cause a small, temporary dip in your credit scores.",
    ],
  },
  {
    id:"claim-soft-inquiry-score-effect-v2",key:"experian-inquiries",
    alternatives:[
      "Soft inquiries don't affect your credit scores, but hard inquiries can.",
      "Soft inquiries don't affect your credit scores.",
    ],
  },
  {
    id:"claim-check-own-credit-report-v2",key:"cfpb-report",
    alternatives:[
      "Checking your own credit report is not an inquiry about new credit, so it has no effect on your score.",
    ],
  },
  {
    id:"claim-credit-monitoring-alerts-v2",key:"experian-alerts",
    alternatives:[
      "Credit monitoring can help you protect your credit and identity by alerting you to changes in your credit reports.",
    ],
  },
] as const;

async function main(){
  const [briefId,articleId]=process.argv.slice(2);
  assert(process.argv.slice(2).length===2 &&
    [briefId,articleId].every(x=>/^[a-zA-Z0-9_-]{1,100}$/.test(x??"")),"USAGE: BRIEF_ID ARTICLE_ID");
  const dir=resolve(process.env.GROWTH_OS_REVIEW_ARTIFACT_DIR?.trim() ||
    ".growth-os-tmp/final-article-closure");
  const base=join(dir,articleId);
  const [stageRaw,reviewRaw,md,manifestRaw]=await Promise.all([
    readFile(base+"-STAGED-EVIDENCE-REVISION.json","utf8"),
    readFile(base+"-EXACT-CANDIDATE-REVIEW.json","utf8"),
    readFile(base+"-REVIEW-CANDIDATE.md","utf8"),
    readFile(base+"-REVIEW-CANDIDATE.json","utf8"),
  ]);
  const v1=asRecord(JSON.parse(stageRaw));
  const review=asRecord(JSON.parse(reviewRaw));
  const manifest=asRecord(JSON.parse(manifestRaw));
  assert(v1.status==="NOT_PERSISTED_NOT_READY_FOR_REVIEW" &&
    v1.briefId===briefId && v1.articleId===articleId &&
    review.articleId===articleId && review.briefId===briefId &&
    review.candidateSha256===v1.candidateArticleSha256 &&
    manifest.sourceCheckpointSha256===v1.sourceCheckpointSha256,
    "ARTIFACT_VERSION_MISMATCH");
  assert(review.status==="REVIEW_FAILED" &&
    review.semanticVerification?.status==="BLOCK" &&
    review.semanticVerification?.counts?.unsupported>0,
    "SAVED_SEMANTIC_BLOCK_REQUIRED");
  assert(review.finalCritics===null && review.serpReplay===null,
    "PRIOR_REVIEW_ALREADY_HAS_DOWNSTREAM_RESULTS");
  const h1=/^# [^\r\n]+\r?\n(?:\r?\n)*/.exec(md);
  assert(h1,"CANDIDATE_H1_MISSING");
  const candidate={
    title:review.article.title,
    metaDescription:review.article.metaDescription,
    h1:review.article.h1,
    bodyMarkdown:md.slice(h1[0].length).trimEnd(),
  };
  assert(digest(JSON.stringify(candidate))===v1.candidateArticleSha256,
    "CANDIDATE_ARTICLE_CHANGED_SINCE_REVIEW");
  const {prisma}=await import("../src/lib/prisma");
  try {
    const [dbSnapshot,dbArticle]=await Promise.all([
      prisma.contentEvidenceSnapshot.findUnique({where:{briefId},select:{plan:true}}),
      prisma.contentArticle.findUnique({where:{id:articleId},select:{briefId:true,status:true}}),
    ]);
    assert(dbArticle?.briefId===briefId && dbArticle?.status==="REJECTED" &&
      dbSnapshot && digest(JSON.stringify(dbSnapshot.plan))===v1.originalPlanSha256,
      "PERSISTED_SOURCE_CHANGED");
    const {fetchSinglePage}=await import("../src/lib/crawler/crawler");
    const {findExactSourceSentenceV1}=await import("../src/lib/content/exact-source-sentence-v1");
    const {findVerifiedExcerptCandidateV1}=await import("../src/lib/content/live-evidence-verification");
    const {buildClaimLedger}=await import("../src/lib/content/claim-ledger");
    const {assertStoredPublicationEvidenceV1}=await import("../src/lib/content/stored-publication-evidence-gate-v1");
    const {inspectMasterRuntimeSnapshot}=await import("../src/lib/content/master-runtime-adapter");
    const {parsePersistedArticleExecutionPlanV1}=await import("../src/lib/content/article-execution-plan-binding-v1");
    const {assertArticlePreWriterEvidenceReadyV1,
      assertArticlePreWriterRequiredCoverageV1,
      assertArticlePreWriterAnswerSupportV2}=await import("../src/lib/content/article-prewriter-evidence-gate-v1");
    const {assertPreWriterMissionAuthorityV1}=await import("../src/lib/content/article-prewriter-mission-authority-gate-v1");

    const bodies=new Map<string,string>();
    const fetchReports:{source:string;status:string;chars:number}[]=[];
    for(const s of sources){
      const page=await fetchSinglePage(s.url,{
        timeoutMs:15000,maxResponseSize:2*1024*1024,
      });
      const body=page.parsed?.bodyText;
      if(page.error || page.statusCode<200 || page.statusCode>=300 || !body){
        fetchReports.push({source:s.key,status:"UNAVAILABLE",chars:0});
        continue;
      }
      bodies.set(s.key,body);
      fetchReports.push({source:s.key,status:"FETCHED",chars:body.length});
    }

    const verified: {id:string;key:string;quote:string}[]=[];
    const missing:string[]=[];
    for(const fact of requiredFacts){
      const body=bodies.get(fact.key);
      if(!body){missing.push(fact.id+":SOURCE_NOT_FETCHED");continue;}
      let quote:string|null=null;
      for(const candidate of fact.alternatives){
        const exact=findExactSourceSentenceV1({claimText:candidate,bodyText:body});
        if(exact && findVerifiedExcerptCandidateV1({
          claimText:exact,bodyText:exact,
        })){
          quote=exact;break;
        }
      }
      if(quote){verified.push({id:fact.id,key:fact.key,quote});}
      else{missing.push(fact.id+":EXACT_SOURCE_VERIFICATION_FAILED");}
    }

    // Without multiple independently verified facts, the current
    // 14 unsupported material statements cannot be authorized.
    assert(verified.length>=4 && verified.some(x=>x.id==="claim-credit-monitoring-soft-inquiries-v2") &&
      verified.some(x=>x.id==="claim-hard-inquiry-score-effect-v2") &&
      verified.some(x=>x.id==="claim-credit-monitoring-alerts-v2"),
      "NOT_ENOUGH_NEW_VERIFIED_CLAIMS:"+JSON.stringify({verified:verified.map(x=>x.id),missing,fetchReports}));

    const snapshot=asRecord(JSON.parse(JSON.stringify(v1.stagedSnapshot)));
    const runtime=asRecord(snapshot.masterRuntime);
    const graph=asRecord(runtime.evidenceGraph);
    const ledger=asRecord(runtime.claimLedger);
    const sections=runtime.sectionBlueprints.sections as any[];
    const execution=snapshot.articleExecutionPlan.sections as any[];
    const ownerIndex=3;
    assert(sections.length===5 && execution.length===5 &&
      sections[ownerIndex].heading==="Does Credit Monitoring Affect Your Credit Score?" &&
      execution[ownerIndex].heading===sections[ownerIndex].heading,
      "OWNED_SECTION_MISMATCH");
    const ownerBlueprint=sections[ownerIndex];
    const ownerPlan=execution[ownerIndex];
    const originId="claim-monitoring-score-direct-answer-v1";
    assert(ownerPlan.requiredClaimIds.includes(originId) &&
      ownerBlueprint.requiredClaims.includes(originId) &&
      ownerPlan.evidenceIds.includes(v1.verifiedEvidenceId),
      "V1_DIRECT_ANSWER_OWNER_INVALID");
    assert(verified.every(f=>!ledger.claims.some((x:any)=>x.id===f.id)) &&
      !graph.sources.some((x:any)=>String(x.id).startsWith("source-score-expansion-v2-")),
      "EXPANSION_ALREADY_APPLIED");
    const retrievedAt=new Date().toISOString();
    const sourceIds=new Map<string,string>();
    const addedEvidenceIds:string[]=[];
    for(const fact of verified){
      let sid=sourceIds.get(fact.key);
      if(!sid){
        sid="source-score-expansion-v2-"+fact.key;
        sourceIds.set(fact.key,sid);
        const meta=sources.find(x=>x.key===fact.key)!;
        graph.sources.push({
          id:sid,url:meta.url,publisher:meta.publisher,
          sourceType:meta.sourceType,authorityTier:meta.authorityTier,
          jurisdiction:"United States",retrievedAt,
        });
      }
      const eid="evidence-"+fact.id;
      assert(!graph.claimEvidence.some((x:any)=>x.id===eid),
        "EVIDENCE_ID_COLLISION:"+eid);
      graph.claimEvidence.push({
        id:eid,claimId:fact.id,sourceId:sid,
        relation:"SUPPORTS",kind:"VERIFIED_EXCERPT",excerpt:fact.quote,
      });
      addedEvidenceIds.push(eid);
    }
    const claimInput=ledger.claims.map((x:any)=>({
      id:x.id,text:x.text,category:x.category,risk:x.risk,
      ...(x.jurisdiction?{jurisdiction:x.jurisdiction}:{}),
    }));
    for(const fact of verified)claimInput.push({
      id:fact.id,text:fact.quote,category:"FACT",
      risk:"HIGH",jurisdiction:"United States",
    });
    const newLedger=buildClaimLedger({
      claims:claimInput,
      graph:graph as Parameters<typeof buildClaimLedger>[0]["graph"],
      asOf:new Date(),
    });
    for(const old of ledger.claims){
      const current=newLedger.claims.find(x=>x.id===old.id);
      assert(current?.status===old.status,"OLD_CLAIM_STATUS_CHANGED:"+old.id);
    }
    for(const fact of verified){
      const newClaim=newLedger.claims.find(x=>x.id===fact.id);
      assert(newClaim?.status==="VERIFIED" &&
        newClaim.evidenceIds.includes("evidence-"+fact.id),
        "NEW_CLAIM_NOT_VERIFIED_IN_LEDGER:"+fact.id);
    }
    runtime.claimLedger=newLedger;
    for(const fact of verified){
      ownerPlan.requiredClaimIds.push(fact.id);
      ownerBlueprint.requiredClaims.push(fact.id);
      const eid="evidence-"+fact.id;
      ownerPlan.evidenceIds.push(eid);
      ownerBlueprint.evidenceIds.push(eid);
      snapshot.articleExecutionPlan.verifiedEvidenceIds.push(eid);
    }
    for(const field of ["requiredClaimIds","evidenceIds"]){
      ownerPlan[field]=[...new Set(ownerPlan[field])];
    }
    for(const field of ["requiredClaims","evidenceIds"]){
      ownerBlueprint[field]=[...new Set(ownerBlueprint[field])];
    }
    snapshot.articleExecutionPlan.verifiedEvidenceIds=[
      ...new Set(snapshot.articleExecutionPlan.verifiedEvidenceIds)
    ];
    assertStoredPublicationEvidenceV1(snapshot);
    const inspected=inspectMasterRuntimeSnapshot(snapshot);
    assert(inspected.runtime,"EXPANDED_RUNTIME_INVALID:"+inspected.blockers.join("|"));
    const plan=parsePersistedArticleExecutionPlanV1(snapshot.articleExecutionPlan);
    assertArticlePreWriterEvidenceReadyV1(plan);
    assertArticlePreWriterRequiredCoverageV1(plan);
    assertArticlePreWriterAnswerSupportV2(plan);
    assertPreWriterMissionAuthorityV1({
      sections:plan.sections,blueprints:inspected.runtime.sectionBlueprints.sections,
    });

    const output=base+"-STAGED-EVIDENCE-EXPANSION-V2.json";
    const artifact={
      version:"STAGED_SCORE_EVIDENCE_EXPANSION_V2",
      status:"NOT_PERSISTED_NOT_READY_FOR_REVIEW",
      articleId,briefId,
      originalPlanSha256:v1.originalPlanSha256,
      sourceCheckpointSha256:v1.sourceCheckpointSha256,
      candidateArticleSha256:v1.candidateArticleSha256,
      priorStageSha256:digest(stageRaw),
      priorReviewSha256:digest(reviewRaw),
      sourceReports:fetchReports,
      verified:verified.map(({id,key,quote})=>({
        id,sourceKey:key,sourceUrl:sources.find(s=>s.key===key)!.url,quote,
      })),
      unverified:missing,
      missingFactCount:review.semanticVerification.counts.unsupported,
      sourceEvidenceGate:"PASS",
      preWriterGate:"PASS",
      stagedSnapshot:snapshot,
    };
    await writeFile(output,JSON.stringify(artifact,null,2)+"\n",{
      flag:"wx",mode:0o600,
    });
    console.log(JSON.stringify({
      result:"STAGED_SCORE_EVIDENCE_EXPANSION_VALID",
      output,verifiedClaims:verified.map(x=>x.id),unverifiedCandidates:missing,
      sourceReports:fetchReports,preWriterGate:"PASS",
      publicationEvidenceGate:"PASS",priorUnsupportedUnits:artifact.missingFactCount,
      candidateBodyUnchanged:true,existingDatabaseUnchanged:true,
      previousReviewPreserved:true,aiCalls:0,paidSearchCalls:0,
      next:"Use new factual authority for ONE localized section correction and rerun verifier",
    },null,2));
  }finally{await prisma.$disconnect();}
}
main().catch(e=>{
  console.error("SCORE_EVIDENCE_EXPANSION_FAILED:",e instanceof Error?e.message:String(e));
  process.exitCode=1;
});
