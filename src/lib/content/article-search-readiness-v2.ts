/**
 * Evidence-based SEARCH readiness, separate from Writer's technical pass.
 * Missing metrics stay null. Exact brief words are not a ranking score.
 * Zero paid calls and zero mutations.
 */
import {countExactPhrase,countWords} from "./article-analyzer";
import {buildSerpReplayArticleFingerprintV1} from "./serp-replay-fingerprint";
import type {MasterRuntimeSnapshotV1} from "./master-runtime-adapter";
import type {ArticleExecutionPlanV1} from "./article-execution-plan-v1";
import {suggestObservedQueryHeadingCandidateV1}
  from "./observed-query-heading-candidate-v1";
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
  "helpyou","thealert","thealertthen","phone,depending",
  "yourreport","thereport","theinformation","reportinformation",
  // Observed in the already committed Credit Monitoring article
  // (2026-10-16). These are precise, literal join defects; do not
  // invent broad word-splitting rules that harm brands or technical text.
  "creditcard","thereview","informationyou","assumptionto",
  "ofcoverage","whosecoverage","toreview",
];
const normalize=(s:string)=>s.toLowerCase().normalize("NFKC")
  .replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/gu," ").trim();
export function inspectProseJoinAnomaliesV2(body:string):string[]{
  const text=body.replace(/https?:\/\/\S+/gu,"");
  const out=new Set<string>();
  for(const match of text.matchAll(/\b[\p{L}]+,[\p{L}]+/gu))
    out.add(match[0].slice(0,90));
  for(const candidate of joins){
    // Candidate values are literals containing only letters or commas.
    const re=new RegExp("\\b"+candidate+"\\b","iu");
    if(re.test(text))out.add(candidate);
  }
  // "toa" alone is also a real name/brand. Only flag the exact observed
  // English spacing defect rather than blocking unrelated brands.
  if(/\b(?:relevant|applies) toa particular\b/iu.test(text))out.add("toa");
  return [...out].sort().slice(0,20);
}

/**
 * Bounded, REVIEW-ONLY word-join suspicions based on syntax and words
 * already present in the article. This is not a dictionary, language model
 * or a safe autocorrect rule. Never mutate publication bytes or reject
 * an article solely on these uncertain observations.
 */
