/**
 * Evidence-based SEARCH readiness, separate from Writer's technical pass.
 * Missing metrics stay null. Exact brief words are not a ranking score.
 * Zero paid calls and zero mutations.
 */
import {countExactPhrase,countWords} from "./article-analyzer";
import {buildSerpReplayArticleFingerprintV1} from "./serp-replay-fingerprint";
import type {MasterRuntimeSnapshotV1} from "./master-runtime-adapter";
import type {ArticleExecutionPlanV1} from "./article-execution-plan-v1";
export type SearchReadinessArticleV2={
  title:string;metaDescription:string;h1:string;bodyMarkdown:string;
};
export type SearchReadinessReplayV2={
  executionStatus:string;replayStatus:string|null;
  articleFingerprint:string;articleFingerprintAlgo:string;
  warnings?:unknown;blockers?:unknown;
};
export type SearchReadinessFindingV2={
  code:string;severity:"BLOCK"|"REVIEW";reason:string;action:string;
  detail?:string;
};
const querySources=new Set([
  "DATAFORSEO","GSC","GOOGLE_TRENDS","PAA","RELATED_SEARCH",
  "SERP_QUESTION","COMPETITOR_QUERY",
]);
const joins=[
  "ormultiple","understandingthe","thevisibility","servicesoffer",
  "caninclude","monitoringprocess","reportinformation",
  "yourenrollment","separateconfirmed","businessthat",
  "in theservice","in theinformation","reportinformation",
];
const normalize=(s:string)=>s.toLowerCase().normalize("NFKC")
  .replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/gu," ").trim();
