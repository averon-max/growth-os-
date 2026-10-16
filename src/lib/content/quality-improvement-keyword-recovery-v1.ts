import {analyzeArticle,countExactPhrase} from "./article-analyzer";

export interface QualityKeywordShapeV1{
  title:string;metaDescription:string;h1:string;bodyMarkdown:string;
}
export interface QualityKeywordLossV1 {
  keyword:string;
  role:"PRIMARY"|"SECONDARY";
  originalBodyMentions:number;
  currentBodyMentions:number;
  originalOwningSections:readonly number[];
  repairableOwningSections:readonly number[];
}
export function inspectQualityKeywordRegressionV1({
  original,current,primaryKeyword,secondaryKeywords,
  originalSectionBodies,editableSectionIndices,
}:{
  original:Readonly<QualityKeywordShapeV1>;
  current:Readonly<QualityKeywordShapeV1>;
  primaryKeyword:string;
  secondaryKeywords:readonly string[];
  originalSectionBodies:readonly string[];
  editableSectionIndices:readonly number[];
}):{
  originalUsed:number;
  currentUsed:number;
  losses:readonly QualityKeywordLossV1[];
  restored:boolean;
}{
  const inputs={primaryKeyword,secondaryKeywords:[...secondaryKeywords]};
  const earlier=analyzeArticle({...original,...inputs}).keywordCoverage;
  const later=analyzeArticle({...current,...inputs}).keywordCoverage;
  const editable=new Set(editableSectionIndices);
  const losses=earlier.items.flatMap(item=>{
    if(!item.used||later.items.some(after=>
      after.keyword===item.keyword&&after.used))return [];
    const owners=originalSectionBodies.flatMap((body,index)=>
      countExactPhrase(body,item.keyword)>0?[index]:[]);
    return [{
      keyword:item.keyword,
      role:item.role,
      originalBodyMentions:item.bodyMentions,
      currentBodyMentions:later.items.find(x=>
        x.keyword===item.keyword)?.bodyMentions??0,
      originalOwningSections:owners,
      repairableOwningSections:owners.filter(i=>editable.has(i)),
    }];
  });
  return {
    originalUsed:earlier.used,currentUsed:later.used,losses,
    restored:losses.length===0 && later.used>=earlier.used &&
      later.missing<=earlier.missing,
  };
}
export function selectQualityKeywordRepairSectionV1(
  losses:readonly QualityKeywordLossV1[],
  alreadyAttempted:readonly number[],
):number|null{
  const attempted=new Set(alreadyAttempted);
  const candidates=new Map<number,number>();
  for(const loss of losses)for(const idx of loss.repairableOwningSections){
    if(attempted.has(idx))continue;
    candidates.set(idx,(candidates.get(idx)??0)+1);
  }
  return [...candidates].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0]?.[0]??null;
}
