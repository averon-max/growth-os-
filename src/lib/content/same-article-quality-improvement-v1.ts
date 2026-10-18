import {createHash} from "node:crypto";
import {join} from "node:path";
import {analyzeArticle,countExactPhrase} from "./article-analyzer";
import type {EditorialRepetitionFindingV1} from "./editorial-repetition-guard-v1";

/**
 * Reader-value revision planner for an existing IN_REVIEW article.
 * Bounded, deterministic, source-capacity-aware, zero I/O.
 *
 * A word target is a product editorial guideline, NOT a Google ranking
 * factor. This planner never licenses a new claim or an unassigned topic.
 * It selects existing evidence-rich sections for one verified local revision
 * each. If the archive cannot support enough incremental detail, fail
 * BEFORE model calls rather than fabricating keyword-rich filler.
 */
export interface ArticleImprovementSectionV1 {
  readonly index:number;
  readonly words:number;
  readonly maxWords:number;
  readonly claimCount:number;
  readonly evidenceCount:number;
  readonly h3Count:number;
}
export interface ArticleImprovementStepV1 {
  readonly index:number;
  readonly currentWords:number;
  readonly minWords:number;
  readonly preferredWords:number;
  readonly maxWords:number;
  readonly suggestUsefulH3:boolean;
}
export interface ArticleImprovementPlanV1 {
  readonly eligible:boolean;
  readonly reason:"NO_DEFICIT"|"ENOUGH_VERIFIED_CAPACITY"|
    "INSUFFICIENT_VERIFIED_DEPTH_CAPACITY";
  readonly currentWords:number;
  readonly minimumWords:number;
  readonly neededWords:number;
  readonly steps:readonly ArticleImprovementStepV1[];
  readonly headingOpportunityCount:number;
}
export function planSameArticleQualityImprovementV1({
  wordCount,minimumWords,sections,maxEdits=5,
}:{
  wordCount:number;
  minimumWords:number;
  sections:readonly ArticleImprovementSectionV1[];
  maxEdits?:number;
}):ArticleImprovementPlanV1{
  if(!Number.isInteger(wordCount)||wordCount<0||
    !Number.isInteger(minimumWords)||minimumWords<0||
    !Number.isInteger(maxEdits)||maxEdits<1||maxEdits>6)
    throw new Error("ARTICLE_IMPROVEMENT_PLAN_INVALID_BUDGET");
  const needed=Math.max(0,minimumWords-wordCount);
  const headingOpportunityCount=sections.filter(s=>
    s.claimCount>=2&&s.evidenceCount>=2&&s.words>=150).length;
  if(needed===0)return {
    eligible:false,reason:"NO_DEFICIT",currentWords:wordCount,
    minimumWords,neededWords:0,steps:[],headingOpportunityCount,
  };
  const usable=sections.filter(s=>
    Number.isInteger(s.index)&&s.index>=0&&
    Number.isFinite(s.words)&&s.words>=0&&
    Number.isFinite(s.maxWords)&&s.maxWords>s.words+20&&
    s.claimCount>=2&&s.evidenceCount>=2)
    .map(s=>({...s,capacity:Math.floor(s.maxWords-s.words)}))
    .sort((a,b)=>b.capacity-a.capacity||a.index-b.index)
    .slice(0,maxEdits);
  const totalCapacity=usable.reduce((v,s)=>v+s.capacity,0);
  // Reserve a little room for model variability; do not launch an
  // expensive rewrite when mathematically impossible under the plan.
  if(totalCapacity<needed+10)return {
    eligible:false,reason:"INSUFFICIENT_VERIFIED_DEPTH_CAPACITY",
    currentWords:wordCount,minimumWords,neededWords:needed,
    steps:[],headingOpportunityCount,
  };
  let remaining=needed+10;
  const steps:ArticleImprovementStepV1[]=[];
  for(let i=0;i<usable.length&&remaining>0;i++){
    const s=usable[i];
    const cap=s.capacity;
    const otherCapacity=usable.slice(i+1)
      .reduce((n,next)=>n+next.capacity,0);
    const allocation=Math.min(cap,
      Math.max(25,remaining-otherCapacity,Math.ceil(remaining/(usable.length-i))));
    const gain=Math.min(cap,allocation);
    steps.push({
      index:s.index,currentWords:s.words,
      minWords:Math.min(s.maxWords,s.words+gain),
      preferredWords:Math.min(s.maxWords,s.words+gain+10),
      maxWords:s.maxWords,
      suggestUsefulH3:s.claimCount>=2&&s.evidenceCount>=2&&s.words>=150,
    });
    remaining-=gain;
  }
  if(remaining>0)throw new Error("ARTICLE_IMPROVEMENT_ALLOCATION_FAILED");
  return {
    eligible:true,reason:"ENOUGH_VERIFIED_CAPACITY",currentWords:wordCount,
    minimumWords,neededWords:needed,steps,headingOpportunityCount,
  };
}

