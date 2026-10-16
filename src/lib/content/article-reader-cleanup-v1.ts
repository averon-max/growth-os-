/**
 * Reader-ONLY presentation of saved Markdown: move explicit "Source:"
 * citations out of prose. Never edit DB, signed evidence or source URLs.
 * CMS publication still uses raw saved body and must pass separate gates.
 */
export type ReaderReferenceV1={label:string;url:string};
export function previewArticleWithoutInlineSourceLabelsV1(markdown:string){
  const references:ReaderReferenceV1[]=[];
  const seen=new Set<string>();
  const collect=(label:string,url:string)=>{
    const key=url.trim();
    if(!seen.has(key)){seen.add(key);references.push({label:label.trim(),url:key});}
    return "";
  };
  // [Source: consumer.ftc.gov](URL), including optional preceding "Source:"
  // or Source: [consumer.ftc.gov](URL); any ordinary contextual citations
  // without the explicit "Source:" label are left where written.
  const safeLines=markdown.split("\n").map(line=>{
    if(/^\s*#{1,6}\s/.test(line))return line;
    let revised=line.replace(
      /\[\s*Source:\s*([^\]]+)\]\((https?:\/\/[^)\s]+)\)/giu,
      (_,label:string,url:string)=>collect(label,url),
    );
    revised=revised.replace(
      /\bSource:\s*\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/giu,
      (_,label:string,url:string)=>collect(label,url),
    );
    return revised.replace(/[ \t]{2,}/g," ").replace(/[ \t]+$/g,"");
  });
  return {
    readerMarkdown:safeLines.join("\n"),
    researchLinks:references,
    originalUnchanged:true,
    savedArticleFingerprintUnchanged:true,
    renderOnly:true,
  };
}


/**
 * Deterministic SAME-H2 citation-layout draft for the CANONICAL article.
 * Unlike render-only preview, this yields proposed Markdown, but does
 * NOT save it and does NOT certify that citations support each assertion.
 *
 * Preserves every original Markdown URL and section ownership. Moves
 * intrusive "[Source: publisher](URL)" references from running sentences
 * to an unobtrusive end-of-section reference row. Source-bearing links
 * already written as contextual text are left untouched.
 */
export function draftSavedArticleSectionReferenceLayoutV1(markdown:string){
  const headings=[...markdown.matchAll(/^##[ \t]+([^\n]+)/gm)];
  const urls=(part:string)=>[...part.matchAll(
    /\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/gu)].map(m=>m[1]!);
  const sectionStats:Array<{
    index:number;heading:string;originalUrlCount:number;
    proposedUrlCount:number;movedSourceLabels:number;
    originalUrlsPreserved:boolean;
  }>=[];
  let totalMoved=0;
  let proposed=markdown.slice(0,headings[0]?.index??markdown.length);
  for(let i=0;i<headings.length;i++){
    const heading=headings[i]!;
    const start=heading.index??0;
    const end=headings[i+1]?.index??markdown.length;
    const original=markdown.slice(start,end);
    const moved:Array<{label:string;url:string}>=[];
    const move=(label:string,url:string)=>{
      moved.push({label:label.trim().replace(/^\s*Source:\s*/iu,""),url});
      return "";
    };
    const sourceLink=/\[\s*Source:\s*([^\]]+)\]\((https?:\/\/[^)\s]+)\)/giu;
    const sourceColonLink=/\bSource:\s*\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/giu;
    let changed=original.replace(sourceLink,(_,label:string,url:string)=>
      move(label,url));
    changed=changed.replace(sourceColonLink,(_,label:string,url:string)=>
      move(label,url));
    // No new facts, no heading changes, and no URL changes. Preserve
    // punctuation and normalize whitespace only adjacent to removed links.
    changed=changed.replace(/[ \t]{2,}/gu," ")
      .replace(/[ \t]+([.,;:!?])/gu,"$1")
      .replace(/\n[ \t]*\n[ \t]*\n+/gu,"\n\n")
      .trimEnd();
    if(moved.length){
      const linked=moved.map((item,j)=>
        "["+(j+1)+". "+item.label+"]("+item.url+")").join(" · ");
      changed+="\n\n**References:** "+linked;
    }
    const before=urls(original),after=urls(changed);
    const originalUrlsPreserved=
      JSON.stringify([...before].sort())===JSON.stringify([...after].sort());
    sectionStats.push({
      index:i,heading:heading[1]!.trim(),
      originalUrlCount:before.length,proposedUrlCount:after.length,
      movedSourceLabels:moved.length,originalUrlsPreserved,
    });
    totalMoved+=moved.length;
    proposed+=changed+(i===headings.length-1?"":"\n\n");
  }
  const sourceLabelsStillInline=/\[\s*Source:[^\]]+\]\(https?:\/\/|Source:\s*\[[^\]]+\]\(https?:\/\//iu.test(proposed);
  return {
    version:"SAVED_ARTICLE_SECTION_REFERENCES_DRAFT_V1" as const,
    proposedBodyMarkdown:proposed,
    h2Count:headings.length,
    movedSourceLabels:totalMoved,
    sections:sectionStats,
    everyH2RetainsItsOwnUrls:sectionStats.every(x=>x.originalUrlsPreserved),
    sourceLabelsStillInline,
    changed:proposed!==markdown,
    safeToAutoCommit:false,
    semanticVerificationRequired:true,
    originalMarkdownUnchanged:true,
  };
}
