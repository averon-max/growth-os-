import {describe,expect,it} from "vitest";
import {parseGoogleKeywordSuggestionsV1} from "./keyword-suggestions-provider-v1";

const sample={
  status_code:20000,
  tasks:[{status_code:20000,result:[{items:[
    {keyword:"does credit monitoring hurt credit score",
      keyword_info:{
        search_volume:270,cpc:1.6,competition_level:"HIGH",
        monthly_searches:[{year:2026,month:9,search_volume:180}],
        search_volume_trend:{monthly:-20,quarterly:25,yearly:10},
      },
      keyword_properties:{keyword_difficulty:12},
      serp_info:{se_results_count:"1,234",serp_item_types:["organic","people_also_ask"],
        last_updated_time:"2026-10-15"},
    },
    {keyword:"credit monitoring for families",keyword_info:{search_volume:null},
      keyword_properties:{keyword_difficulty:null}},
  ]}]}],
};

describe("bounded DataForSEO Keyword Suggestions parser",()=>{
  it("preserves measured organic KD, volume and signed trend; never confuses paid ad competition",()=>{
    const rows=parseGoogleKeywordSuggestionsV1(sample,true);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      keyword:"does credit monitoring hurt credit score",
      searchVolume:270,keywordDifficulty:12,cpc:1.6,
      competitionLevel:"HIGH",
      monthlySearches:[{year:2026,month:9,searchVolume:180}],
      trend:{monthly:-20,quarterly:25,yearly:10},
      serpInfo:{resultCount:1234,features:["organic","people_also_ask"]},
    });
    expect(rows[1]).toMatchObject({
      searchVolume:null,keywordDifficulty:null,
      monthlySearches:[],trend:null,
    });
  });
  it("does not invent missing SERP, volume or difficulty metrics",()=>{
    const rows=parseGoogleKeywordSuggestionsV1(sample,false);
    expect(rows[0].serpInfo).toBeUndefined();
    expect(rows[1].searchVolume).toBeNull();
    expect(rows[1].keywordDifficulty).toBeNull();
  });
  it("fails closed on provider failures and invalid task responses",()=>{
    expect(()=>parseGoogleKeywordSuggestionsV1(null,true)).toThrow();
    expect(()=>parseGoogleKeywordSuggestionsV1({
      status_code:20000,tasks:[{status_code:40203,result:null}]
    },true)).toThrow("KEYWORD_SUGGESTIONS_TASK_ERROR");
    expect(()=>parseGoogleKeywordSuggestionsV1({
      status_code:40100,tasks:[]
    },true)).toThrow("KEYWORD_SUGGESTIONS_PROVIDER_ERROR");
  });
});