/**
 * The ONLY word count release criterion for a comprehensive ARTICLE.
 * Section-local word budgets are editorial allocations; they are NOT
 * independent acceptance gates for already source-verified H2 prose.
 */
export function evaluateWholeArticleQualityWordRangeV1({
  actualWords,minWords,maxWords,
}:{
  actualWords:number;minWords:number;maxWords:number;
}):{pass:boolean;reason:"OK"|"BELOW_ARTICLE_MIN"|"ABOVE_ARTICLE_MAX"}{
  if(![actualWords,minWords,maxWords].every(Number.isFinite)||
    minWords<0||maxWords<minWords||actualWords<0)
    throw new Error("QUALITY_GLOBAL_WORD_RANGE_INVALID");
  return actualWords<minWords
    ?{pass:false,reason:"BELOW_ARTICLE_MIN"}:
    actualWords>maxWords
    ?{pass:false,reason:"ABOVE_ARTICLE_MAX"}:
    {pass:true,reason:"OK"};
}

/* Consolidated quality-improvement-editorial-recovery-v1 rules. Existing functions preserved. */
/**
 * Change only a section that is already eligible for the signed
 * same-article quality revision. Never silently rewrite a section whose
 * claim/section authority has not been allocated by the current plan.
 */
export function selectQualityEditorialRepairSectionsV1({
  finding,plannedIndices,alreadyAttempted,
}:{
  finding:Readonly<EditorialRepetitionFindingV1>;
  plannedIndices:readonly number[];
  alreadyAttempted:readonly number[];
}):readonly number[]{
  const allowed=new Set(plannedIndices);
  const attempted=new Set(alreadyAttempted);
  return [...new Set([
    finding.sectionIndex,...finding.affectedSections,
  ])].filter(index=>Number.isInteger(index)&&index>=0&&
    allowed.has(index)&&!attempted.has(index));
}

/** The original high-precision detection result must DISAPPEAR, not merely
 * change phrase order. Never mark a still-repeating article as fixed. */
export function isQualityEditorialFindingResolvedV1({
  before,after,
}:{
  before:readonly EditorialRepetitionFindingV1[];
  after:readonly EditorialRepetitionFindingV1[];
}):boolean{
  return before.length>0 && after.length<before.length;
}

