/**
 * Growth OS Editorial V2: read-only offline / PostgreSQL preflight.
 * This script never writes DB records or calls providers, AI or paid APIs.
 * Intended extracted location: <repo>/.growth-os-tmp/v2-review/review-v2.mjs
 */
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {dirname,join} from "node:path";
import {fileURLToPath} from "node:url";

const dir=dirname(fileURLToPath(import.meta.url));
const id="cmv606xg60006siqlir66uq23";
const expected="99cff865207e98f8020326786ea93d6bb744a1a63a0c51914160751f460057e8";
const mode=process.argv[2];
if(process.argv.length!==3||!["--offline","--db"].includes(mode))
  throw Error("USAGE: review-v2.mjs --offline | --db");
const markdown=readFileSync(join(dir,"candidate.md"),"utf8");
const manifest=JSON.parse(readFileSync(join(dir,"editorial-manifest.json"),"utf8"));
const digest=s=>createHash("sha256").update(s).digest("hex");
const h1Match=/^# ([^\r\n]+)\r?\n\r?\n/.exec(markdown);
if(!h1Match)throw Error("CANDIDATE_H1_NOT_FOUND");
const h1=h1Match[1].trim();
const body=markdown.slice(h1Match[0].length).trimEnd();
const sections=s=>{
  const matches=[...s.matchAll(/^##\s+([^\n]+)\n/gm)];
  return matches.map((m,i)=>({
    heading:m[1].trim(),
    text:s.slice(m.index,i+1<matches.length?matches[i+1].index:undefined),
  }));
};
const urls=s=>[...new Set([...s.matchAll(/\]\((https?:\/\/[^)]+)\)/g)].map(x=>x[1]))];
const candidateSections=sections(body);
const headings={h1:(markdown.match(/^# /gm)||[]).length,
  h2:candidateSections.length,h3:(body.match(/^### /gm)||[]).length};
const offline={
  mode,articleId:id,candidateMarkdownSha256:digest(markdown),
  manifestHashMatches:digest(markdown)===manifest.markdown_sha256,
  headings,candidateLinkCount:urls(body).length,
  sourceResearchSignedForV2:false,existingReplayReusable:false,
  existingQueryOwnerApprovalReusable:false,paidCalls:0,databaseUnchanged:true,
};
if(!offline.manifestHashMatches)throw Error("CANDIDATE_HASH_MISMATCH");
if(headings.h1!==1||headings.h2!==6||headings.h3!==6)
  throw Error("CANDIDATE_HEADINGS_CHANGED");
if(mode==="--offline"){
  console.log(JSON.stringify({...offline,status:"OFFLINE_PASS_NOT_PUBLICATION_READY"},null,2));
}else{
  const {loadEnvConfig}=await import("@next/env");
  loadEnvConfig(process.env.GROWTH_OS_ENV_DIR?.trim()||process.cwd());
  const {prisma}=await import("../../src/lib/prisma");
  try{
    const [article,replay]=await Promise.all([
      prisma.contentArticle.findUnique({where:{id},
        include:{brief:{include:{evidenceSnapshot:true}}}}),
      prisma.serpReplayArtifact.findFirst({where:{contentArticleId:id},
        orderBy:[{createdAt:"desc"},{id:"desc"}]}),
    ]);
    if(!article)throw Error("SAVED_ARTICLE_MISSING");
    const [{buildSerpReplayArticleFingerprintV1:fp},{auditArticle},
      {inspectMasterRuntimeSnapshot},
      {parsePersistedArticleExecutionPlanV1},
      {evaluateArticleSearchReadinessV2}]=await Promise.all([
        import("../../src/lib/content/serp-replay-fingerprint"),
        import("../../src/lib/content/content-quality"),
        import("../../src/lib/content/master-runtime-adapter"),
        import("../../src/lib/content/article-execution-plan-binding-v1"),
        import("../../src/lib/content/article-search-readiness-v2"),
      ]);
    const saved={title:article.title,metaDescription:article.metaDescription,
      h1:article.h1,bodyMarkdown:article.bodyMarkdown};
    const candidate={...saved,h1,bodyMarkdown:body};
    const originalFingerprint=fp(saved);
    const candidateFingerprint=fp(candidate);
    const sourceUnchanged=originalFingerprint===expected&&article.status==="IN_REVIEW";
    if(!sourceUnchanged)throw Error("SAVED_ARTICLE_CHANGED_STOP");
    if(saved.h1!==h1)throw Error("H1_CHANGED_STOP");
    const originalSections=sections(saved.bodyMarkdown);
    if(originalSections.length!==candidateSections.length||
       originalSections.some((s,i)=>s.heading!==candidateSections[i].heading))
      throw Error("SIGNED_H2_MAPPING_CHANGED_STOP");
    const sectionUrlComparison=originalSections.map((s,i)=>{
      const before=urls(s.text),after=urls(candidateSections[i].text);
      return {heading:s.heading,originalUrlCount:before.length,
        candidateUrlCount:after.length,
        lostOriginalUrls:before.filter(x=>!after.includes(x)),
        supplementalUrls:after.filter(x=>!before.includes(x))};
    });
    if(sectionUrlComparison.some(s=>s.lostOriginalUrls.length))
      throw Error("SIGNED_SECTION_URL_REMOVED_STOP");
    const snapshot=article.brief.evidenceSnapshot?.plan;
    const v=snapshot&&typeof snapshot==="object"&&!Array.isArray(snapshot)?snapshot:null;
    let plan=null,planError=null;
    try{if(v?.articleExecutionPlan)
      plan=parsePersistedArticleExecutionPlanV1(v.articleExecutionPlan);}
    catch(e){planError=String(e?.message??e);}
    const runtime=inspectMasterRuntimeSnapshot(snapshot).runtime;
    const audit=auditArticle({article:candidate,
      primaryKeyword:article.brief.primaryKeyword});
    const readiness=evaluateArticleSearchReadinessV2({
      article:candidate,runtime,plan,replay:null,
      primaryKeyword:article.brief.primaryKeyword,
      secondaryKeywords:article.brief.secondaryKeywords,
    });
    console.log(JSON.stringify({
      ...offline,status:"DB_PREFLIGHT_COMPLETE_NOT_PUBLICATION_READY",
      sourceUnchanged,candidateFingerprint,
      savedArticleFingerprint:originalFingerprint,
      candidateDiffersFromOriginal:candidateFingerprint!==originalFingerprint,
      oldReplayMatchesOriginal:replay?.articleFingerprint===originalFingerprint,
      matchesOldReplay:replay?.articleFingerprint===candidateFingerprint,
      sectionUrlComparison,
      technicalAudit:{score:audit.score,wordCount:audit.wordCount,
        h2Count:audit.h2Count,h3Count:audit.h3Count,issues:audit.issues},
      planError,verifiedResearchRuntimePresent:!!runtime,
      searchReadinessWithoutStaleReplay:{status:readiness.status,
        findings:readiness.findings.map(f=>f.code)},
      gates:{sectionSourcesPreserved:true,supplementalEvidenceSigned:false,
        newFingerprintCritics:"NOT_RUN",newFingerprintSerpReplay:"NOT_RUN",
        humanQueryApproval:"NEW_VERSION_NEEDS_REVIEW",publicationAllowed:false},
    },null,2));
  }finally{
    await prisma.$disconnect();
  }
}
