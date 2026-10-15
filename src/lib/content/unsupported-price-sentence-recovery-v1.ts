/**
 * Safe deterministic edit for a single price sentence rejected by the
 * REAL, unchanged EXTERNAL_PRICE_REQUIRES_EVIDENCE publication gate.
 * An unsupported price is NEVER authorized by the edit.
 * Caller MUST semantic-verify new prose and replay all content gates.
 */
export const PRICE_NEUTRAL_COMPARISON_QUESTION_V1 =
  "Which credit reports does the plan monitor, what changes trigger alerts, how will you receive alerts, and where can you review its current terms before choosing a service?";

type Input={
  bodyMarkdown:string;
  sentence:string;
  requiredClaimTexts?:readonly string[];
  plannedKeywords?:readonly string[];
  sectionMinWords?:number;
};
export interface UnsupportedPriceRemovalInspectionV1{
  readonly reason:string;
  readonly supported:boolean;
  readonly method:"DELETE"|"NEUTRAL_QUESTION"|"NONE";
  readonly bodyMarkdown:string|null;
  readonly previousWords:number;
  readonly resultingWords:number|null;
  readonly minWords:number|null;
}
function countWords(body:string):number{
  return (body.replace(/\x60{3}[\s\S]*?\x60{3}/g," ")
    .replace(/\x60([^\x60]+)\x60/g,"$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g," ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g,"$1")
    .replace(/^#{1,6}\s+/gm,"")
    .replace(/<[^>]+>/g," ")
    .match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu)??[]).length;
}
function normalize(s:string):string{
  return s.toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu," ").trim();
}
export function inspectUnsupportedPriceSentenceRemovalV1({
  bodyMarkdown,sentence,requiredClaimTexts=[],plannedKeywords=[],
  sectionMinWords,
}:Input):UnsupportedPriceRemovalInspectionV1{
  const before=countWords(bodyMarkdown);
  const floor=sectionMinWords??null;
  const fail=(reason:string,after:number|null=null):UnsupportedPriceRemovalInspectionV1=>({
    reason,supported:false,method:"NONE",bodyMarkdown:null,
    previousWords:before,resultingWords:after,minWords:floor,
  });
  const target=sentence.trim();
  if(!target||target.length<35||target.length>350||
    !/\$\s*\d+(?:\.\d+)?/.test(target)||
    !/\b(?:cost|price|per month|monthly|subscription|fee)\b/i.test(target))
    return fail("INVALID_PRICE_SENTENCE");
  const start=bodyMarkdown.indexOf(target);
  if(start<0)return fail("PRICE_SENTENCE_NOT_FOUND");
  if(bodyMarkdown.indexOf(target,start+target.length)>=0)
    return fail("PRICE_SENTENCE_AMBIGUOUS");
  const lineStart=bodyMarkdown.lastIndexOf("\n",start)+1;
  const lineEnd=bodyMarkdown.indexOf("\n",start);
  const line=bodyMarkdown.slice(lineStart,
    lineEnd<0?bodyMarkdown.length:lineEnd);
  if(/^\s*(?:#{1,6}\s|>|[-*+]\s|\d+[.)]\s|\x60{3}|~~~)/.test(line)||
    /\x60|\[[^\]]*]\([^)]*\)/.test(target))
    return fail("PRICE_SENTENCE_PROTECTED_MARKDOWN");
  const normalTarget=normalize(target);
  if(requiredClaimTexts.some(claim=>{
    const c=normalize(claim);
    const numbers=c.match(/\b\d+(?: \d+)*\b/g)??[];
    return c.length>=30&&(
      normalTarget.includes(c)||
      (numbers.length>0&&
        numbers.every(n=>normalTarget.includes(n))&&
        c.split(" ").filter(w=>w.length>4&&normalTarget.includes(w)).length>=3)
    );
  }))return fail("PRICE_IS_REQUIRED_SOURCE_BACKED_CLAIM");
  const build=(replacement:string)=>
    (bodyMarkdown.slice(0,start)+replacement+
      bodyMarkdown.slice(start+target.length))
      .replace(/[ \t]{2,}/g," ")
      .replace(/[ \t]+(?=\n)/g,"")
      .replace(/\n{3,}/g,"\n\n").trim();
  const headers=(body:string)=>body.split("\n")
    .filter(x=>/^\s*#{1,6}\s/.test(x));
  const keywordCount=(body:string,keyword:string)=>{
    const token=keyword.trim().toLocaleLowerCase("en-US");
    return token?body.toLocaleLowerCase("en-US").split(token).length-1:0;
  };
  const validate=(text:string):string=>{
    if(!text||text===bodyMarkdown||
      text.length>bodyMarkdown.length+100)
      return "PRICE_EDIT_NOT_BOUNDED";
    if(JSON.stringify(headers(text))!==JSON.stringify(headers(bodyMarkdown)))
      return "PRICE_EDIT_HEADING_CHANGED";
    if(plannedKeywords.some(keyword=>
      keywordCount(bodyMarkdown,keyword)>0&&keywordCount(text,keyword)===0))
      return "PRICE_EDIT_LOST_PLANNED_KEYWORD";
    const words=countWords(text);
    if(sectionMinWords!==undefined&&words<sectionMinWords)
      return "PRICE_EDIT_BELOW_SECTION_MIN_WORDS";
    if(words<90)return "PRICE_EDIT_SECTION_TOO_SHORT";
    if(before-words>55)return "PRICE_EDIT_TOO_MUCH_PROSE_REMOVED";
    return "OK";
  };
  const deleted=build("");
  let reason=validate(deleted);
  if(reason==="OK")return {
    reason:"OK",supported:true,method:"DELETE",bodyMarkdown:deleted,
    previousWords:before,resultingWords:countWords(deleted),minWords:floor,
  };
  if(reason!=="PRICE_EDIT_BELOW_SECTION_MIN_WORDS")
    return fail(reason,countWords(deleted));
  // Single neutral question: it contains NO fact about price, cost,
  // number of bureaus, promised feature, or provider performance.
  // It is still subject to fresh claim verification and full policy.
  const neutral=build(PRICE_NEUTRAL_COMPARISON_QUESTION_V1);
  reason=validate(neutral);
  if(reason!=="OK")return fail("PRICE_NEUTRAL_REPLACEMENT_UNSAFE:"+reason,
    countWords(neutral));
  return {
    reason:"OK",supported:true,method:"NEUTRAL_QUESTION",
    bodyMarkdown:neutral,previousWords:before,
    resultingWords:countWords(neutral),minWords:floor,
  };
}
export function removeUnsupportedPriceSentenceV1(input:Input):string|null{
  return inspectUnsupportedPriceSentenceRemovalV1(input).bodyMarkdown;
}
