/**
 * Evidence V2: FREE, READ-ONLY official source check for an existing article.
 * It verifies exact external source passages and H2 citation locations.
 * Never signs, modifies or stores a Growth OS EvidenceSnapshot; never
 * re-runs Writer, makes paid API calls, approves or publishes.
 *
 * NODE_OPTIONS=--conditions=react-server npx tsx scripts/content-v2-source-preflight.ts
 * Optional: --fetch-official (fetch 3 FTC HTML pages, 15s timeout each)
 */
import {createHash} from "node:crypto";
import {readFile, mkdir, writeFile} from "node:fs/promises";
import {resolve, join} from "node:path";

type SourceEntry={group:string;url:string;ownerSectionIndexes:number[];
  exactShortExcerpts:string[];candidateClaim:string;};
type Navigation={url:string;ownerSectionIndexes:number[];
  authorityPage:string;trustedAuthorityAnchor:string;};
type Mapping={articleId:string;candidateMarkdownSha256:string;
  factualEvidence:SourceEntry[];navigationLinks:Navigation[];};

async function main(): Promise<void> {
const args=process.argv.slice(2);
if(args.length>1 || (args.length===1 && args[0]!=="--fetch-official")){
  throw new Error("USAGE: content-v2-source-preflight.ts [--fetch-official]");
}
const fetchOfficial=args.includes("--fetch-official");
const root=resolve("review-artifacts/editorial-v2-20261019");
const [markdown,rawMapping]=await Promise.all([
  readFile(join(root,"candidate.md"),"utf8"),
  readFile(join(root,"official-evidence-worklist.json"),"utf8"),
]);
const worklist=JSON.parse(rawMapping) as Mapping;
const sha256=(s:string)=>createHash("sha256").update(s,"utf8").digest("hex");
if(sha256(markdown)!==worklist.candidateMarkdownSha256)
  throw Error("CANDIDATE_SHA256_MISMATCH");
if(worklist.articleId!=="cmv606xg60006siqlir66uq23")
  throw Error("ARTICLE_ID_MISMATCH");
const sectionMarkers=[...markdown.matchAll(/^## (.+)$/gm)];
const sections=sectionMarkers.map((hit,index)=>markdown.slice(hit.index!,
  sectionMarkers[index+1]?.index??markdown.length));
if(sections.length!==6)throw Error("SECTION_COUNT_MISMATCH");
const hasLink=(body:string,url:string)=>body.includes("]("+url+")");
const norm=(s:string)=>s.normalize("NFKC").replace(/[’‘]/g,"'")
  .replace(/\s+/gu," ").toLocaleLowerCase("en-US");
const statuses=[];
for(const row of [...worklist.factualEvidence,...worklist.navigationLinks]){
  const actual=sections.map((s,i)=>hasLink(s,row.url)?i:-1).filter(i=>i>=0);
  const expected=[...row.ownerSectionIndexes];
  const correct=actual.length===expected.length &&
    actual.every((index)=>expected.includes(index));
  statuses.push({url:row.url,role:"exactShortExcerpts" in row?"EVIDENCE_SOURCE":"NAVIGATION",
    expectedH2Indexes:expected,actualH2Indexes:actual,
    sameSectionLinksCorrect:correct});
}
const fetchResults:Record<string,{
  fetched:boolean;httpStatus:number|null;sourceTextChars:number;
  excerpts:Array<{snippet:string;present:boolean}>;
  navigationAuthorityAnchors:Array<{url:string;present:boolean}>;
}>={};
if(fetchOfficial){
  const {fetchSinglePage}=await import("../src/lib/crawler/crawler");
  for(const source of worklist.factualEvidence){
    if(new URL(source.url).hostname!=="consumer.ftc.gov")
      throw Error("ONLY_APPROVED_FTC_SOURCE_FETCH_ALLOWED");
    let body="", httpStatus:number|null=null;
    try{
      const page=await fetchSinglePage(source.url,{timeoutMs:15000,maxResponseSize:2*1024*1024});
      httpStatus=page.statusCode;
      if(!page.error && page.statusCode>=200 && page.statusCode<300)
        body=page.parsed?.bodyText||"";
    }catch{ /* stop closed; results show unavailable */ }
    const normalized=norm(body);
    const relatedNavigation=worklist.navigationLinks.filter(nav=>
      nav.authorityPage===source.url);
    fetchResults[source.url]={
      fetched:!!body,httpStatus,sourceTextChars:body.length,
      excerpts:source.exactShortExcerpts.map(snippet=>({
        snippet,present:!!body && normalized.includes(norm(snippet)),
      })),
      navigationAuthorityAnchors:relatedNavigation.map(nav=>({
        url:nav.url,present:!!body && normalized.includes(norm(nav.trustedAuthorityAnchor)),
      })),
    };
  }
}
const sourcePassed=fetchOfficial && Object.values(fetchResults).every(source=>
  source.fetched && source.excerpts.every(ex=>ex.present) &&
  source.navigationAuthorityAnchors.every(nav=>nav.present));
const h2Passed=statuses.every(s=>s.sameSectionLinksCorrect);
const report={
  mode:fetchOfficial?"FREE_OFFICIAL_SOURCE_FETCH_AND_SCOPE":"OFFLINE_SCOPE_ONLY",
  articleId:worklist.articleId,candidateSha256:worklist.candidateMarkdownSha256,
  sourceLinkScope:h2Passed?"PASS":"BLOCK",
  fetchAndExactExcerptCheck:!fetchOfficial?"NOT_RUN":
    sourcePassed?"PASS_WEB_SOURCE_TEXT_ONLY":"INCOMPLETE",
  sourceRoles:statuses,
  fetchedSources:fetchResults,
  verifiedWebTextIsSignedResearch:false,
  navigationLinksAreNotExcerpts:true,
  newFingerprintCriticsExecuted:false,newReplayExecuted:false,
  canCommit:false,canPublish:false,paidCalls:0,databaseUnchanged:true,
  nextAction:!h2Passed?"REVIEW_LINK_H2_LOCATIONS":
    !fetchOfficial?"RUN_OPTIONAL_FREE_SOURCE_FETCH":
    !sourcePassed?"REVIEW_UNAVAILABLE_EXACT_FTC_PASSAGES":
    "REVIEW_FULL_CLAIM_ENTAILMENT_AND_STAGE_SIGNED_SECTION_EVIDENCE",
};
const dest=resolve(".growth-os-tmp/v2-review");
await mkdir(dest,{recursive:true});
await writeFile(join(dest,"official-source-preflight.json"),JSON.stringify(report,null,2)+"\n",
  {encoding:"utf8",mode:0o600});
console.log(JSON.stringify(report,null,2));
if(!h2Passed || (fetchOfficial&&!sourcePassed))process.exitCode=2;
}

main().catch((error: unknown) => {
  console.error("V2_SOURCE_PREFLIGHT_FAILED:",
    error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
