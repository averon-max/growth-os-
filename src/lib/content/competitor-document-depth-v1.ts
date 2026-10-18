/**
 * OBSERVED_COMPETITOR_DOCUMENT_DEPTH_V1
 *
 * Read-only DOM measurements from a fetched competitor article. No model,
 * inference, provider metrics, content copying, or keyword-density targets.
 * Missing / inaccessible HTML must remain missing: do not synthesize data.
 */
import { load } from "cheerio";
import { isSubstantiveSerpHeadingV1 } from "./serp-competitor-page-quality-v1";

export interface ObservedCompetitorSectionDepthV1 {
  heading: string;
  level: 2 | 3;
  /** H2 includes its H3 sub-sections; H3 counts its own text only. */
  wordCount: number;
  exactQueryMentions: number;
}

export interface ObservedCompetitorBodyTermV1 {
  term: string;
  occurrences: number;
}

export interface ObservedCompetitorKeywordUsageV1 {
  query: string;
  title: number;
  h1: number;
  headings: number;
  mainContent: number;
}

export interface ObservedCompetitorDocumentDepthV1 {
  version: "OBSERVED_COMPETITOR_DOCUMENT_DEPTH_V1";
  extraction: "MAIN_ARTICLE" | "BODY_FALLBACK";
  wordCount: number;
  sections: ObservedCompetitorSectionDepthV1[];
  headingQuestions: string[];
  bodyTerms: ObservedCompetitorBodyTermV1[];
  keywordUsage: ObservedCompetitorKeywordUsageV1;
}

const STOP = new Set([
  "about","after","again","also","and","are","because","before","between","but",
  "can","could","does","each","for","from","had","has","have","how","into","its",
  "may","more","most","not","our","out","over","per","than","that","the","their",
  "them","there","these","they","this","those","through","use","using","was",
  "were","what","when","where","which","while","who","why","will","with",
  "would","you","your","here","get","learn","read","best","such","other",
]);
const normalize = (value: string) => value.toLocaleLowerCase("en-US")
  .normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu," ").trim().replace(/\s+/g," ");
const countWords = (value: string) =>
  (value.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? []).length;
const mentions = (text: string, phrase: string): number => {
  const source = normalize(text);
  const target = normalize(phrase);
  if (!source || !target) return 0;
  let found = 0, position = 0;
  const padded = " " + source + " ";
  const needle = " " + target + " ";
  while ((position = padded.indexOf(needle, position)) >= 0) {
    found++;
    position += needle.length - 1;
  }
  return found;
};
const clean = (value: string) => value.replace(/\s+/gu," ").trim();

/** Bounded literal phrases observed in body text, not search-volume estimates. */
function observedBodyTerms(blocks: readonly string[]): ObservedCompetitorBodyTermV1[] {
  const counts = new Map<string,number>();
  for (const block of blocks) {
    const tokens = (normalize(block).match(/[\p{L}\p{N}]+/gu) ?? []).slice(0,3000);
    for (let i=0; i<tokens.length; i++) {
      for (const length of [1,2,3]) {
        const words = tokens.slice(i,i+length);
        if (words.length!==length || words.some(w=>w.length<3 || STOP.has(w))) continue;
        const phrase=words.join(" ");
        if (phrase.length>85) continue;
        counts.set(phrase,(counts.get(phrase)??0)+1);
      }
    }
  }
  return [...counts.entries()]
    .filter(([term,count]) => count >= (term.includes(" ")?2:3))
    .sort((a,b) => b[1]-a[1] || b[0].split(" ").length-a[0].split(" ").length ||
      a[0].localeCompare(b[0]))
    .slice(0,35)
    .map(([term,occurrences])=>({term,occurrences}));
}

