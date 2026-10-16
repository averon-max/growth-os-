import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {fetchQuestionSuggestionsV1,questionSuggestionsRequestV1}
  from "./keyword-question-suggestions-provider-v1";
describe("bounded DataForSEO long-tail question discovery",()=>{
 beforeEach(()=>{
  vi.stubEnv("DATAFORSEO_LOGIN","test-login");
  vi.stubEnv("DATAFORSEO_PASSWORD","test-password");
 });
 afterEach(()=>vi.unstubAllGlobals());
 it("sends ONE question-filtered task with no SERP or costly clickstream",()=>{
  const [task]=questionSuggestionsRequestV1({
    seed:"credit monitoring",market:"US",limit:100,
  });
  expect(task).toMatchObject({
    keyword:"credit monitoring",location_name:"United States",
    language_name:"English",limit:100,include_serp_info:false,
    include_clickstream_data:false,include_seed_keyword:false,
    filters:["keyword","regex",expect.stringContaining("how")],
  });
  expect(()=>questionSuggestionsRequestV1({
    seed:"credit monitoring",market:"US",limit:101,
  })).toThrow("QUESTION_SUGGESTIONS_INVALID_SCOPE");
 });
 it("reads only REAL measured monthly volume, difficulty, provider intent and charged USD",async()=>{
  const mocked=vi.fn().mockResolvedValue({
    ok:true,json:async()=>({
      status_code:20000,status_message:"Ok",cost:0.031,
      tasks:[{status_code:20000,result:[{items:[
        {keyword:"how does credit monitoring work",
          keyword_info:{search_volume:120,cpc:0.4},
          keyword_properties:{keyword_difficulty:12},
          search_intent_info:{main_intent:"informational"}},
        {keyword:"does credit monitoring affect credit score",
          keyword_info:{search_volume:null,cpc:null},
          keyword_properties:{keyword_difficulty:null},
          search_intent_info:null},
        {keyword:"how does credit monitoring work",
          keyword_info:{search_volume:9999,cpc:99}},
      ]}]}],
    }),
  });
  vi.stubGlobal("fetch",mocked);
  const result=await fetchQuestionSuggestionsV1({
    seed:"credit monitoring",market:"US",
  });
  expect(mocked).toHaveBeenCalledTimes(1);
  const [url,options]=mocked.mock.calls[0];
  expect(url).toContain("/dataforseo_labs/google/keyword_suggestions/live");
  expect(JSON.parse(options.body)).toHaveLength(1);
  expect(result.providerChargedUsd).toBe(0.031);
  expect(result.suggestions).toHaveLength(2);
  expect(result.suggestions[0]).toMatchObject({
    keyword:"how does credit monitoring work",searchVolume:120,
    keywordDifficulty:12,providerMainIntent:"informational",
  });
  expect(result.suggestions[1]).toMatchObject({
    keyword:"does credit monitoring affect credit score",
    searchVolume:null,keywordDifficulty:null,
  });
 });
 it("does not fabricate a keyword on empty provider response",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({
    ok:true,json:async()=>({
      status_code:20000,cost:0.01,
      tasks:[{status_code:20000,result:[{items:[]}]}],
    }),
  }));
  const result=await fetchQuestionSuggestionsV1({
    seed:"credit monitoring",market:"US",
  });
  expect(result.suggestions).toEqual([]);
 });
 it("fails closed on provider refusal without disclosing credentials",async()=>{
  vi.stubGlobal("fetch",vi.fn().mockResolvedValue({ok:false,status:403}));
  await expect(fetchQuestionSuggestionsV1({
    seed:"credit monitoring",market:"US",
  })).rejects.toThrow("QUESTION_SUGGESTIONS_HTTP_403");
 });
});
