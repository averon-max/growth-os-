/**
 * Source-bounded editorial scanner. It flags conservative, high-confidence
 * non-actionable filler and source-label interruptions, not all cautions.
 * Does not invent new material, remove citations, or change Markdown.
 */
export type InformationGainFindingV1={
  code:"NON_ACTIONABLE_JUSTIFICATION"|"SOURCE_LABEL_IN_PROSE";
  sectionIndex:number;
  sectionHeading:string;
  excerpt:string;
  recommendation:string;
  severity:"BLOCK";
};
const clean=(s:string)=>s.replace(/\s+/g," ").trim();
const vague=[
  /\bthat creates (?:a|an|the) (?:clear|solid|useful|strong) (?:basis|foundation)\b/i,
  /\bthis (?:provides|creates|offers) (?:a|an|the) (?:clear|useful|solid) (?:basis|foundation)\b/i,
];
export function detectArticleInformationGainDefectsV1(markdown:string):InformationGainFindingV1[]{
  const heads=[...markdown.matchAll(/^##\s+([^\n]+)/gm)];
  const results:InformationGainFindingV1[]=[];
  heads.forEach((h,index)=>{
    const end=heads[index+1]?.index??markdown.length;
    const block=markdown.slice(h.index??0,end);
    const paragraphs=block.split(/\n\s*\n+/).slice(1);
    for(const paragraph of paragraphs){
      if(/^\s*#{1,6}\s/m.test(paragraph))continue;
      const plain=clean(paragraph.replace(/\[[^\]]+\]\(https?:\/\/[^)]+\)/g," "));
      if(vague.some(re=>re.test(plain)))
        results.push({
          code:"NON_ACTIONABLE_JUSTIFICATION",
          sectionIndex:index,sectionHeading:h[1]!.trim(),
          excerpt:plain.slice(0,260),
          recommendation:"Remove circular justification. Explain only new verified actions, distinctions, conditions or limits needed by this reader; do not pad word count.",
          severity:"BLOCK",
        });
      if(/\bsource\s*:\s*(?:\[[^\]]+\]\(https?:\/\/[^)]+\)|(?:https?:\/\/|[a-z][\w.-]+\.(?:gov|org|com)))/i.test(paragraph))
        results.push({
          code:"SOURCE_LABEL_IN_PROSE",
          sectionIndex:index,sectionHeading:h[1]!.trim(),
          excerpt:clean(paragraph).slice(0,260),
          recommendation:"Move original source links outside running prose to unobtrusive references, preserve all signed citation evidence and URLs.",
          severity:"BLOCK",
        });
    }
  });
  return results;
}
export class ArticleInformationGainGateErrorV1 extends Error{
  readonly code="ARTICLE_INFORMATION_GAIN_REVIEW_REQUIRED" as const;
  constructor(readonly findings:readonly InformationGainFindingV1[]){
    super("Non-actionable filler or source labels interrupt the reader's article.");
    this.name="ArticleInformationGainGateErrorV1";
  }
}
export function assertArticleInformationGainV1(markdown:string):void{
  const findings=detectArticleInformationGainDefectsV1(markdown);
  if(findings.length)throw new ArticleInformationGainGateErrorV1(findings);
}
