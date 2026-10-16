/**
 * READ ONLY: compare an externally edited Markdown candidate against the
 * exact existing article and section-scoped VERIFIED_EXCERPT source authority.
 *
 * This is a DIAGNOSTIC, not a semantic verifier or a commit workflow.
 * No Gemini/DataForSEO, DB writes, checkpoint rewrites or publication.
 *
 * GROWTH_OS_ENV_DIR=/Users/user/growth-os NODE_OPTIONS=--conditions=react-server \
 * npx tsx scripts/content-review-existing-markdown-evidence.ts \
 * --article=ID --candidate=docs/content-v1-closure/credit-monitoring-review-candidate-v3.md \
 * --original-sha256=EXPECTED_EXPORT_SHA256
 */
import {loadEnvConfig} from "@next/env";
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
import {resolve} from "node:path";

loadEnvConfig(process.env.GROWTH_OS_ENV_DIR?.trim() || process.cwd());

const sha = (value:string) =>
  createHash("sha256").update(value,"utf8").digest("hex");
const normalizeUrl = (value:string):string => {
  try {
    const url=new URL(value);
    if(url.protocol!=="https:"&&url.protocol!=="http:")return "";
    url.hash="";
    return url.toString().replace(/\/$/u,"");
  }catch{return "";}
};
const normalizeHeading=(value:string)=>value
  .normalize("NFKC").toLocaleLowerCase("en-US")
  .replace(/[^\p{L}\p{N}]+/gu," ").trim();
const errorText=(error:unknown)=>
  error instanceof Error?error.message:String(error);