export function analyzeCompetitorDocumentDepthV1(
  html: string,
  query: string,
): ObservedCompetitorDocumentDepthV1 {
  const $ = load(html);
  const title=clean($("title").first().text());
  const h1=clean($("h1").first().text());
  // Restrict analysis to substantive article/main regions when available.
  $("script,style,noscript,svg,template,nav,footer,header,aside,[role='navigation']").remove();
  const regions=$("article,main,[role='main']").toArray().map(node=>$(node))
    .filter(region=>countWords(region.text())>=180)
    .sort((a,b)=>countWords(b.text())-countWords(a.text()));
  const region=regions[0]??$("body");
  const sections: ObservedCompetitorSectionDepthV1[]=[];
  const blocks: string[]=[];
  let currentH2: ObservedCompetitorSectionDepthV1|null=null;
  let currentH3: ObservedCompetitorSectionDepthV1|null=null;
  const nodes=region.find("h2,h3,p,li,blockquote,td,th").toArray();
  for (const node of nodes) {
    const element=$(node);
    const tag=(node as {tagName?:string}).tagName?.toLowerCase()??"";
    const text=clean(element.text());
    if (!text) continue;
    if (tag==="h2" || tag==="h3") {
      if (!isSubstantiveSerpHeadingV1(text)) continue;
      if (sections.length>=45) break;
      const level:2|3=tag==="h2"?2:3;
      const row:ObservedCompetitorSectionDepthV1={
        heading:text.slice(0,220),level,wordCount:0,exactQueryMentions:0,
      };
      sections.push(row);
      if(level===2){currentH2=row;currentH3=null;}else{currentH3=row;}
      continue;
    }
    // Nested <p> inside <li>, for example, must not be counted twice.
    if (element.parents("p,li,blockquote,td,th").length>0) continue;
    const words=countWords(text);
    blocks.push(text);
    if(currentH2) {
      currentH2.wordCount+=words;
      currentH2.exactQueryMentions+=mentions(text,query);
    }
    if(currentH3){
      currentH3.wordCount+=words;
      currentH3.exactQueryMentions+=mentions(text,query);
    }
  }
  const mainText=clean(region.text());
  return {
    version:"OBSERVED_COMPETITOR_DOCUMENT_DEPTH_V1",
    extraction:regions.length?"MAIN_ARTICLE":"BODY_FALLBACK",
    wordCount:countWords(mainText),
    sections,
    headingQuestions:sections.filter(s=>/\?\s*$/.test(s.heading)).map(s=>s.heading).slice(0,20),
    bodyTerms:observedBodyTerms(blocks),
    keywordUsage:{
      query,
      title:mentions(title,query),
      h1:mentions(h1,query),
      headings:sections.reduce((sum,s)=>sum+mentions(s.heading,query),0),
      mainContent:mentions(mainText,query),
    },
  };
}

/** Only independently observed usable pages contribute to corpus prevalence. */
export function aggregateObservedBodyTermsV1(
  pages: readonly {fetched:boolean;bodyTerms?:readonly ObservedCompetitorBodyTermV1[]}[],
): {term:string;pages:number;coveragePct:number;totalOccurrences:number}[] {
  const usable=pages.filter(p=>p.fetched && Array.isArray(p.bodyTerms));
  if (!usable.length) return [];
  const terms=new Map<string,{pages:number;totalOccurrences:number}>();
  for(const page of usable){
    const seen=new Set<string>();
    for(const row of page.bodyTerms??[]){
      if(!row.term || !Number.isFinite(row.occurrences) || row.occurrences<=0 ||
        seen.has(row.term)) continue;
      seen.add(row.term);
      const previous=terms.get(row.term)??{pages:0,totalOccurrences:0};
      terms.set(row.term,{pages:previous.pages+1,
        totalOccurrences:previous.totalOccurrences+row.occurrences});
    }
  }
  return [...terms.entries()].filter(([,v])=>v.pages>=2)
    .sort((a,b)=>b[1].pages-a[1].pages ||
      b[1].totalOccurrences-a[1].totalOccurrences || a[0].localeCompare(b[0]))
    .slice(0,40).map(([term,v])=>({term,pages:v.pages,
      coveragePct:Math.round(1000*v.pages/usable.length)/10,
      totalOccurrences:v.totalOccurrences}));
}