export type ProseJoinSuspicionV2={
  token:string; suggestedSpacing:string;
  evidence:"GRAMMATICAL_SUFFIX"|"LOCAL_VOCABULARY";
};
export function inspectPossibleProseWordJoinsV2(body:string):ProseJoinSuspicionV2[]{
  // Search only reader-visible prose. URLs, Markdown links, code and H headings
  // contain legitimate joined identifiers and must not contribute findings.
  const prose=body
    .replace(/(?:\x60{3,}|~{3,})[\s\S]*?(?:\x60{3,}|~{3,})/gu," ")
    .replace(/\x60[^\x60\n]*\x60/gu," ")
    .replace(/!?\[[^\]]*\]\([^)]+\)/gu," ")
    .replace(/https?:\/\/[^\s)]+/gu," ")
    .replace(/^\s{0,3}#{1,6}\s+.*$/gmu," ")
    .replace(/<[^>]+>/gu," ");
  const words=[...prose.matchAll(/\b[a-zA-Z]{2,40}\b/gu)]
    .map(x=>x[0]);
  const known=new Set(words.map(x=>x.toLowerCase()));
  const found=new Map<string,ProseJoinSuspicionV2>();
  const emit=(token:string,suggestedSpacing:string,
    evidence:ProseJoinSuspicionV2["evidence"])=>{
    if(!found.has(token))found.set(token,{token,suggestedSpacing,evidence});
  };
  for(const original of words){
    // Names and title-case identifiers are too ambiguous to split.
    if(original!==original.toLowerCase()||
      original.length<8||original.length>40)continue;
    const word=original.toLowerCase();
    // Short grammatical endings are evidence of a probable lost boundary.
    // The comparative + "to" pattern also catches "easierto" when the
    // isolated "easier" is absent from the same article.
    for(const suffix of ["whether","you","to"]){
      if(!word.endsWith(suffix))continue;
      const stem=word.slice(0,-suffix.length);
      if(stem.length<5)continue;
      if(suffix==="to"&&!known.has(stem)&&!stem.endsWith("er"))continue;
      emit(word,stem+" "+suffix,"GRAMMATICAL_SUFFIX");
      break;
    }
    if(found.has(word)||word.length<14)continue;
    // Require all three components to be attested independently in the
    // article. Do not fabricate splits based on unknown English words.
    outer:for(let i=4;i<=word.length-8;i++){
      const first=word.slice(0,i);
      if(!known.has(first))continue;
      for(let j=i+3;j<=word.length-4;j++){
        const middle=word.slice(i,j),last=word.slice(j);
        if(known.has(middle)&&known.has(last)){
          emit(word,first+" "+middle+" "+last,"LOCAL_VOCABULARY");
          break outer;
        }
      }
    }
  }
  return [...found.values()].slice(0,20);
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
  const possibleWordJoins=inspectPossibleProseWordJoinsV2(body)
    .filter(x=>!anomalies.includes(x.token));
  if(anomalies.length)add("PROSE_SPACING_DEFECT","BLOCK",
    "Visible text has likely missing spaces or punctuation spacing.",
    "Copyedit the affected sentences, then reverify and regenerate SERP Replay.",
    anomalies.join(" | "));
  if(possibleWordJoins.length)add("PROSE_WORD_JOIN_REVIEW_REQUIRED","REVIEW",
    "Possible glued words were inferred from nearby article vocabulary or grammatical endings.",
    "Inspect the suggested spacing in context. Do not autocorrect or block publication solely on this heuristic.",
    possibleWordJoins.map(x=>x.token+" → "+x.suggestedSpacing).join(" | "));
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
;
  // Map actual publication-grade excerpt sources to their owner H2s.
  // A URL is evidence to REVIEW, not permission to automatically insert
  // a citation in prose that has subsequently changed.
  const sourceById=new Map(runtime?.evidenceGraph?.sources.map(source=>
    [source.id,source] as const)??[]);
  const sectionSourceCandidates=runtime?.sectionBlueprints.sections.map(
    (section,index)=>{
      const required=new Set(section.requiredClaims);
      const explicit=new Set(section.evidenceIds);
      const approved=(runtime.evidenceGraph?.claimEvidence??[]).filter(item=>
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
  // Observed SAME_PAGE query is not technically bound in the frozen
  // QueryGraph, but may already have a unique source-backed heading.
  // This remains a SUGGESTION, not a manufactured signed assignment.
  const persistedH2=headings;
  const headingCandidates=observed.flatMap(query=>{
    if(query.ownerSectionIndex!==null)return [];
    const suggestion=suggestObservedQueryHeadingCandidateV1({
      query:query.query,
      sections:(runtime?.sectionBlueprints.sections??[]).map((section,index)=>({
        index,heading:section.heading,
        persistedH2:persistedH2[index]??null,
        verifiedEvidenceCount:
          sectionSourceCandidates[index]?.evidenceBackedLinks.length??0,
      })),
    });
    return suggestion?[{query:query.query,queryIntent:query.intent,
      querySource:query.sources,
      ...suggestion}]:[];
  });
  const suggestedQuerySet=new Set(headingCandidates.map(x=>normalize(x.query)));
  const stillUnmatched=observed.filter(query=>
    query.ownerSectionIndex===null &&
    !suggestedQuerySet.has(normalize(query.query)));
  if(observed.length>0 && !observed.some(q=>q.ownerSectionIndex!==null)){
    if(headingCandidates.length>0&&stillUnmatched.length===0)
      add("QUERY_BINDING_REVIEW_REQUIRED","REVIEW",
        "Real query already matches an existing source-backed H2, but signed queryNodeId ownership is missing.",
        "Confirm the existing H2 answer and re-bind its known queryNodeId in a new verified version of the planning artifact. Do not rewrite content just to repeat the exact phrase.",
        headingCandidates.map(x=>x.query+" → "+x.ownerHeading).join(" | "));
    else add("QUERY_TO_SECTION_BRIDGE_MISSING","BLOCK",
      "Real related queries exist but no verified section assignment covers them.",
      "Review actual H2 answers and bind same-page queries via a new verified blueprint; no fabricated assignments.");
  }
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
  if(stillUnmatched.length)add("OBSERVED_QUERIES_NOT_OWNED","REVIEW",
    "Some real same-page queries have neither signed H2 ownership nor a unique evidence-backed heading match.",
    "Review query intent, supporting evidence and page ownership before editing article content.",
    stillUnmatched.slice(0,6).map(q=>q.query).join(" | "));
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
  else if(!["PASS","READY"].includes(replay.replayStatus??"")){
    const warnings=Array.isArray(replay.warnings)?
      replay.warnings.filter((x):x is string=>typeof x==="string"):[];
    const missing=warnings.filter(x=>x.startsWith("SERP_REPLAY_MISSING_DATA:"));
    const other=warnings.filter(x=>
      !x.startsWith("SERP_REPLAY_MISSING_DATA:") &&
      !x.startsWith("SERP_REPLAY_PAIR_INSUFFICIENT:")
    );
    const replayBlockers=Array.isArray(replay.blockers)?replay.blockers:[];
    if(missing.length>0&&other.length===0&&replayBlockers.length===0)
      add("SERP_REPLAY_EVIDENCE_INCOMPLETE","REVIEW",
        "Replay WARN is caused by a competitor's missing source data, not a demonstrated page-quality failure.",
        "Review competitor URL, relevance and available evidence. Do not claim READY or pay for repeat research until the data gap is understood.",
        missing.map(x=>x.slice("SERP_REPLAY_MISSING_DATA:".length)).join(" | "));
    else
      add("SERP_REPLAY_WARN","REVIEW",
        "Competitive SERP Replay is not a clean pass.",
        "Inspect dimension-level competitor findings, blockers and missing source data before judging article quality.",
        [...warnings,...replayBlockers.map(x=>String(x))].slice(0,6).join(" | ")||
          (replay.replayStatus??"NULL"));
  }
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
      probableSpacingIssues:anomalies,possibleWordJoins},
    briefLexicalCoverage:usedBriefKeywords,
    observedSupportingQueries:observed.length,
    assignedSupportingQueries:observed.filter(q=>q.ownerSectionIndex!==null).length,
    existingH2MatchSuggestions:headingCandidates.length,
    suggestedQueryRebindings:headingCandidates,
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