async function main():Promise<void>{
  const args=process.argv.slice(2);
  const id=args.find(a=>a.startsWith("--article="))?.slice(10);
  const candidatePath=args.find(a=>a.startsWith("--candidate="))?.slice(12);
  const originalSha=args.find(a=>a.startsWith("--original-sha256="))
    ?.slice("--original-sha256=".length);
  if(!id||!/^[a-z0-9_-]{5,100}$/i.test(id)||
    !candidatePath||!candidatePath.endsWith(".md")||
    !originalSha||!/^[0-9a-f]{64}$/i.test(originalSha)||
    args.length!==3)throw new Error(
      "USAGE: --article=ID --candidate=MARKDOWN.md --original-sha256=SHA256");
  const raw=await readFile(resolve(candidatePath),"utf8");
  if(raw.length>120000||!raw.trim())throw new Error("CANDIDATE_INVALID_LENGTH");
  // Production stores H1 separately. Do not infer or edit metadata here.
  const candidate=raw.trimEnd();
  const headingMatches=[...candidate.matchAll(/^##[ \t]+(.+)$/gm)];
  const candidateSections=headingMatches.map((match,index)=>{
    const start=match.index!+match[0].length;
    const end=index+1<headingMatches.length
      ?headingMatches[index+1].index!:candidate.length;
    const body=candidate.slice(start,end).trim();
    const urls=[...body.matchAll(/\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/gu)]
      .map(m=>m[1]);
    return {heading:match[1].trim(),body,
      h3:[...body.matchAll(/^###[ \t]+(.+)$/gm)].map(m=>m[1].trim()),
      externalUrls:[...new Set(urls)]};
  });
  const {prisma}=await import("../src/lib/prisma");
  try{
    const article=await prisma.contentArticle.findUnique({
      where:{id},
      include:{brief:{include:{evidenceSnapshot:true}}},
    });
    if(!article)throw new Error("ARTICLE_NOT_FOUND");
    const {inspectMasterRuntimeSnapshot}=
      await import("../src/lib/content/master-runtime-adapter");
    const {parsePersistedArticleExecutionPlanV1}=
      await import("../src/lib/content/article-execution-plan-binding-v1");
    const {buildSerpReplayArticleFingerprintV1}=
      await import("../src/lib/content/serp-replay-fingerprint");
    const snapshot=article.brief.evidenceSnapshot?.plan;
    if(!snapshot||typeof snapshot!=="object"||Array.isArray(snapshot))
      throw new Error("SAVED_EVIDENCE_SNAPSHOT_MISSING");
    const runtime=inspectMasterRuntimeSnapshot(snapshot).runtime;
    if(!runtime)throw new Error("SAVED_MASTER_RUNTIME_INVALID");
    const plan=parsePersistedArticleExecutionPlanV1(
      (snapshot as Record<string,unknown>).articleExecutionPlan);
    const writable=plan.sections.filter(s=>s.state==="WRITABLE");
    // Same bytes as the existing exporter, including one terminal LF.
    const exactOriginalExportSha=sha(article.bodyMarkdown.endsWith("\n")
      ?article.bodyMarkdown:article.bodyMarkdown+"\n");
    const originalMatches=exactOriginalExportSha===originalSha.toLowerCase();
    const previousFingerprint=buildSerpReplayArticleFingerprintV1(article);
    const candidateFingerprint=buildSerpReplayArticleFingerprintV1({
      title:article.title,metaDescription:article.metaDescription,
      h1:article.h1,bodyMarkdown:candidate,
    });
    const latestReplay=await prisma.serpReplayArtifact.findFirst({
      where:{contentArticleId:id},
      orderBy:[{createdAt:"desc"},{id:"desc"}],
      select:{articleFingerprint:true,executionStatus:true,replayStatus:true},
    });
    const sourceById=new Map(runtime.evidenceGraph.sources.map(s=>[s.id,s]));
    const claimsById=new Map(runtime.claimLedger.claims.map(c=>[c.id,c]));
    const headingAligned=(
      candidateSections.length===writable.length&&
      candidateSections.every((section,index)=>
        normalizeHeading(section.heading)===
          normalizeHeading(writable[index].heading))
    );
    const sections=candidateSections.map((section,index)=>{
      const owned=headingAligned?writable[index]:null;
      const allowed=new Map<string,{url:string;claimIds:string[]}>();
      if(owned){
        const assignedIds=new Set(owned.evidenceIds);
        const requiredClaims=new Set(owned.requiredClaimIds);
        for(const item of runtime.evidenceGraph.claimEvidence){
          if(!assignedIds.has(item.id)||
            !requiredClaims.has(item.claimId)||
            item.kind!=="VERIFIED_EXCERPT"||
            item.relation!=="SUPPORTS"||
            !item.excerpt?.trim()||
            claimsById.get(item.claimId)?.status!=="VERIFIED")continue;
          const source=sourceById.get(item.sourceId);
          if(!source)continue;
          const key=normalizeUrl(source.url);
          if(!key)continue;
          const prev=allowed.get(key);
          if(prev){
            if(!prev.claimIds.includes(item.claimId))
              prev.claimIds.push(item.claimId);
          }else{
            allowed.set(key,{url:source.url,claimIds:[item.claimId]});
          }
        }
      }
      const matchedUrls=section.externalUrls.filter(
        url=>allowed.has(normalizeUrl(url)));
      const unmatchedUrls=section.externalUrls.filter(
        url=>!allowed.has(normalizeUrl(url)));
      return {
        index,heading:section.heading,
        h3:section.h3,
        links:section.externalUrls.length,
        sectionScopedVerifiedSourceMatches:matchedUrls.length,
        unmatchedSourceUrls:unmatchedUrls,
        assignedVerifiedSourceUrls:[...allowed.values()],
        // No original-section comparison can establish factual support.
        changedProseRequiresSemanticVerification:true,
      };
    });
    const unmatched=sections.flatMap(s=>s.unmatchedSourceUrls);
    const keywordTerms=[
      article.brief.primaryKeyword,...article.brief.secondaryKeywords
    ].filter(Boolean);
    const corpus=[article.title,article.h1,candidate].join("\n")
      .toLocaleLowerCase("en-US");
    const keywordOccurrences=keywordTerms.map(keyword=>({
      keyword,appearsInCandidateOrMetadata:
        corpus.includes(keyword.toLocaleLowerCase("en-US")),
    }));
    const forbiddenH1=/^#[ \t]+/m.test(candidate);
    const allHeadings=sections.flatMap(s=>[s.heading,...s.h3]);
    const normalizedHeadings=allHeadings.map(normalizeHeading);
    const duplicateHeadings=normalizedHeadings.filter(
      (h,i)=>h&&normalizedHeadings.indexOf(h)!==i);
    const safeStructure=headingAligned&&!forbiddenH1&&duplicateHeadings.length===0;
    const report={
      mode:"READ_ONLY_CANDIDATE_EVIDENCE_SCOPE_REVIEW",
      articleId:id,articleStatus:article.status,
      originalExportSha256:exactOriginalExportSha,
      originalExportMatchesExpected:originalMatches,
      existingArticleFingerprint:previousFingerprint,
      latestReplayMatchesExistingArticle:
        latestReplay?.articleFingerprint===previousFingerprint,
      candidateBodySha256:sha(candidate),
      candidateFingerprint,
      candidateReplayMatches:
        latestReplay?.articleFingerprint===candidateFingerprint,
      candidateH1InsideBody:forbiddenH1,
      candidateH2:sections.length,
      candidateH3:sections.reduce((n,s)=>n+s.h3.length,0),
      candidateHeadingsMatchLockedPlan:headingAligned,
      duplicateHeadings,
      keywordOccurrences,sections,
      externalLinksNotMappedToSectionVerifiedEvidence:unmatched.length,
      status:!originalMatches||!safeStructure
        ?"STOP_ORIGINAL_OR_STRUCTURE_MISMATCH":
        unmatched.length>0
        ?"RESEARCH_AND_EVIDENCE_REVIEW_REQUIRED":
        "SEMANTIC_AND_FRESH_REPLAY_STILL_REQUIRED",
      commitAllowed:false,
      semanticVerificationPerformed:false,
      criticismAndReplayPerformed:false,
      warning:"Matching a source URL is not claim entailment. An unmatched URL is NOT authorized by the signed Section Contract; all changed content still requires semantic verification, full critic suite and fresh SERP Replay.",
      paidCalls:0,databaseUnchanged:true,
    };
    console.log(JSON.stringify(report,null,2));
    if(!originalMatches||!safeStructure)process.exitCode=2;
  }finally{await prisma.$disconnect();}
}
main().catch(e=>{
  console.error("CANDIDATE_EVIDENCE_REVIEW_FAILED="+errorText(e));
  process.exitCode=1;
});
