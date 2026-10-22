/**
 * Editorial V2 — verified FTC evidence, STAGED ONLY.
 *
 * Reads the real saved article and exact original source snapshot; fetches
 * only three reviewed FTC sources; stages an append-only revision of:
 * EvidenceGraph / ClaimLedger / SectionBlueprints / ArticleExecutionPlan.
 *
 * NO model, paid search, Writer regeneration, PostgreSQL writes,
 * Query Owner approval, SERP Replay, CMS calls or publication.
 *
 * NODE_OPTIONS=--conditions=react-server npx tsx scripts/content-v2-stage-evidence.ts
 */
import {loadEnvConfig} from "@next/env";
import {createHash} from "node:crypto";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {join,resolve} from "node:path";
loadEnvConfig(process.env.GROWTH_OS_ENV_DIR?.trim()||process.cwd());

type Row={claimKey:string;h2Indexes:number[];candidateExcerpt:string;
  sourceUrl:string;sourceExactFragments:string[];semanticReview:string};
type NavRow={url:string;h2Indexes:number[];trustedVia:string;role:string;supportingClaimKey:string};
type Proof={mode:string;candidateSha256:string;sourceLinkScope:string;
  fetchAndExactExcerptCheck:string;fetchedSources:Record<string,{
    fetched:boolean;httpStatus:number|null;
    excerpts:Array<{snippet:string;present:boolean}>;
    navigationAuthorityAnchors:Array<{url:string;present:boolean}>}>;
};
const sha=(value:string)=>createHash("sha256").update(value,"utf8").digest("hex");
const unique=(items:string[])=>[...new Set(items)];
const norm=(value:string)=>value.normalize("NFKC").replace(/[’‘]/g,"'")
  .replace(/\s+/gu," ").trim().toLowerCase();

