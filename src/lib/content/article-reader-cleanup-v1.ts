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
