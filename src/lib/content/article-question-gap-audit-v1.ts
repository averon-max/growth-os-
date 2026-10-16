/**
 * Editorial QUESTION-TO-ARTICLE GAP PREVIEW. No keyword stuffing.
 *
 * Does NOT claim a question has been answered just because an H2 or
 * paragraph contains similar tokens. Returns a REVIEW lead with the
 * actual existing passage, external-evidence count and known query volume.
 * Only saved article bytes and paid/cache-origin keywords are inspected.
 */
import type {ArticleQuestionFamilyV2}
  from "../keywords/article-question-scope-v2";

export interface ArticleQuestionForGapV1{
  query:string;
  searchVolume:number|null;
  keywordDifficulty:number|null;
}
export interface ArticleQuestionGroupForGapV1{
  family:ArticleQuestionFamilyV2;
  questions:readonly ArticleQuestionForGapV1[];
  highestObservedSearchVolume:number|null;
}
export interface ArticleQuestionSourceForGapV1{
  sectionIndex:number;
  heading:string;
  verifiedExternalSources:number;
  sourceUrls:readonly string[];
}
export interface ArticleQuestionGapCandidateV1{
  sectionIndex:number;
  h2:string;
  headingSignal:boolean;
  bodySignal:boolean;
  evidenceUrlCount:number;
  evidenceUrls:readonly string[];
  representativePassage:string|null;
  reviewStatus:"POSSIBLE_ANSWER_NEEDS_REVIEW"|
    "TOPIC_HINT_ONLY_NEEDS_REVIEW";
}
export interface ArticleQuestionGapReportV1{
  family:ArticleQuestionFamilyV2;
  queryCount:number;
  highestObservedSearchVolume:number|null;
  representativeQuestions:readonly ArticleQuestionForGapV1[];
  action:"REVIEW_EXISTING_SECTION"|"REVIEW_CONTENT_GAP";
  candidateExistingSections:readonly ArticleQuestionGapCandidateV1[];
  nextAction:string;
}
const familyPatterns:Record<ArticleQuestionFamilyV2,{
  heading:RegExp;body:RegExp;
}>={
  DEFINITION:{
    heading:/\b(?:what is|definition|overview|basics|understand|meaning|explained)\b/iu,
    body:/\b(?:credit monitoring is|credit monitoring means|service monitors|monitoring services?)\b/iu,
  },
  OPERATION_AND_ALERTS:{
    heading:/\b(?:how|work|alert|monitor|notification)\b/iu,
    body:/\b(?:alert|notification|detect|monitor|report changes|changes to)\b/iu,
  },
  COST:{
    heading:/\b(?:cost|price|fee|plan|paid|free)\b/iu,
    body:/\b(?:cost|price|per month|monthly|subscription|pay|fee|free)\b/iu,
  },
  VALUE_AND_NECESSITY:{
    heading:/\b(?:worth|need|benefit|who|choose|should|value|limit)\b/iu,
    body:/\b(?:worth|need|benefit|value|may help|useful|risk|cost|consider)\b/iu,
  },
  WHO_NEEDS_IT:{
    heading:/\b(?:need|benefit|who|why|should|choose)\b/iu,
    body:/\b(?:need|benefit|identity theft|useful|if you|risk)\b/iu,
  },
  FREE_AND_PAID:{
    heading:/\b(?:free|paid|cost|price|plan)\b/iu,
    body:/\b(?:free credit monitoring|free service|without cost|paid|subscription)\b/iu,
  },
  CREDIT_SCORE_RELATION:{
    heading:/\b(?:credit score|credit scores|hard inquiry|soft inquiry)\b/iu,
    body:/\b(?:credit score|soft inquiry|hard inquiry|credit scores)\b/iu,
  },
  FREEZE_AND_PROTECTION:{
    heading:/\b(?:freeze|identity theft|prevent|protect|limit)\b/iu,
    body:/\b(?:credit freeze|security freeze|frozen|freeze|prevent fraud)\b/iu,
  },
  ACTIVATION_AND_ACCESS:{
    heading:/\b(?:sign up|enroll|activate|already|have|access|check)\b/iu,
    body:/\b(?:enroll|signed up|account|already|activate|whether you have)\b/iu,
  },
  LIMITS_AND_BENEFITS:{
    heading:/\b(?:limit|benefit|prevent|protect)\b/iu,
    body:/\b(?:limitation|benefit|cannot prevent|does not prevent|may not detect)\b/iu,
  },
  MISCELLANEOUS:{heading:/^$/u,body:/^$/u},
};
function articleH2s(body:string){
  const matches=[...body.matchAll(/^## (?!#)([^\n]+)/gm)];
  return matches.map((m,i)=>({
    sectionIndex:i,
    heading:m[1].trim(),
    prose:body.slice(m.index!+m[0].length,
      i+1<matches.length?matches[i+1].index:body.length)
      .replace(/^###\s+[^\n]+/gm,"")
      .replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").trim(),
  }));
}
function passageNearSignal(prose:string,re:RegExp):string|null{
  // Show real saved bytes; never infer text that wasn't in the article.
  const paragraphs=prose.split(/\n\s*\n/u).map(x=>x.trim())
    .filter(x=>x.length>30&&!/^\s*#{1,6}\s/u.test(x));
  const para=paragraphs.find(x=>re.test(x));
  if(!para)return null;
  return para.length<=300?para:para.slice(0,297).trimEnd()+"...";
}
export function auditExistingArticleQuestionGapsV1({
  bodyMarkdown,groups,sources,
}:{
  bodyMarkdown:string;
  groups:readonly ArticleQuestionGroupForGapV1[];
  sources:readonly ArticleQuestionSourceForGapV1[];
}):{
  h2Count:number;
  groups:readonly ArticleQuestionGapReportV1[];
  tentativeMatches:number;
  contentGapReviews:number;
  noAutomaticCoverageClaims:true;
}{
  const sections=articleH2s(bodyMarkdown);
  const output=groups.map(group=>{
    const pattern=familyPatterns[group.family];
    const candidates=sections.flatMap(section=>{
      const headingSignal=pattern.heading.test(section.heading);
      const bodySignal=pattern.body.test(section.prose);
      if(!headingSignal&&!bodySignal)return [];
      const source=sources.find(s=>s.sectionIndex===section.sectionIndex&&
        s.heading.trim().toLowerCase()===section.heading.toLowerCase());
      const item:ArticleQuestionGapCandidateV1={
        sectionIndex:section.sectionIndex,
        h2:section.heading,
        headingSignal,bodySignal,
        evidenceUrlCount:source?.verifiedExternalSources??0,
        evidenceUrls:(source?.sourceUrls??[]).slice(0,4),
        representativePassage:bodySignal?
          passageNearSignal(section.prose,pattern.body):null,
        reviewStatus:bodySignal&&headingSignal?
          "POSSIBLE_ANSWER_NEEDS_REVIEW":
          "TOPIC_HINT_ONLY_NEEDS_REVIEW",
      };
      return [item];
    }).sort((a,b)=>{
      const score=(x:ArticleQuestionGapCandidateV1)=>
        (x.headingSignal?4:0)+(x.bodySignal?2:0)+
        (x.evidenceUrlCount>0?1:0);
      return score(b)-score(a)||a.sectionIndex-b.sectionIndex;
    });
    const suggestion=candidates.slice(0,3);
    const action:ArticleQuestionGapReportV1["action"]=
      suggestion.some(x=>x.headingSignal&&x.bodySignal)?
      "REVIEW_EXISTING_SECTION":"REVIEW_CONTENT_GAP";
    const nextAction=action==="REVIEW_EXISTING_SECTION"?
      "Read the passage and its supporting evidence; mark ANSWERED only after direct-answer, limits and current-source verification. Do not insert another H2 solely for a keyword.":
      "Check actual prose and source support for the question; consider evidence-backed addition to an existing H2 or separate intent page, not automatic expansion.";
    return {
      family:group.family,queryCount:group.questions.length,
      highestObservedSearchVolume:group.highestObservedSearchVolume,
      representativeQuestions:[...group.questions]
        .sort((a,b)=>(b.searchVolume??-1)-(a.searchVolume??-1)||
          a.query.localeCompare(b.query)).slice(0,4),
      action,candidateExistingSections:suggestion,nextAction,
    };
  });
  return {
    h2Count:sections.length,
    groups:output,
    tentativeMatches:output.filter(x=>x.action==="REVIEW_EXISTING_SECTION").length,
    contentGapReviews:output.filter(x=>x.action==="REVIEW_CONTENT_GAP").length,
    noAutomaticCoverageClaims:true as const,
  };
}