function sourceSentence(body:string,fragment:string):string {
  const clean=body.replace(/\s+/gu," ").trim();
  const at=norm(clean).indexOf(norm(fragment));
  if(at<0)throw Error("REVIEWED_FRAGMENT_NOT_FOUND_IN_FTC_BODY");
  // Extract the *actual* source sentence; no paraphrase or assembled quote.
  const before=clean.slice(Math.max(0,at-650),at);
  const boundaryBefore=Math.max(before.lastIndexOf(". "),before.lastIndexOf("? "),
    before.lastIndexOf("! "));
  const from=at-(boundaryBefore<0?before.length:before.length-boundaryBefore-2);
  const after=clean.slice(at+fragment.length,Math.min(clean.length,at+fragment.length+550));
  const next=after.search(/[.!?](?=\s|$)/u);
  const to=next<0?at+fragment.length+Math.min(after.length,250)
    :at+fragment.length+next+1;
  const sentence=clean.slice(from,to).trim();
  if(sentence.length<40 || sentence.length>950 ||
     !norm(sentence).includes(norm(fragment)))
    throw Error("EXACT_FTC_SENTENCE_WINDOW_INVALID");
  return sentence;
}
async function main():Promise<void>{
  if(process.argv.length!==2)throw Error("USAGE: content-v2-stage-evidence.ts");
  const root=resolve("review-artifacts/editorial-v2-20261019");
  const base=resolve(".growth-os-tmp/v2-review");
  const [markdown,reviewText,proofText]=await Promise.all([
    readFile(join(root,"candidate.md"),"utf8"),
    readFile(join(root,"fact-to-source-review.json"),"utf8"),
    readFile(join(base,"official-source-preflight.json"),"utf8"),
  ]);
  const review=JSON.parse(reviewText) as {
    articleId:string;articleSha256:string;mappings:Row[];navigation:NavRow[];
    verdict:string;
  };
  const proof=JSON.parse(proofText) as Proof;
  const candidateSha=sha(markdown);
  if(candidateSha!==review.articleSha256 || candidateSha!==proof.candidateSha256 ||
    review.articleId!=="cmv606xg60006siqlir66uq23" ||
    review.verdict!=="FACTUAL_SUPPORT_PRESENT_NOT_SIGNED" ||
    proof.mode!=="FREE_OFFICIAL_SOURCE_FETCH_AND_SCOPE" ||
    proof.sourceLinkScope!=="PASS" ||
    proof.fetchAndExactExcerptCheck!=="PASS_WEB_SOURCE_TEXT_ONLY")
    throw Error("V2_REVIEW_OR_SOURCE_PROOF_MISMATCH");
  if(review.mappings.length!==5 || review.navigation.length!==2)
    throw Error("FACT_MAP_CHANGED_REVIEW_REQUIRED");

  const {prisma}=await import("../src/lib/prisma");
  try {
    const article=await prisma.contentArticle.findUnique({
      where:{id:review.articleId},
      include:{brief:{include:{evidenceSnapshot:true}}},
    });
    if(!article || article.status!=="IN_REVIEW" || article.publishedAt)
      throw Error("ORIGINAL_ARTICLE_NOT_REVIEWABLE");
    const saved={title:article.title,metaDescription:article.metaDescription,
      h1:article.h1,bodyMarkdown:article.bodyMarkdown};
    const {buildSerpReplayArticleFingerprintV1}=await import(
      "../src/lib/content/serp-replay-fingerprint");
    const originalFingerprint=buildSerpReplayArticleFingerprintV1(saved);
    if(originalFingerprint!=="99cff865207e98f8020326786ea93d6bb744a1a63a0c51914160751f460057e8")
      throw Error("ORIGINAL_ARTICLE_FINGERPRINT_DRIFT");
    const h1=/^# ([^\r\n]+)\r?\n\r?\n/u.exec(markdown);
    if(!h1 || h1[1]!.trim()!==article.h1)
      throw Error("V2_SAVED_H1_DRIFT");
    const candidateBody=markdown.slice(h1[0].length).trimEnd();
    const originalSections=[...article.bodyMarkdown.matchAll(/^## (.+)$/gm)].map(m=>m[1]!.trim());
    const editedSections=[...candidateBody.matchAll(/^## (.+)$/gm)].map(m=>m[1]!.trim());
    if(originalSections.length!==6 ||
      originalSections.some((name,i)=>name!==editedSections[i]))
      throw Error("V2_CANONICAL_H2_DRIFT");

    const oldSnapshot=article.brief.evidenceSnapshot?.plan;
    if(!oldSnapshot || typeof oldSnapshot!=="object" || Array.isArray(oldSnapshot))
      throw Error("PERSISTED_EVIDENCE_SNAPSHOT_MISSING");
    const originalSnapshotSha=sha(JSON.stringify(oldSnapshot));
    const staged=JSON.parse(JSON.stringify(oldSnapshot)) as Record<string,any>;
    const runtime=staged.masterRuntime as Record<string,any>;
    const plan=staged.articleExecutionPlan as Record<string,any>;
    if(!runtime?.evidenceGraph?.sources || !runtime?.claimLedger?.claims ||
      !runtime?.sectionBlueprints?.sections || !plan?.sections)
      throw Error("PERSISTED_MASTER_RUNTIME_INVALID");
    const {parsePersistedArticleExecutionPlanV1}=await import(
      "../src/lib/content/article-execution-plan-binding-v1");
    const originalPlan=parsePersistedArticleExecutionPlanV1(plan);
    const writable=originalPlan.sections.filter(s=>s.state==="WRITABLE");
    if(writable.length!==6)throw Error("H2_AUTHORITY_COUNT_MISMATCH");
    const blueprint=runtime.sectionBlueprints.sections as Array<Record<string,any>>;
    const planSections=plan.sections as Array<Record<string,any>>;
    if(blueprint.length!==6 || planSections.length!==6 ||
      writable.some((section,i)=>section.heading!==blueprint[i]?.heading ||
        section.heading!==planSections[i]?.heading))
      throw Error("SECTION_BLUEPRINT_AND_EXECUTION_PLAN_OUT_OF_SYNC");

    // A fresh source fetch is mandatory before generating a new evidence record.
    // The existing proof JSON alone contains only true/false, not raw source bytes.
    const {fetchSinglePage}=await import("../src/lib/crawler/crawler");
    const {findVerifiedExcerptCandidateV1}=await import(
      "../src/lib/content/live-evidence-verification");
    const {buildClaimLedger}=await import("../src/lib/content/claim-ledger");
    const {assertStoredPublicationEvidenceV1}=await import(
      "../src/lib/content/stored-publication-evidence-gate-v1");
    const {inspectMasterRuntimeSnapshot}=await import(
      "../src/lib/content/master-runtime-adapter");
    const {verifyExistingArticleCitationScopeV1}=await import(
      "../src/lib/content/existing-article-citation-authority-v1");
    const verifiedBodies=new Map<string,string>();
    for(const url of unique(review.mappings.map(m=>m.sourceUrl))){
      if(new URL(url).hostname!=="consumer.ftc.gov" || !proof.fetchedSources[url]?.fetched)
        throw Error("UNREVIEWED_GOVERNMENT_URL:" + url);
      const page=await fetchSinglePage(url,{timeoutMs:15000,maxResponseSize:2*1024*1024});
      if(page.error || page.statusCode!==200 || !page.parsed?.bodyText)
        throw Error("OFFICIAL_SOURCE_FETCH_FAILED:"+url);
      verifiedBodies.set(url,page.parsed.bodyText);
    }
    const retrievedAt=new Date().toISOString();
    const captured:Array<{claimKey:string;ownerH2:number[];sourceUrl:string;
      sourceId:string;claimId:string;evidenceId:string;claimIds:string[];
      evidenceIds:string[];articleExcerpt:string;exactSourceText:string;
      exactSourceTexts:string[];semanticModelApproved:false}>=[];
    const newClaims:Array<{id:string;text:string;category:"FACT";risk:"MEDIUM";
      jurisdiction:string}>=[];
    const stagedSources=new Map<string,Record<string,any>>();
    const oldClaims=runtime.claimLedger.claims as Array<Record<string,any>>;
    const existingIds=new Set(oldClaims.map(c=>String(c.id)));
    const evidenceIds=new Set((runtime.evidenceGraph.claimEvidence as Array<any>).map(e=>String(e.id)));
    for(const row of review.mappings){
      if(row.semanticReview!=="SUPPORTED" || !row.h2Indexes.length ||
        row.sourceExactFragments.length<1 ||
        row.h2Indexes.some(i=>!Number.isInteger(i)||i<0||i>=6))
        throw Error("INVALID_HUMAN_REVIEW_MAPPING:"+row.claimKey);
      const sourceBody=verifiedBodies.get(row.sourceUrl);
      if(!sourceBody)throw Error("NO_FETCHED_SOURCE_FOR_CLAIM:"+row.claimKey);
      const fragments=unique(row.sourceExactFragments);
      if(fragments.length!==row.sourceExactFragments.length)
        throw Error("DUPLICATE_SOURCE_FRAGMENT:"+row.claimKey);
      const quotes=fragments.map(fragment=>{
        if(!norm(sourceBody).includes(norm(fragment)))
          throw Error("FTC_REQUIRED_FRAGMENT_MISSING:"+row.claimKey);
        return sourceSentence(sourceBody,fragment);
      });
      // Each source sentence is its own exact VERIFIED_EXCERPT. A candidate
      // claim may depend on multiple source facts; never silently store only
      // the first one. These quotes are NOT yet semantic approval of prose.
      for(const quote of quotes){
        if(!findVerifiedExcerptCandidateV1({claimText:quote,bodyText:quote}))
          throw Error("FTC_EXCERPT_LEXICAL_VERIFICATION_FAILED:"+row.claimKey);
      }
      const sources=runtime.evidenceGraph.sources as Array<Record<string,any>>;
      // Historical ledger entries for a URL may be REFERENCE_ONLY,
      // incorrectly classified, or have old fetch metadata. Preserve every
      // historical source unchanged; this fresh fetch gets its own identity.
      let source=stagedSources.get(row.sourceUrl);
      if(!source){
        const sourceId="source-v2-official-"+sha(row.sourceUrl).slice(0,18);
        if(sources.some(s=>s.id===sourceId))
          throw Error("STAGED_SOURCE_ID_COLLISION:"+sourceId);
        source={id:sourceId,url:row.sourceUrl,
          publisher:"Federal Trade Commission",sourceType:"PRIMARY_GOVERNMENT",
          authorityTier:"A",jurisdiction:"United States",retrievedAt};
        sources.push(source);
        stagedSources.set(row.sourceUrl,source);
      }
      const rowClaimIds:string[]=[],rowEvidenceIds:string[]=[];
      for(let quoteIndex=0;quoteIndex<quotes.length;quoteIndex++){
        const quote=quotes[quoteIndex]!;
        const hash=sha(row.claimKey+"|"+row.sourceUrl+"|"+fragments[quoteIndex]).slice(0,18);
        const claimId="claim-v2-official-"+hash;
        const evidenceId="evidence-v2-official-"+hash;
        if(existingIds.has(claimId)||evidenceIds.has(evidenceId))
          throw Error("EVIDENCE_ID_COLLISION:"+row.claimKey);
        newClaims.push({id:claimId,text:quote,category:"FACT",risk:"MEDIUM",
          jurisdiction:"United States"});
        (runtime.evidenceGraph.claimEvidence as Array<any>).push({
          id:evidenceId,claimId,sourceId:source.id,relation:"SUPPORTS",
          kind:"VERIFIED_EXCERPT",excerpt:quote});
        for(const i of unique(row.h2Indexes.map(String)).map(Number)){
          planSections[i]!.requiredClaimIds=unique([...planSections[i]!.requiredClaimIds,claimId]);
          planSections[i]!.evidenceIds=unique([...planSections[i]!.evidenceIds,evidenceId]);
          blueprint[i]!.requiredClaims=unique([...blueprint[i]!.requiredClaims,claimId]);
          blueprint[i]!.evidenceIds=unique([...blueprint[i]!.evidenceIds,evidenceId]);
        }
        plan.verifiedEvidenceIds=unique([...plan.verifiedEvidenceIds,evidenceId]);
        existingIds.add(claimId);evidenceIds.add(evidenceId);
        rowClaimIds.push(claimId);rowEvidenceIds.push(evidenceId);
      }
      captured.push({claimKey:row.claimKey,ownerH2:row.h2Indexes,sourceUrl:row.sourceUrl,
        sourceId:source.id,claimId:rowClaimIds[0]!,evidenceId:rowEvidenceIds[0]!,
        claimIds:rowClaimIds,evidenceIds:rowEvidenceIds,
        articleExcerpt:row.candidateExcerpt,exactSourceText:quotes[0]!,
        exactSourceTexts:quotes,semanticModelApproved:false});
    }

    // Navigation remains unapproved, but its FTC authority must be proved
    // in the SAME H2 before we even propose a release role.
    for(const nav of review.navigation){
      const ownerSource=proof.fetchedSources[nav.trustedVia];
      const trustedOnPage=ownerSource?.navigationAuthorityAnchors.some(
        x=>x.url===nav.url&&x.present);
      const sectionEvidence=nav.h2Indexes.every(index=>captured.some(fact=>
        fact.claimKey===nav.supportingClaimKey&&fact.sourceUrl===nav.trustedVia&&
        fact.ownerH2.includes(index)));
      if(nav.role!=="OFFICIAL_ACTION_DESTINATION_NOT_VERIFIED_EXCERPT" ||
        !trustedOnPage || !sectionEvidence)
        throw Error("UNVERIFIED_NAVIGATION_AUTHORITY:"+nav.url);
    }

    // Rebuild the ledger through the ORIGINAL research policy, do not
    // fabricate VERIFIED statuses or relax publisher evidence thresholds.
    const rebuilt=buildClaimLedger({
      claims:[
        ...oldClaims.map(c=>({id:c.id,text:c.text,category:c.category,
          risk:c.risk,...(c.jurisdiction?{jurisdiction:c.jurisdiction}:{})})),
        ...newClaims,
      ],graph:runtime.evidenceGraph,asOf:new Date(),
    });
    for(const old of oldClaims){
      const now=rebuilt.claims.find(c=>c.id===old.id);
      if(!now || now.status!==old.status)
        throw Error("ORIGINAL_CLAIM_STATUS_CHANGED:"+old.id);
    }
    for(const fresh of newClaims){
      const entry=rebuilt.claims.find(c=>c.id===fresh.id);
      if(entry?.status!=="VERIFIED")
        throw Error("NEW_FTC_CLAIM_UNVERIFIED:"+fresh.id+
          ":STATUS="+(entry?.status??"MISSING")+
          ":SOURCE_TYPE="+runtime.evidenceGraph.sources.find(
            (src:Record<string,any>)=>
              runtime.evidenceGraph.claimEvidence.some(
                (e:Record<string,any>)=>e.claimId===fresh.id&&
                  e.sourceId===src.id))?.sourceType);
    }
    runtime.claimLedger=rebuilt;

    assertStoredPublicationEvidenceV1(staged);
    const inspection=inspectMasterRuntimeSnapshot(staged);
    if(!inspection.runtime)
      throw Error("STAGED_MASTER_RUNTIME_REJECTED:"+inspection.blockers.join(","));
    const validatedPlan=parsePersistedArticleExecutionPlanV1(plan);
    const scope=verifyExistingArticleCitationScopeV1({
      candidateBodyMarkdown:candidateBody,plan:validatedPlan,runtime:inspection.runtime,
    });
    // All three FTC URLs must now be H2-owned; the ONLY remaining unmatched
    // links can be reviewed official action/navigation URLs. Don't hide new
    // URLs in the wrong section.
    const unresolved=scope.sections.flatMap(s=>s.rejectedLinks.map(url=>({
      url,sectionIndex:s.sectionIndex,
    })));
    const allowedNav=new Set(review.navigation.flatMap(n=>n.h2Indexes.map(i=>
      i+"|"+n.url)));
    const unexpected=unresolved.filter(r=>!allowedNav.has(r.sectionIndex+"|"+r.url));
    if(unexpected.length)throw Error("UNSIGNED_FACTUAL_URLS_REMAIN:"+JSON.stringify(unexpected));

    const shape={...saved,bodyMarkdown:candidateBody};
    const candidateFingerprint=buildSerpReplayArticleFingerprintV1(shape);
    const officialNavigationReviewV1={
      version:"OFFICIAL_NAVIGATION_REVIEW_V1",
      articleFingerprint:candidateFingerprint,
      decision:"PENDING_REVIEW",
      entries:review.navigation.flatMap(nav=>nav.h2Indexes.map(index=>{
        const supporting=captured.find(fact=>fact.claimKey===nav.supportingClaimKey&&
          fact.sourceUrl===nav.trustedVia&&fact.ownerH2.includes(index));
        if(!supporting)throw Error("NAVIGATION_SUPPORTING_EVIDENCE_MISSING");
        return {
          url:nav.url,sectionIndex:index,
          supportingSourceUrl:nav.trustedVia,
          supportingEvidenceId:supporting.evidenceId,
          purpose:nav.url.includes("annualcreditreport")
            ?"Request free credit reports at official US destination"
            :"Report identity theft at the official US recovery service",
        };
      })),
    } as const;
    // This is the same normalized review field used by the shared
    // release gate. PENDING means it CANNOT authorize any navigation yet.
    staged.officialNavigationReviewV1=officialNavigationReviewV1;
    const pendingNavScope=verifyExistingArticleCitationScopeV1({
      candidateBodyMarkdown:candidateBody,plan:validatedPlan,
      runtime:inspection.runtime,
      navigationReview:officialNavigationReviewV1,
      articleFingerprint:candidateFingerprint,
    });
    if(pendingNavScope.unapprovedLinks!==scope.unapprovedLinks)
      throw Error("PENDING_NAVIGATION_WRONGLY_AUTHORIZED");
    // Simulate the intended editorial decision only IN MEMORY: never
    // store an approved decision, signature, reviewer or timestamp here.
    const hypothetical=verifyExistingArticleCitationScopeV1({
      candidateBodyMarkdown:candidateBody,plan:validatedPlan,
      runtime:inspection.runtime,
      navigationReview:{
        ...officialNavigationReviewV1,decision:"APPROVED",
        approvedBy:"SIMULATION_NOT_HUMAN_REVIEW",
        approvedAt:"2026-10-19T00:00:00.000Z",
      },
      articleFingerprint:candidateFingerprint,
    });
    if(hypothetical.unapprovedLinks>0||
      !hypothetical.completeSectionCitationCoverage)
      throw Error("HYPOTHETICAL_NAVIGATION_SOURCE_SCOPE_STILL_BLOCKED");
    const originalRecheck=sha(JSON.stringify(oldSnapshot));
    if(originalRecheck!==originalSnapshotSha)
      throw Error("ORIGINAL_SNAPSHOT_MUTATED_IN_MEMORY");
    const stage={
      version:"EDITORIAL_V2_STAGED_EVIDENCE_SNAPSHOT_V1",
      status:"STAGED_RESEARCH_CONTRACT_VALID_NOT_SIGNED_NOT_PERSISTED",
      articleId:article.id,briefId:article.briefId,
      originalArticleFingerprint:originalFingerprint,
      candidateMarkdownSha256:candidateSha,
      candidateArticleFingerprint:candidateFingerprint,
      originalEvidenceSnapshotSha256:originalSnapshotSha,
      stagedEvidenceSnapshotSha256:sha(JSON.stringify(staged)),
      capturedFacts:captured,
      navigation:review.navigation.map(nav=>({
        ...nav,approvalState:"REVIEWED_NOT_YET_AUTHORIZED_FOR_RELEASE",
      })),
      officialNavigationReviewV1,
      citationScopeAfterStaging:{
        totalLinks:scope.totalLinks,
        remainingUnapprovedLinkOccurrences:scope.unapprovedLinks,
        navigationOccurrencesOnly:unresolved.length===scope.unapprovedLinks &&
          unexpected.length===0,
        unresolved,
      },
      exactSourceFragmentsFetched:true,
      snapshotTechnicalValidation:"PASS",
      articleClaimSemanticVerification:"REQUIRES_FINAL_REVIEW",
      navigationReleaseAuthorization:"IMPLEMENTED_PENDING_HUMAN_REVIEW",
      modelCritics:"NOT_RUN",serpReplay:"NOT_RUN",
      queryOwnerHumanReview:"NOT_REAPPROVED",
      databaseUnchanged:true,paidCalls:0,commitAllowed:false,publishAllowed:false,
      stagedSnapshot:staged,
    };
    await mkdir(base,{recursive:true});
    const output=join(base,"staged-evidence-snapshot.json");
    await writeFile(output,JSON.stringify(stage,null,2)+"\n",{
      encoding:"utf8",mode:0o600,
    });
    console.log(JSON.stringify({
      status:stage.status,articleId:stage.articleId,
      candidateMarkdownSha256:candidateSha,
      candidateFingerprint:stage.candidateArticleFingerprint,
      originalSourceFingerprintUnchanged:true,
      capturedFactCount:stage.capturedFacts.length,
      sourceExcerptCount:stage.capturedFacts.reduce((n,fact)=>n+fact.exactSourceTexts.length,0),
      sourceCount:verifiedBodies.size,
      claimStatus:"VERIFIED_SOURCE_QUOTE_NOT_ARTICLE_SEMANTIC_APPROVAL",
      articleSemanticApproval:"PENDING",
      snapshotTechnicalValidation:stage.snapshotTechnicalValidation,
      remainingUnapprovedLinkOccurrences:scope.unapprovedLinks,
      navigationOnly:stage.citationScopeAfterStaging.navigationOccurrencesOnly,
      navigationAuthorityVisibleInSameH2:true,
      navigationReviewDecision:stage.officialNavigationReviewV1.decision,
      navigationApprovalEntryCount:stage.officialNavigationReviewV1.entries.length,
      previewOnlyUnapprovedLinksAfterHypotheticalApproval:hypothetical.unapprovedLinks,
      previewOnlyDecisionIsNotApproval:true,
      fullCritics:"NOT_RUN",serpReplay:"NOT_RUN",
      humanQueryOwnerApproval:"NOT_APPROVED",
      next:"Review article claims, then run final critics and new-fingerprint SERP Replay",
      output,databaseUnchanged:true,paidCalls:0,publishAllowed:false,
    },null,2));
  }finally{await prisma.$disconnect();}
}
main().catch(e=>{
  console.error("V2_EVIDENCE_STAGING_FAILED:",
    e instanceof Error?e.message:String(e));
  process.exitCode=1;
});
