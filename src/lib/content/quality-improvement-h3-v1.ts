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
