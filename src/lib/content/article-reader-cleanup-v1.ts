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


/**
 * FREE exact-current-article editorial draft. Add headings ONLY at two
 * literal existing paragraph boundaries already proved by source-backed
 * prose, delete ONE known circular justification, and relocate Source
 * labels inside the SAME signed H2 section. No new facts or keywords.
 *
 * Strict failure (no partial edit) if paragraph targets drift. The caller
 * must independently re-evaluate source ownership, article completeness,
 * semantic substance, approval fingerprint and Replay before persistence.
 */
export function draftCreditMonitoringExistingEditorialV1(markdown:string){
  const refs=draftSavedArticleSectionReferenceLayoutV1(markdown);
  const text=refs.proposedBodyMarkdown;
  const hits=[...text.matchAll(/^##[ \t]+([^\n]+)/gm)];
  const prefix=text.slice(0,hits[0]?.index??text.length);
  const sections=hits.map((hit,i)=>
    text.slice(hit.index??0,hits[i+1]?.index??text.length));
  if(sections.length!==6||
    hits[1]?.[1]?.trim()!=="How does credit monitoring work?"||
    hits[5]?.[1]?.trim()!=="What should you do after a credit monitoring alert?"){
    return {eligible:false as const,reason:"CANONICAL_SECTION_STRUCTURE_DRIFT",
      draftBodyMarkdown:null,originalArticleUnchanged:true,
      paidCalls:0,autoCommit:false};
  }
  const preciseAnchors=[
    {start:"The process has three basic parts:",
     h3:"How enrollment, monitoring and alerts fit together"},
    {start:"Score access is related but distinct.",
     h3:"How credit monitoring differs from credit score access"},
  ];
  let expanded=sections[1]!;
  let added=0;
  for(const target of preciseAnchors){
    const literal="\n\n"+target.start;
    const found=expanded.split(literal).length-1;
    if(found!==1){
      return {eligible:false as const,
        reason:"EVIDENCE_BACKED_PARAGRAPH_ANCHOR_MISSING_OR_AMBIGUOUS",
        draftBodyMarkdown:null,originalArticleUnchanged:true,
        paidCalls:0,autoCommit:false};
    }
    expanded=expanded.replace(literal,
      "\n\n### "+target.h3+"\n\n"+target.start);
    added+=1;
  }
  const final=sections[5]!;
  const vague=/That creates a clear basis for describing the issue to both parties and for distinguishing the disputed information from details that are correct or still unclear\./giu;
  const found=[...final.matchAll(vague)].length;
  if(found!==1){
    return {eligible:false as const,
      reason:"KNOWN_CIRCULAR_JUSTIFICATION_CHANGED",
      draftBodyMarkdown:null,originalArticleUnchanged:true,
      paidCalls:0,autoCommit:false};
  }
  const cleaned=final.replace(vague,"")
    .replace(/[ \t]{2,}/gu," ").replace(/[ \t]+\n/gu,"\n");
  const rebuilt=prefix+sections.map((part,i)=>
    i===1?expanded:i===5?cleaned:part).join("");
  const h3Before=(markdown.match(/^###\s+\S/gm)??[]).length;
  const h3After=(rebuilt.match(/^###\s+\S/gm)??[]).length;
  const sourceUrls=(v:string)=>[...v.matchAll(
    /\[[^\]]+\]\((https?:\/\/[^)\s]+)\)/gu)].map(x=>x[1]!);
  const originalUrls=sourceUrls(markdown).sort();
  const finalUrls=sourceUrls(rebuilt).sort();
  const canonicalProse=(v:string)=>v
    .replace(/^### (?:How enrollment, monitoring and alerts fit together|How credit monitoring differs from credit score access)$/gmu,"")
    .replace(/^\*\*References:\*\*[^\n]*$/gmu,"")
    .replace(/\[\s*Source:\s*[^\]]+\]\(https?:\/\/[^)\s]+\)/giu,"")
    .replace(/\bSource:\s*\[[^\]]+\]\(https?:\/\/[^)\s]+\)/giu,"")
    .replace(vague,"")
    .replace(/[ \t]+([.,;:!?])/gu,"$1")
    .replace(/\s+/gu," ").trim();
  const factualProseOtherwiseUnchanged=
    canonicalProse(markdown)===canonicalProse(rebuilt);
  return {
    eligible:true as const,
    version:"CREDIT_MONITORING_EXISTING_EDITORIAL_DRAFT_V1" as const,
    draftBodyMarkdown:rebuilt,
    sourceLabelsRelocated:refs.movedSourceLabels,
    linkMultisetPreserved:JSON.stringify(originalUrls)===
      JSON.stringify(finalUrls),
    linksStillInOriginalH2:refs.everyH2RetainsItsOwnUrls,
    factualProseOtherwiseUnchanged,
    h2Count:sections.length,
    addedFactualClaims:0,
    addedNewResearchQueries:0,
    addedMeaningfulH3:added,
    h3Before,h3After,
    removedKnownCircularSentence:found,
    originalArticleUnchanged:true,
    requiresNewFingerprintAndReplay:true,
    requiresSemanticAndHumanReview:true,
    paidCalls:0,
    autoCommit:false,
  };
}
