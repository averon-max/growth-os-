import {describe,expect,it} from "vitest";
import {
  resolveResearchRecoverySerpMarketV1,
} from "./research-recovery-serp-market-v1";
describe("DataForSEO SERP market from persisted SearchMission",()=>{
  it.each(["en","EN","en-US","en_CA","English"," english "])(
    "translates %s into API-accepted English language_name",language=>{
      expect(resolveResearchRecoverySerpMarketV1({
        language,location:"United States",
      })).toEqual({languageName:"English",locationName:"United States"});
    });
  it("keeps correct English language and preserves Canadian search market",()=>{
    expect(resolveResearchRecoverySerpMarketV1({
      language:"en-CA",location:"Canada",
    })).toEqual({languageName:"English",locationName:"Canada"});
  });
  it("normalizes only safely recognized country abbreviations",()=>{
    expect(resolveResearchRecoverySerpMarketV1({
      language:"en",location:"US",
    }).locationName).toBe("United States");
  });
  it("keeps an explicit valid city-level location instead of changing the market",()=>{
    expect(resolveResearchRecoverySerpMarketV1({
      language:"fr-CA",location:"Montreal,Quebec,Canada",
    })).toEqual({
      languageName:"French",locationName:"Montreal,Quebec,Canada",
    });
  });
  it("never silently defaults unknown languages to English",()=>{
    expect(()=>resolveResearchRecoverySerpMarketV1({
      language:"xx-YY",location:"Canada",
    })).toThrow("RESEARCH_RECOVERY_MARKET_INVALID:UNRECOGNIZED_LANGUAGE");
  });
  it("does not silently invent a location for missing locale metadata",()=>{
    expect(()=>resolveResearchRecoverySerpMarketV1({
      language:"en",location:"",
    })).toThrow("RESEARCH_RECOVERY_MARKET_INVALID:MISSING_LOCATION");
  });
});
