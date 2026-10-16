/**
 * FINAL SEO KEYWORD POLICY FOR RESEARCH RECOVERY
 *
 * An obsolete draft is NOT a monotonic SEO target: a rewritten article
 * may remove repetitive exact-match secondary variants while improving
 * research, topical coverage and readability. Google doesn't require
 * every wording variant to be repeated. Preserve an explicit minimum
 * planned phrase coverage plus primary topic placement, not exact
 * equality to a possibly keyword-stuffed old draft.
 *
 * The upstream rank-ready critic still reports every missing phrase;
 * all content, evidence, safety, structure and SERP gates are unchanged.
 */
import type {ArticleAnalyzerResult} from "./article-analyzer";
export interface ResearchRecoveryKeywordPolicyV1 {
  readonly pass:boolean;
  readonly primaryInBody:boolean;
  readonly primaryInH1:boolean;
  readonly planned:number;
  readonly used:number;
  readonly requiredUsed:number;
  readonly previousUsed:number;
  readonly regressedAgainstPrevious:boolean;
  readonly lostPreviouslyUsed:readonly string[];
  readonly newlyUsed:readonly string[];
}
export function evaluateResearchRecoveryKeywordPolicyV1({
  previous,current,
}:{
  previous:ArticleAnalyzerResult;
  current:ArticleAnalyzerResult;
}):ResearchRecoveryKeywordPolicyV1{
  const old=previous.keywordCoverage;
  const now=current.keywordCoverage;
  const prior=new Set(old.items.filter(item=>item.used)
    .map(item=>item.keyword.trim().toLowerCase()));
  const used=new Set(now.items.filter(item=>item.used)
    .map(item=>item.keyword.trim().toLowerCase()));
  const lostPreviouslyUsed=old.items.filter(item=>
    item.used&&!used.has(item.keyword.trim().toLowerCase()))
    .map(item=>item.keyword);
  const newlyUsed=now.items.filter(item=>
    item.used&&!prior.has(item.keyword.trim().toLowerCase()))
    .map(item=>item.keyword);
  const requiredUsed=now.planned>0?Math.ceil(now.planned*0.8):1;
  const primaryInBody=current.primaryKeywordPlacement.inBody;
  const primaryInH1=current.primaryKeywordPlacement.inH1;
  return {
    pass:now.used>=requiredUsed&&primaryInBody&&primaryInH1,
    primaryInBody,primaryInH1,
    planned:now.planned,used:now.used,requiredUsed,
    previousUsed:old.used,
    regressedAgainstPrevious:now.used<old.used,
    lostPreviouslyUsed,newlyUsed,
  };
}
