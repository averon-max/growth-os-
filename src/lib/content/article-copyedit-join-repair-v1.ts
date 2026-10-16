/**
 * Safe PREVIEW ONLY: propose literal spacing corrections observed in a
 * persisted credit-monitoring article, without changing facts/citations.
 *
 * This is NOT authorization to update the article: a changed body MUST
 * get a new SHA-bound SERP Replay before any "ready" claim. Never touch
 * source URLs, Markdown link labels, fenced/inline code or headings.
 */
import {inspectProseJoinAnomaliesV2} from "./article-search-readiness-v2";
export const OBSERVED_ARTICLE_JOIN_CORRECTIONS_V1=Object.freeze([
  ["creditcard","credit card"],
  ["thereview","the review"],
  ["informationyou","information you"],
  ["assumptionto","assumption to"],
  ["ofcoverage","of coverage"],
  ["whosecoverage","whose coverage"],
  ["toreview","to review"],
  ["toa","to a"],
] as const);
export function previewObservedArticleJoinCopyeditV1(bodyMarkdown:string){
  let fence=false;
  const counts=new Map<string,number>();
  const revised=bodyMarkdown.split("\n").map(line=>{
    if(/^\s*(?:\x60{3,}|~{3,})/.test(line)){
      fence=!fence;return line;
    }
    if(fence||/^\s{0,3}#{1,6}\s/.test(line)||
      /^\s{4,}\S/.test(line))return line;
    const chunks=line.split(
      /(\x60+[^\\x60\n]*\x60+|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)]+)/gu
    );
    return chunks.map((chunk,i)=>{
      if(i%2===1)return chunk;
      let text=chunk;
      for(const [bad,good] of OBSERVED_ARTICLE_JOIN_CORRECTIONS_V1){
        const re=new RegExp("\\b"+bad+"\\b","giu");
        text=text.replace(re,()=>{
          counts.set(bad,(counts.get(bad)??0)+1);
          return good;
        });
      }
      return text;
    }).join("");
  }).join("\n");
  const changes=OBSERVED_ARTICLE_JOIN_CORRECTIONS_V1.flatMap(
    ([before,after])=>counts.has(before)?[{
      before,after,occurrences:counts.get(before)!,
    }]:[]
  );
  return {
    proposedBodyMarkdown:revised,
    changes,
    changedCharacters:revised.length-bodyMarkdown.length,
    originalBodyUnchanged:true,
    remainingKnownProseDefects:inspectProseJoinAnomaliesV2(revised),
    autoCommitAllowed:false,
    freshReplayNeededIfApplied:revised!==bodyMarkdown,
  };
}