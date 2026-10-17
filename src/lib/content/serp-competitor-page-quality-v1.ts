/**
 * An HTTP 200 page is not necessarily readable article content.
 * Cloudflare challenges, empty shells and bot-denials MUST NOT become
 * competitor content, ranking benchmarks or heading intelligence.
 * A conservative observation filter, not a factual quality judgment.
 */
export interface ObservedCompetitorPageV1 {
  fetched:boolean;
  statusCode?:number|null;
  title:string|null;
  h1:string|null;
  wordCount:number|null;
  h2?:readonly string[];
  h3?:readonly string[];
  error:string|null;
}
const challengeTitle=/^(?:attention required!?|just a moment(?:\.{3})?|access denied|403 forbidden|404 not found|service unavailable|captcha|robot check|reddit)$/iu;
const challengeHeadline=/(?:sorry,? you have been blocked|checking your browser|verify you are human|you are unable to access|access to this page has been denied|please enable javascript and cookies to continue|one more step|unusual traffic from your computer network|complete the security check)/iu;
export function assessSerpCompetitorPageQualityV1(page:ObservedCompetitorPageV1){
  const reasons:string[]=[];
  if(!page.fetched) reasons.push("NOT_FETCHED");
  if(page.error) reasons.push("FETCH_OR_ANALYSIS_ERROR");
  if(typeof page.statusCode==="number" &&
    (page.statusCode<200||page.statusCode>=300))
    reasons.push("NON_SUCCESS_HTTP_STATUS");
  const title=page.title?.trim()??"";
  const h1=page.h1?.trim()??"";
  if(challengeTitle.test(title)||challengeTitle.test(h1)||
    challengeHeadline.test(h1)||challengeHeadline.test(title))
    reasons.push("CHALLENGE_OR_ERROR_PAGE");
  if(!title&&!h1)reasons.push("ARTICLE_IDENTITY_MISSING");
  // A 46/123-word page is not a reliable competitor-content observation.
  if(page.wordCount===null||page.wordCount<200)
    reasons.push("NO_SUBSTANTIVE_BODY");
  return {usable:reasons.length===0,reasons};
}
export function isSubstantiveSerpHeadingV1(heading:string):boolean {
  const value=heading.trim().toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu," ").trim();
  if(value.length<4)return false;
  return !/^(?:about(?: us)?|bank|borrow|menu|contact(?: us)?|products?|services?|resources?|company|learn|legal disclaimer|disclosures?(?: and information)?|share(?: article| this content)?|page footer|recent posts|faqs?|get our app|our experts|our picks|categories|featured|related articles?|more credit resources|notable links|search for your question|browse related questions|subscribe|sign in|log in|privacy policy|terms(?: of service)?|follow us|tools?(?: and resources)?|credit education|important links)$/iu.test(value);
}