/* Consolidated quality-improvement-h3-v1 rules. Existing functions preserved. */
/** Recognizes genuine Markdown H3, never a literal escaped backslash. */
export function countQualityArticleH3V1(markdown:string):number{
  return (markdown.match(/^###\s+\S/gm)??[]).length;
}
export function eligibleForEvidenceBackedH3V1({
  bodyMarkdown,approvedClaimCount,verifiedEvidenceCount,
}:{
  bodyMarkdown:string;
  approvedClaimCount:number;
  verifiedEvidenceCount:number;
}):boolean{
  const substantiveParagraphs=bodyMarkdown.split(/\n\s*\n/)
    .filter(paragraph=>paragraph.trim().split(/\s+/).length>=36)
    .length;
  return approvedClaimCount>=2&&verifiedEvidenceCount>=2&&
    substantiveParagraphs>=2;
}

/* Consolidated quality-improvement-keyword-original-sentence-v1 rules. Existing functions preserved. */
/**
 * Non-generative keyword restoration from the original, source-reviewed
 * section. Restores a COMPLETE original sentence, never blindly inserts
 * a keyword into an unrelated claim or overwrites a factual qualifier.
 *
 * This only proposes text. Callers MUST pass full unchanged repetition,
 * structure, word-range, claim reconciliation, semantic verification and
 * publication gates before accepting even a single sentence.
 */
export function proposeOriginalSectionKeywordSentenceV1({
  originalBody,currentBody,missingKeyword,
}:{
  originalBody:string;
  currentBody:string;
  missingKeyword:string;
}):{bodyMarkdown:string;restoredSentence:string}|null{
  if(!missingKeyword.trim()||countExactPhrase(currentBody,missingKeyword)>0||
    countExactPhrase(originalBody,missingKeyword)===0)return null;
  const possibleSentences=originalBody
    .split(/\n\s*\n/u)
    .flatMap(block=>{
      if(/^\s{0,3}#{1,6}\s/u.test(block)||
        /^\s*[-*]\s/u.test(block))return [];
      return block.replace(/\n/g," ").split(
        /(?<=[.!?])\s+(?=[A-Z0-9“"'(\[])/u
      );
    })
    .map(sentence=>sentence.trim())
    .filter(sentence=>
      countExactPhrase(sentence,missingKeyword)>0 &&
      !/^[#*]|^https?:\/\//u.test(sentence) &&
      sentence.split(/\s+/u).length>=7 &&
      sentence.split(/\s+/u).length<=70 &&
      sentence.length<700)
    .sort((a,b)=>a.length-b.length);
  if(possibleSentences.length===0)return null;
  const sentence=possibleSentences[0];
  if(currentBody.includes(sentence))return null;
  const topical=new Set(missingKeyword.toLowerCase().split(/\s+/u)
    .filter(t=>t.length>3));
  const blocks=currentBody.split(/(\n\s*\n)/u);
  let best=-1,bestScore=-1;
  for(let i=0;i<blocks.length;i+=2){
    const block=blocks[i].trim();
    if(/^\s{0,3}#{1,6}\s/u.test(block)||
      /^\s*[-*]\s/u.test(block)||
      block.split(/\s+/u).length<8)continue;
    const normalized=block.toLowerCase();
    const score=[...topical].filter(t=>normalized.includes(t)).length+
      (/\bfree\b|\bno-cost\b|\bpricing\b|\bcost\b/iu.test(block)?2:0);
    if(score>bestScore){best=i;bestScore=score;}
  }
  if(best<0||bestScore<=0)return null;
  // Insert a paragraph near the closest relevant answer; do not touch
  // any heading, verified claim or adjacent prose.
  blocks[best]=blocks[best].trimEnd()+"\n\n"+sentence;
  const bodyMarkdown=blocks.join("").trim();
  return countExactPhrase(bodyMarkdown,missingKeyword)>0
    ?{bodyMarkdown,restoredSentence:sentence}:null;
}

/* Consolidated quality-improvement-keyword-recovery-v1 rules. Existing functions preserved. */
export interface QualityKeywordShapeV1{
  title:string;metaDescription:string;h1:string;bodyMarkdown:string;
}
export interface QualityKeywordLossV1 {
  keyword:string;
  role:"PRIMARY"|"SECONDARY";
  originalBodyMentions:number;
  currentBodyMentions:number;
  originalOwningSections:readonly number[];
  repairableOwningSections:readonly number[];
}
export function inspectQualityKeywordRegressionV1({
  original,current,primaryKeyword,secondaryKeywords,
  originalSectionBodies,editableSectionIndices,
}:{
  original:Readonly<QualityKeywordShapeV1>;
  current:Readonly<QualityKeywordShapeV1>;
  primaryKeyword:string;
  secondaryKeywords:readonly string[];
  originalSectionBodies:readonly string[];
  editableSectionIndices:readonly number[];
}):{
  originalUsed:number;
  currentUsed:number;
  losses:readonly QualityKeywordLossV1[];
  restored:boolean;
}{
  const inputs={primaryKeyword,secondaryKeywords:[...secondaryKeywords]};
  const earlier=analyzeArticle({...original,...inputs}).keywordCoverage;
  const later=analyzeArticle({...current,...inputs}).keywordCoverage;
  const editable=new Set(editableSectionIndices);
  const losses=earlier.items.flatMap(item=>{
    if(!item.used||later.items.some(after=>
      after.keyword===item.keyword&&after.used))return [];
    const owners=originalSectionBodies.flatMap((body,index)=>
      countExactPhrase(body,item.keyword)>0?[index]:[]);
    return [{
      keyword:item.keyword,
      role:item.role,
      originalBodyMentions:item.bodyMentions,
      currentBodyMentions:later.items.find(x=>
        x.keyword===item.keyword)?.bodyMentions??0,
      originalOwningSections:owners,
      repairableOwningSections:owners.filter(i=>editable.has(i)),
    }];
  });
  return {
    originalUsed:earlier.used,currentUsed:later.used,losses,
    restored:losses.length===0 && later.used>=earlier.used &&
      later.missing<=earlier.missing,
  };
}
export function selectQualityKeywordRepairSectionV1(
  losses:readonly QualityKeywordLossV1[],
  alreadyAttempted:readonly number[],
):number|null{
  const attempted=new Set(alreadyAttempted);
  const candidates=new Map<number,number>();
  for(const loss of losses)for(const idx of loss.repairableOwningSections){
    if(attempted.has(idx))continue;
    candidates.set(idx,(candidates.get(idx)??0)+1);
  }
  return [...candidates].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0]?.[0]??null;
}

/* Consolidated quality-improvement-post-editorial-depth-v1 rules. Existing functions preserved. */
/**
 * A verified deduplication may remove genuine boilerplate and leave the
 * comprehensive guide just under its product editorial word floor.
 * Recover reader value without restoring copied prose or inventing claims.
 * Deterministic selection only, no I/O or paid calls.
 */
export interface QualityDepthTargetV1 {
  readonly index:number;
  readonly currentSectionWords:number;
  readonly targetSectionWords:number;
  readonly desiredAdditionalWords:number;
  readonly verifiedClaims:number;
  readonly assignedEvidence:number;
}
export function planPostEditorialDepthRecoveryV1({
  articleWords,minArticleWords,maxArticleWords,sections,
  maxAttempts=2,
}:{
  articleWords:number;minArticleWords:number;maxArticleWords:number;
  sections:readonly {
    index:number;
    sectionWords:number;
    verifiedClaims:number;
    assignedEvidence:number;
  }[];
  maxAttempts?:number;
}):readonly QualityDepthTargetV1[]{
  if(![articleWords,minArticleWords,maxArticleWords,maxAttempts].every(
    Number.isInteger)||articleWords<0||minArticleWords<0||
    maxArticleWords<minArticleWords||maxAttempts<1||maxAttempts>3)
    throw new Error("POST_EDITORIAL_DEPTH_INVALID_CONSTRAINTS");
  if(articleWords>=minArticleWords)return [];
  const shortfall=minArticleWords-articleWords;
  // Extra room compensates for modest model variation; 0 keyword quota,
  // no required exact-match repetition. This is a bounded target, not a
  // license to add facts unsupported by assigned sources.
  const desiredAdditionalWords=Math.max(60,shortfall+24);
  if(desiredAdditionalWords>maxArticleWords-articleWords)return [];
  return [...sections]
    .filter(x=>Number.isInteger(x.index)&&x.index>=0&&
      Number.isInteger(x.sectionWords)&&x.sectionWords>=80&&
      x.verifiedClaims>=2&&x.assignedEvidence>=2)
    .sort((a,b)=>b.verifiedClaims-a.verifiedClaims||
      b.assignedEvidence-a.assignedEvidence||a.index-b.index)
    .slice(0,maxAttempts)
    .map(x=>({
      index:x.index,currentSectionWords:x.sectionWords,
      targetSectionWords:x.sectionWords+desiredAdditionalWords,
      desiredAdditionalWords,
      verifiedClaims:x.verifiedClaims,
      assignedEvidence:x.assignedEvidence,
    }));
}

/* Consolidated quality-improvement-progress-scope-v1 rules. Existing functions preserved. */
/**
 * A partial quality revision is NOT saved to the database. Its verified
 * section output may be reused only while the exact original Article
 * version, signed research snapshot, bound Writer contract, model and
 * progress policy remain identical. The canonical section progress
 * reader separately checks its SHA256 envelope.
 */
const VERSION="SAME_ARTICLE_QUALITY_PROGRESS_SCOPE_V1";
function digest(value:unknown):string{
  return createHash("sha256").update(JSON.stringify(value),"utf8")
    .digest("hex");
}
export function qualityImprovementProgressDirectoryV1({
  root,articleId,briefId,updatedAt,article,snapshot,contract,modelName,
}:{
  root:string;
  articleId:string;
  briefId:string;
  updatedAt:string;
  article:Readonly<{
    title:string;metaDescription:string;h1:string;bodyMarkdown:string;
  }>;
  snapshot:unknown;
  contract:unknown;
  modelName:string;
}):string{
  if(!/^[A-Za-z0-9_-]{5,100}$/.test(articleId)||
    !/^[A-Za-z0-9_-]{5,100}$/.test(briefId)||
    !modelName.trim()||!Number.isFinite(Date.parse(updatedAt)))
    throw new Error("QUALITY_PROGRESS_SCOPE_INVALID");
  const key=digest({
    version:VERSION,articleId,briefId,updatedAt,
    articleFingerprint:digest(article),
    evidenceFingerprint:digest(snapshot),
    boundContractFingerprint:digest(contract),
    modelName,
  });
  return join(root,"quality-improvement",key.slice(0,20));
}
/** Only originally assigned H2 sections may be revised. */
export function classifyVerifiedQualitySectionsV1({
  originalBodies,currentBodies,plannedIndices,
}:{
  originalBodies:readonly string[];
  currentBodies:readonly string[];
  plannedIndices:readonly number[];
}):Readonly<number[]>{
  if(originalBodies.length!==currentBodies.length)
    throw new Error("QUALITY_PROGRESS_SECTION_COUNT_DRIFT");
  const allowed=new Set(plannedIndices);
  const changed:number[]=[];
  for(let i=0;i<originalBodies.length;i++){
    if(originalBodies[i].trim()===currentBodies[i].trim())continue;
    if(!allowed.has(i))
      throw new Error("QUALITY_PROGRESS_UNPLANNED_SECTION_CHANGE:"+i);
    changed.push(i);
  }
  return changed;
}
