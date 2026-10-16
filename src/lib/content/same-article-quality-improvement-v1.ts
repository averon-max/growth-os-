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
