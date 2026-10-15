/**
 * Prune EXACTLY one unsupported external numeric price sentence.
 *
 * The sentence must already be rejected by unchanged Publication Policy
 * EXTERNAL_PRICE_REQUIRES_EVIDENCE. This does not authorize facts,
 * sources, new headings or any publication-policy exemption.
 */
export function removeUnsupportedPriceSentenceV1({
  bodyMarkdown,sentence,requiredClaimTexts=[],plannedKeywords=[],
  sectionMinWords,
}:{
  bodyMarkdown:string;
  sentence:string;
  requiredClaimTexts?:readonly string[];
  plannedKeywords?:readonly string[];
  sectionMinWords?:number;
}):string|null{
  const target=sentence.trim();
  if(!target||target.length<35||target.length>350||
    !/\$\s*\d+(?:\.\d+)?/.test(target)||
    !/\b(?:cost|price|per month|monthly|subscription|fee)\b/i.test(target))
    return null;
  // Exact rejected prose must appear once in BODY, not a heading/code.
  const start=bodyMarkdown.indexOf(target);
  if(start<0||bodyMarkdown.indexOf(target,start+target.length)>=0)
    return null;
  const beforeLine=bodyMarkdown.lastIndexOf("\n",start)+1;
  const afterLine=bodyMarkdown.indexOf("\n",start);
  const enclosingLine=bodyMarkdown.slice(beforeLine,
    afterLine<0?bodyMarkdown.length:afterLine);
  if(/^\s*(?:#{1,6}\s|>|[-*+]\s|\d+[.)]\s|\x60{3}|~~~)/.test(enclosingLine)||
    /\x60|\[[^\]]*]\([^)]*\)/.test(target))
    return null;
  const normalize=(s:string)=>s.toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu," ").trim();
  const targetNormalized=normalize(target);
  // A required price fact must be corrected source-first, not erased.
  if(requiredClaimTexts.some(claim=>{
    const c=normalize(claim);
    const numbers=c.match(/\b\d+(?: \d+)*\b/g)??[];
    return c.length>=30 && (
      targetNormalized.includes(c) ||
      (numbers.length>0 &&
       numbers.every(n=>targetNormalized.includes(n)) &&
       c.split(" ").filter(w=>w.length>4&&
         targetNormalized.includes(w)).length>=3)
    );
  }))return null;
  const candidate=(bodyMarkdown.slice(0,start)+
    bodyMarkdown.slice(start+target.length))
    .replace(/[ \t]{2,}/g," ")
    .replace(/[ \t]+(?=\n)/g,"")
    .replace(/\n{3,}/g,"\n\n").trim();
  if(!candidate||candidate===bodyMarkdown||
    candidate.length>bodyMarkdown.length ||
    /(^|\n)#{1,6}\s/.test(target))
    return null;
  const headings=(body:string)=>
    body.split("\n").filter(x=>/^\s*#{1,6}\s/.test(x));
  if(JSON.stringify(headings(candidate))!==JSON.stringify(headings(bodyMarkdown)))
    return null;
  const count=(body:string,keyword:string)=>{
    const corpus=body.toLocaleLowerCase("en-US");
    const phrase=keyword.trim().toLocaleLowerCase("en-US");
    return phrase?corpus.split(phrase).length-1:0;
  };
  // Preserve every already-present primary and secondary exact phrase.
  if(plannedKeywords.some(keyword=>
    count(bodyMarkdown,keyword)>0&&count(candidate,keyword)===0))
    return null;
  const wordCount=(body:string)=>(body.match(/[\p{L}\p{N}]+/gu)??[]).length;
  if(sectionMinWords!==undefined&&wordCount(candidate)<sectionMinWords)
    return null;
  if(wordCount(bodyMarkdown)-wordCount(candidate)>55||
    wordCount(candidate)<90)
    return null;
  return candidate;
}