export function inspectProseJoinAnomaliesV2(body:string):string[]{
  const text=body.replace(/https?:\/\/\S+/gu,"");
  const out=new Set<string>();
  for(const match of text.matchAll(/\b[\p{L}]+,[\p{L}]+/gu))
    out.add(match[0].slice(0,90));
  for(const candidate of joins)
    if(text.toLowerCase().includes(candidate))out.add(candidate);
  return [...out].sort().slice(0,20);
}
export function evaluateArticleSearchReadinessV2({
  article,runtime,plan,primaryKeyword,secondaryKeywords,replay,
}:{
  article:Readonly<SearchReadinessArticleV2>;
  runtime:Readonly<MasterRuntimeSnapshotV1>|null;
  plan:Readonly<ArticleExecutionPlanV1>|null;
  primaryKeyword:string;secondaryKeywords:readonly string[];
  replay:Readonly<SearchReadinessReplayV2>|null;
}){
  const findings:SearchReadinessFindingV2[]=[];
  const add=(code:string,severity:"BLOCK"|"REVIEW",reason:string,
    action:string,detail?:string)=>{
    findings.push({code,severity,reason,action,...(detail?{detail}:{})});
  };
  const corpus=[article.title,article.h1,article.bodyMarkdown].join("\n");
  const brief=[primaryKeyword,...secondaryKeywords].filter(Boolean);
  const usedBriefKeywords=brief.map(keyword=>({
    keyword,exactMentions:countExactPhrase(corpus,keyword),
  }));
  const body=article.bodyMarkdown;
  const headings=[...body.matchAll(/^##\s+([^\n]+)/gm)].map(m=>m[1]);
  const nestedHeadings=[...body.matchAll(/^###\s+([^\n]+)/gm)].map(m=>m[1]);
  const anomalies=inspectProseJoinAnomaliesV2(body);
  if(anomalies.length)add("PROSE_SPACING_DEFECT","BLOCK",
    "Visible text has likely missing spaces or punctuation spacing.",
    "Copyedit the affected sentences, then reverify and regenerate SERP Replay.",
    anomalies.join(" | "));
  const linkCount=(body.match(/\[[^\]]+\]\(https?:\/\/[^)]+\)|https?:\/\/\S+/gu)??[]).length;
  if(runtime?.mission.riskClass.startsWith("YMYL_")&&linkCount===0)
    add("YMYL_VISIBLE_SOURCES_MISSING","REVIEW",
      "Verified internal claims are not reader-visible citations.",
      "Provide accurate relevant source links and review financial claims before publishing.");
  const same=new Set(runtime?.queryGraph.samePageNodeIds??[]);
  const provenance=new Map(runtime?.queryGraph.provenance.map(x=>
    [x.nodeId,x.sources] as const)??[]);
  const owners=new Map<string,{index:number;heading:string}>();
  runtime?.sectionBlueprints.sections.forEach((section,index)=>
    section.queryNodeIds.forEach(id=>
      owners.set(id,{index,heading:section.heading})));
  const briefNorm=new Set(brief.map(normalize));
  const observed=runtime?.queryGraph.nodes.flatMap(node=>{
    const sources=(provenance.get(node.id)??[]).filter(source=>
      querySources.has(source));
    if(!same.has(node.id)||!sources.length||
      node.intent!==runtime.queryGraph.missionIntent||
      node.sourceConfidence<0.6||briefNorm.has(normalize(node.query)))
      return [];
    const owner=owners.get(node.id);
    return [{
      query:node.query,cluster:node.cluster,intent:node.intent,
      subIntent:node.subIntent,sources,
      searchVolume:Number.isFinite(node.searchVolume)?node.searchVolume!:null,
      gscImpressions:Number.isFinite(node.gscImpressions)?node.gscImpressions!:null,
      confidence:node.sourceConfidence,
      ownerSectionIndex:owner?.index??null,
      ownerHeading:owner?.heading??null,
      exactMentions:countExactPhrase(corpus,node.query),
    }];
  })??[];
  observed.sort((a,b)=>
    (b.gscImpressions??-1)-(a.gscImpressions??-1)||
    (b.searchVolume??-1)-(a.searchVolume??-1)||
    b.confidence-a.confidence);
  if(!runtime)add("RESEARCH_RUNTIME_MISSING","BLOCK",
    "The persisted research snapshot is absent or unverified.",
    "Recreate verified research before claiming search competitiveness.");
  else if(observed.length===0)add("NO_OBSERVED_SUPPORTING_QUERIES","BLOCK",
    "Only brief keywords are known; no extra same-page observed search queries.",
    "Research real queries in the correct market using existing DataForSEO/GSC pipeline, classify intent, bind validated questions to evidenced H2s. Never synthesize volume.");
  else if(!observed.some(q=>q.ownerSectionIndex!==null))
    add("QUERY_TO_SECTION_BRIDGE_MISSING","BLOCK",
      "Real related queries exist but none is assigned to article sections.",
      "Review which queries belong on this page and map each to a source-backed H2.");
  // Map actual publication-grade excerpt sources to their owner H2s.
  // A URL is evidence to REVIEW, not permission to automatically insert
  // a citation in prose that has subsequently changed.
  const sourceById=new Map(runtime?.evidenceGraph.sources.map(source=>
    [source.id,source] as const)??[]);
  const sectionSourceCandidates=runtime?.sectionBlueprints.sections.map(
    (section,index)=>{
      const required=new Set(section.requiredClaims);
      const explicit=new Set(section.evidenceIds);
      const approved=runtime.evidenceGraph.claimEvidence.filter(item=>
        item.kind==="VERIFIED_EXCERPT"&&
        item.relation==="SUPPORTS"&&
        typeof item.excerpt==="string"&&item.excerpt.trim()&&
        (explicit.has(item.id)||required.has(item.claimId)));
      const collected=new Map<string,{
        url:string;publisher:string;sourceType:string;
        supportedClaimIds:string[];
      }>();
      for(const ev of approved){
        const source=sourceById.get(ev.sourceId);
        if(!source)continue;
        const prev=collected.get(source.id);
        if(prev){
          if(!prev.supportedClaimIds.includes(ev.claimId))
            prev.supportedClaimIds.push(ev.claimId);
        }else{
          collected.set(source.id,{
            url:source.url,publisher:source.publisher,
            sourceType:source.sourceType,
            supportedClaimIds:[ev.claimId],
          });
        }
      }
      return {
        sectionIndex:index,heading:section.heading,
        evidenceBackedLinks:[...collected.values()]
          .sort((a,b)=>
            (a.sourceType==="PRIMARY_GOVERNMENT"?-1:0)-
            (b.sourceType==="PRIMARY_GOVERNMENT"?-1:0))
          .slice(0,8),
      };
    })??[];
  const canonicalCountry=(s:string)=>({
    us:"united states",usa:"united states",
    "united states of america":"united states",ca:"canada",
    gb:"united kingdom",uk:"united kingdom",
  } as Record<string,string>)[normalize(s)]??normalize(s);
  if(runtime?.serpResearch&&
    canonicalCountry(runtime.mission.location)!==
      canonicalCountry(runtime.serpResearch.country))
    add("SERP_MISSION_MARKET_MISMATCH","BLOCK",
      "SERP evidence was captured for a different country from the mission.",
      "Re-run real competitor research in the correct jurisdiction before changing claims.",
      runtime.mission.location+" / "+runtime.serpResearch.country);
  const unassigned=observed.filter(q=>q.ownerSectionIndex===null);
  if(unassigned.length)add("OBSERVED_QUERIES_NOT_OWNED","REVIEW",
    "Real same-page queries remain unmapped; intent may be incomplete.",
    "Allocate to an H2 with verified evidence or move to a separate page to avoid cannibalization.",
    unassigned.slice(0,6).map(q=>q.query).join(" | "));
  const requiredUnassigned=plan?.requiredQuestions.filter(q=>
    q.priority==="MUST"&&!plan.sections.some(section=>
      section.state==="WRITABLE"&&section.requiredQuestionIds.includes(q.id)))??[];
  if(requiredUnassigned.length)add("REQUIRED_QUESTIONS_UNSUPPORTED","BLOCK",
    "Required reader questions have no writable evidence-backed section.",
    "Recover authoritative excerpts or revise the plan before adding answers.",
    requiredUnassigned.map(x=>x.label).join(" | "));
  if(!runtime?.serpResearch||runtime.serpResearch.results.length<3)
    add("SERP_MARKET_SAMPLE_INSUFFICIENT","REVIEW",
      "Fewer than three real competitor SERP results are saved.",
      "Retrieve market-, language- and device-matched competitor pages before a top-ranking claim.");
  const fingerprint=buildSerpReplayArticleFingerprintV1(article);
  const replayMatches=!!replay&&replay.executionStatus==="SUCCEEDED"&&
    replay.articleFingerprintAlgo==="SHA256_V1"&&
    replay.articleFingerprint===fingerprint;
  if(!replayMatches)add("SERP_REPLAY_CURRENT_VERSION_MISSING","BLOCK",
    "No successful SERP Replay matches the exact saved article.",
    "Re-run SERP Replay after any substantive edits.");
  else if(!["PASS","READY"].includes(replay.replayStatus??""))
    add("SERP_REPLAY_WARN","REVIEW",
      "Competitive SERP Replay is not a clean pass.",
      "Inspect dimension-level competitor findings rather than treating WARN as ranking readiness.",
      replay.replayStatus??"NULL");
  if(headings.length>=5&&nestedHeadings.length>0&&
    body.split(/^##\s+/m).slice(1).filter(x=>
      /^###\s+\S/m.test(x)).length===1)
    add("H3S_CONCENTRATED","REVIEW",
      "All nested headings are confined to one H2.",
      "Review substantive reader subsections, not decorative H3 quotas.");
  if(!plan)add("EXECUTION_PLAN_MISSING","BLOCK",
    "No verified article execution plan.",
    "Recover the immutable plan first.");
  const clusters=[...new Set(observed.map(q=>q.cluster))].sort().map(cluster=>({
    cluster,queries:observed.filter(q=>q.cluster===cluster),
  }));
  const blockers=findings.filter(x=>x.severity==="BLOCK");
  const status=blockers.length?
    (anomalies.length?"EDITORIAL_REPAIR_REQUIRED":"RESEARCH_REQUIRED"):
    findings.length?"HUMAN_REVIEW_REQUIRED":"READY_FOR_HUMAN_REVIEW";
  return {
    version:"ARTICLE_SEARCH_READINESS_V2" as const,status,
    canClaimSeoReady:findings.length===0,
    publishRecommendation:findings.length?"HOLD_FOR_REVIEW":"HUMAN_REVIEW",
    market:runtime?{
      location:runtime.mission.location,language:runtime.mission.language,
      jurisdiction:runtime.mission.jurisdiction??null,
      riskClass:runtime.mission.riskClass,
      serpCountry:runtime.serpResearch?.country??null,
      serpLanguage:runtime.serpResearch?.language??null,
    }:null,
    article:{words:countWords(body),h1:1,h2:headings.length,
      h3:nestedHeadings.length,visibleExternalLinks:linkCount,
      probableSpacingIssues:anomalies},
    briefLexicalCoverage:usedBriefKeywords,
    observedSupportingQueries:observed.length,
    assignedSupportingQueries:observed.filter(q=>q.ownerSectionIndex!==null).length,
    observedQueryClusters:clusters,
    sectionSourceCandidates,
    requiredQuestionGaps:requiredUnassigned.map(q=>q.label),
    competitors:runtime?.serpResearch?.results.length??0,
    replay:{status:replay?.replayStatus??null,articleFingerprintMatches:replayMatches,
      warnings:Array.isArray(replay?.warnings)?replay.warnings:[],
      blockers:Array.isArray(replay?.blockers)?replay.blockers:[]},
    findings,
    explanation:"No numeric keyword or word quota guarantees Google rankings. Unobserved keywords and missing metrics must not be invented.",
  };
}

/**
 * Very narrow publication invariant: don't knowingly publish obvious
 * malformed joined words or missing comma-space. This is not a Google
 * SEO ranking metric. No unknown-query quota blocks publication here.
 */
export class ArticleProseHygieneErrorV2 extends Error{
  readonly code="ARTICLE_PROSE_COPYEDIT_REQUIRED" as const;
  constructor(readonly defects:readonly string[]){
    super("ARTICLE_PROSE_COPYEDIT_REQUIRED:"+defects.join(","));
    this.name="ArticleProseHygieneErrorV2";
  }
}
export function assertArticleProseHygieneV2(body:string):void{
  const defects=inspectProseJoinAnomaliesV2(body);
  if(defects.length)throw new ArticleProseHygieneErrorV2(defects);
}
