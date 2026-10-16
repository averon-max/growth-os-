import {countExactPhrase} from "./article-analyzer";

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
      block.split(/\s+/u).length<12)continue;
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
