/**
 * Exactly one explicitly authorized DataForSEO Labs Google Keyword Suggestions
 * request. Unlike SERP-derived Related Keywords, it searches terms containing
 * the specified subject; the later topic/page-intent gate is still mandatory.
 *
 * Docs: https://docs.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live/
 */
import {DataForSEOError, type RelatedKeywordResult} from "./dataforseo-provider";

const ENDPOINT="https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live";
type LabInfo={
  search_volume?:number|null;cpc?:number|null;competition_level?:string|null;
  monthly_searches?:Array<{year:number;month:number;search_volume:number}>|null;
  search_volume_trend?:{monthly?:number|null;quarterly?:number|null;yearly?:number|null}|null;
};
type LabItem={
  keyword?:string|null;keyword_info?:LabInfo|null;
  keyword_properties?:{keyword_difficulty?:number|null}|null;
  serp_info?:{
    se_results_count?:string|number|null;
    serp_item_types?:string[]|null;
    last_updated_time?:string|null;
  }|null;
};
type LabTask={
  status_code?:number;status_message?:string;
  result?:Array<{items?:LabItem[]|null}>|null;
};
type LabResponse={status_code?:number;status_message?:string;
  tasks?:LabTask[]|null};

const metric=(v:unknown):number|null=>
  typeof v==="number"&&Number.isFinite(v)&&v>=0?v:null;
const signedMetric=(v:unknown):number|null=>
  typeof v==="number"&&Number.isFinite(v)?v:null;
const serpCount=(v:unknown):number|null=>{
  if(typeof v!=="number"&&typeof v!=="string")return null;
  const n=Number(typeof v==="string"?v.replace(/,/g,""):v);
  return Number.isSafeInteger(n)&&n>=0?n:null;
};
export function parseGoogleKeywordSuggestionsV1(
  data:unknown,includeSerpInfo:boolean,
):RelatedKeywordResult[]{
  if(!data||typeof data!=="object"||Array.isArray(data))
    throw new DataForSEOError("KEYWORD_SUGGESTIONS_INVALID_RESPONSE");
  const result=data as LabResponse;
  if(result.status_code!==20000)
    throw new DataForSEOError("KEYWORD_SUGGESTIONS_PROVIDER_ERROR:"+
      String(result.status_message??result.status_code));
  const task=result.tasks?.[0];
  if(!task||task.status_code!==20000||!Array.isArray(task.result))
    throw new DataForSEOError("KEYWORD_SUGGESTIONS_TASK_ERROR:"+
      String(task?.status_message??"EMPTY_TASK"));
  const items=task.result[0]?.items??[];
  if(!Array.isArray(items))
    throw new DataForSEOError("KEYWORD_SUGGESTIONS_ITEMS_INVALID");
  return items.flatMap((item)=>{
    const keyword=item?.keyword?.trim();
    if(!keyword||keyword.length>180)return [];
    const info=item.keyword_info;
    const history=Array.isArray(info?.monthly_searches)?
      info.monthly_searches.filter(row=>
        Number.isInteger(row?.year)&&Number.isInteger(row?.month)&&
        row.month>=1&&row.month<=12&&metric(row.search_volume)!==null)
        .map(row=>({year:row.year,month:row.month,
          searchVolume:row.search_volume})): [];
    return [{
      keyword,
      searchVolume:metric(info?.search_volume),
      cpc:metric(info?.cpc),
      competitionLevel:typeof info?.competition_level==="string"?
        info.competition_level:null,
      keywordDifficulty:metric(item.keyword_properties?.keyword_difficulty),
      monthlySearches:history,
      trend:info?.search_volume_trend?{
        monthly:signedMetric(info.search_volume_trend.monthly),
        quarterly:signedMetric(info.search_volume_trend.quarterly),
        yearly:signedMetric(info.search_volume_trend.yearly),
      }:null,
      ...(includeSerpInfo?{serpInfo:item.serp_info?{
        resultCount:serpCount(item.serp_info.se_results_count),
        features:Array.isArray(item.serp_info.serp_item_types)?
          item.serp_info.serp_item_types:[],
        updatedAt:typeof item.serp_info.last_updated_time==="string"?
          item.serp_info.last_updated_time:null,
      }:null}:{}),
    }];
  });
}
export async function fetchGoogleKeywordSuggestionsV1({
  topic,locationName,limit=200,includeSerpInfo=true,
}:{
  topic:string;locationName:string;limit?:number;includeSerpInfo?:boolean;
}):Promise<RelatedKeywordResult[]>{
  const keyword=topic.trim();
  if(keyword.length<3||keyword.length>180||
    !Number.isInteger(limit)||limit<1||limit>300||
    !["United States","Canada","United Kingdom","Australia"]
      .includes(locationName))
    throw new DataForSEOError("KEYWORD_SUGGESTIONS_INVALID_INPUT");
  const login=process.env.DATAFORSEO_LOGIN;
  const password=process.env.DATAFORSEO_PASSWORD;
  if(!login||!password)throw new DataForSEOError("DATAFORSEO_CREDENTIALS_MISSING");
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),25000);
  try{
    const response=await fetch(ENDPOINT,{
      method:"POST",signal:controller.signal,
      headers:{
        Authorization:"Basic "+Buffer.from(login+":"+password).toString("base64"),
        "Content-Type":"application/json",
      },
      body:JSON.stringify([{
        keyword,location_name:locationName,language_name:"English",
        limit,include_serp_info:includeSerpInfo,
        include_seed_keyword:true,
      }]),
    });
    if(!response.ok)throw new DataForSEOError(
      "KEYWORD_SUGGESTIONS_HTTP_ERROR:"+response.status);
    return parseGoogleKeywordSuggestionsV1(await response.json(),includeSerpInfo);
  }finally{clearTimeout(timer);}
}
