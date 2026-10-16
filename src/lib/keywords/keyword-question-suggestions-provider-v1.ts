/**
 * One bounded, explicitly paid DataForSEO Keyword Suggestions request.
 * Unlike depth-3 Related Keywords, this searches for long-tail phrases
 * retaining the seed concept. A question-prefix filter is applied
 * on the provider side BEFORE its limit=100, not after volume ranking.
 * Docs: https://docs.dataforseo.com/v3/dataforseo_labs-google-keyword_suggestions-live/
 */
const API="https://api.dataforseo.com/v3/dataforseo_labs/google/keyword_suggestions/live";
export type QuestionSuggestionV1={
  keyword:string;searchVolume:number|null;keywordDifficulty:number|null;
  cpc:number|null;providerMainIntent:string|null;
};
export type QuestionSuggestionResultV1={
  source:"DATAFORSEO_KEYWORD_SUGGESTIONS";
  seed:string;market:"US"|"CA"|"GB"|"AU";
  providerChargedUsd:number|null;
  suggestions:QuestionSuggestionV1[];
};
type WireItem={
  keyword?:string|null;
  keyword_info?:{search_volume?:number|null;cpc?:number|null}|null;
  keyword_properties?:{keyword_difficulty?:number|null}|null;
  search_intent_info?:{main_intent?:string|null}|null;
};
type WireResponse={
  status_code?:number;status_message?:string;cost?:number;
  tasks?:{
    status_code?:number;status_message?:string;cost?:number;
    result?:{items?:WireItem[]|null}[]|null;
  }[];
};
const marketName:Record<QuestionSuggestionResultV1["market"],string>={
  US:"United States",CA:"Canada",
  GB:"United Kingdom",AU:"Australia",
};
const validMetric=(v:unknown):number|null=>
  typeof v==="number"&&Number.isFinite(v)&&v>=0?v:null;
const QUESTION_PREFIX="^(what|how|why|does|do|can|could|is|are|should|when|will|would)\\s";
export function questionSuggestionsRequestV1({
  seed,market,limit=100,
}:{
  seed:string;market:QuestionSuggestionResultV1["market"];limit?:number;
}){
  const keyword=seed.trim().replace(/\s+/gu," ");
  if(keyword.length<4||keyword.length>120||!marketName[market]||
    !Number.isInteger(limit)||limit<1||limit>100)
    throw new Error("QUESTION_SUGGESTIONS_INVALID_SCOPE");
  return [{
    keyword,location_name:marketName[market],language_name:"English",
    limit,exact_match:false,
    include_seed_keyword:false,
    include_serp_info:false,
    include_clickstream_data:false,
    filters:["keyword","regex",QUESTION_PREFIX],
  }];
}
/** Must only be called behind user's explicit spend authorization. */
export async function fetchQuestionSuggestionsV1({
  seed,market,limit=100,
}:{
  seed:string;market:QuestionSuggestionResultV1["market"];limit?:number;
}):Promise<QuestionSuggestionResultV1>{
  const body=questionSuggestionsRequestV1({seed,market,limit});
  const login=process.env.DATAFORSEO_LOGIN;
  const password=process.env.DATAFORSEO_PASSWORD;
  if(!login||!password)throw new Error("QUESTION_SUGGESTIONS_CREDENTIALS_MISSING");
  const token=Buffer.from(login+":"+password).toString("base64");
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
  let response:Response;
  try{
    response=await fetch(API,{
      method:"POST",signal:controller.signal,
      headers:{"Authorization":"Basic "+token,
        "Content-Type":"application/json"},
      body:JSON.stringify(body),
    });
  }finally{clearTimeout(timeout);}
  if(!response.ok)throw new Error("QUESTION_SUGGESTIONS_HTTP_"+response.status);
  const wire=await response.json() as WireResponse;
  const task=wire.tasks?.[0];
  if(wire.status_code!==20000||task?.status_code!==20000)
    throw new Error("QUESTION_SUGGESTIONS_API_ERROR:"+
      String(task?.status_message??wire.status_message??"UNKNOWN").slice(0,120));
  const suggestions:QuestionSuggestionV1[]=[];
  const seen=new Set<string>();
  for(const item of task.result?.[0]?.items??[]){
    const keyword=item.keyword?.trim();
    if(!keyword||keyword.length>180)continue;
    const key=keyword.toLowerCase();
    if(seen.has(key))continue;
    seen.add(key);
    suggestions.push({
      keyword,
      searchVolume:validMetric(item.keyword_info?.search_volume),
      keywordDifficulty:validMetric(item.keyword_properties?.keyword_difficulty),
      cpc:validMetric(item.keyword_info?.cpc),
      providerMainIntent:item.search_intent_info?.main_intent??null,
    });
  }
  return {
    source:"DATAFORSEO_KEYWORD_SUGGESTIONS",seed,market,
    providerChargedUsd:validMetric(wire.cost??task.cost),
    suggestions,
  };
}
