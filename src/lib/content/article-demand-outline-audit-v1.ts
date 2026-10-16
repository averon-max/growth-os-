/**
 * READ-ONLY article demand and structural inventory.
 * Brief phrases are NOT all keywords, observed queries are NOT planned
 * keyword targets, and missing GSC data is NOT proof of bad content.
 */
import {countExactPhrase,countWords}
  from "./article-analyzer";
import type {MasterRuntimeSnapshotV1} from "./master-runtime-adapter";
const observedSources=new Set([
  "DATAFORSEO","GSC","GOOGLE_TRENDS","PAA",
  "RELATED_SEARCH","SERP_QUESTION","COMPETITOR_QUERY",
]);
const norm=(s:string)=>s.normalize("NFKC").toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu," ").replace(/\s+/gu," ").trim();
export function buildArticleDemandOutlineAuditV1(input:{
  title:string;h1:string;bodyMarkdown:string;
  primaryKeyword:string;secondaryKeywords:readonly string[];
  runtime:Readonly<MasterRuntimeSnapshotV1>|null;
  approvedNodeOwners?:Readonly<Record<string,number>>;
}){
  const body=input.bodyMarkdown;
  const corpus=[input.title,input.h1,body].join("\n");
  const briefValues=[input.primaryKeyword,...input.secondaryKeywords];
  const seen=new Set<string>();
  const briefPhrases=briefValues.flatMap((keyword,index)=>{
    const label=keyword.trim(),key=norm(label);
    if(!key||seen.has(key))return [];
    seen.add(key);
    return [{
      keyword:label,role:index===0?"PRIMARY" as const:"SECONDARY" as const,
      exactMentions:countExactPhrase(corpus,label),
    }];
  });
  // Use an H2-line iterator instead of arbitrary H3 quotas.
  const starts=[...body.matchAll(/^##\s+([^\n]+)/gm)];
  const sections=starts.map((m,index)=>{
    const from=m.index??0,to=index+1<starts.length?
      starts[index+1]!.index!:body.length;
    const sectionText=body.slice(from,to);
    const heading=m[1]!.trim();
    return {
      index,heading,
      words:countWords(sectionText),
      h3:[...sectionText.matchAll(/^###\s+([^\n]+)/gm)]
        .map(x=>x[1]!.trim()),
      visibleSourceLinks:(sectionText.match(
        /\[[^\]]+\]\(https?:\/\/[^)]+\)/gu)??[]).length,
    };
  });
  const sourceMap=new Map(input.runtime?.queryGraph.provenance
    .map(x=>[x.nodeId,x.sources] as const)??[]);
  const same=new Set(input.runtime?.queryGraph.samePageNodeIds??[]);
  const ownership=new Map<string,number>();
  input.runtime?.sectionBlueprints.sections.forEach((s,index)=>
    s.queryNodeIds.forEach(node=>ownership.set(node,index)));
  for(const [node,index]of Object.entries(input.approvedNodeOwners??{}))
    if(Number.isInteger(index)&&index>=0&&index<sections.length)
      ownership.set(node,index);
  const realSearchQueries=(input.runtime?.queryGraph.nodes??[])
    .flatMap(node=>{
      const sources=(sourceMap.get(node.id)??[])
        .filter(s=>observedSources.has(s));
      if(!sources.length||!same.has(node.id)||
        node.intent!==input.runtime?.queryGraph.missionIntent||
        node.sourceConfidence<0.6)return [];
      const assigned=ownership.get(node.id);
      return [{
        nodeId:node.id,query:node.query,sources,cluster:node.cluster,
        searchVolume:Number.isFinite(node.searchVolume)?
          node.searchVolume??null:null,
        gscImpressions:Number.isFinite(node.gscImpressions)?
          node.gscImpressions??null:null,
        exactMentions:countExactPhrase(corpus,node.query),
        ownerH2Index:assigned??null,
        ownerH2:assigned!==undefined?
          sections[assigned]?.heading??null:null,
        isBriefPhrase:seen.has(norm(node.query)),
      }];
    });
  const researchedAdditional=realSearchQueries
    .filter(q=>!q.isBriefPhrase);
  return {
    version:"EXISTING_ARTICLE_DEMAND_OUTLINE_AUDIT_V1" as const,
    article:{words:countWords(body),characters:body.length,h1:
      Number(Boolean(input.h1.trim()))+
        (body.match(/^#\s+.+/gm)??[]).length,
      h2:sections.length,h3:sections.reduce((n,s)=>n+s.h3.length,0)},
    briefPhrases,
    briefExactCoverage:{
      used:briefPhrases.filter(x=>x.exactMentions>0).length,
      total:briefPhrases.length,
      notTotalSeoCoverage:true,
    },
    sections,
    realSearchQueries,
    researchedAdditionalQueryCount:researchedAdditional.length,
    realAdditionalQueriesWithoutExactPhrase:researchedAdditional
      .filter(q=>q.exactMentions===0).map(q=>q.query),
    searchDataLimits:{
      onlyQueriesWithSavedSamePageObservedProvenance:true,
      noLiveGscPerformanceClaim:true,
      noKeywordCountTargetInvented:true,
      noHeadingCountTargetInvented:true,
      noNewProviderCalls:true,
    },
  };
}
