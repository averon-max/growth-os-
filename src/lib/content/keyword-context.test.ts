import {beforeEach,describe,expect,it,vi} from "vitest";

const mocks=vi.hoisted(()=>({
  website:vi.fn(),keywords:vi.fn(),
}));
vi.mock("@/lib/prisma",()=>({prisma:{
  website:{findUnique:mocks.website},
  keyword:{findMany:mocks.keywords},
}}));
import {getWebsiteKeywordContext} from "./keyword-context";

describe("market-scoped GSC website keyword context",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.website.mockResolvedValue({
      id:"site",url:"https://scanmycreds.com",
      business:{workspaceId:"workspace"},
    });
    mocks.keywords.mockResolvedValue([
      {text:"credit monitoring",volume:1500,difficulty:29,
        snapshots:[{pageUrl:"https://scanmycreds.com/credit-monitoring",
          position:12,clicks:4,impressions:800}]},
      {text:"credit monitoring evil redirect",volume:2000,difficulty:2,
        snapshots:[{pageUrl:"https://scanmycreds.com.attacker.example/post",
          position:1,clicks:800,impressions:100000}]},
      {text:"credit monitoring www",volume:null,difficulty:null,
        snapshots:[{pageUrl:"https://www.scanmycreds.com/",
          position:17,clicks:0,impressions:40}]},
    ]);
  });
  it("filters to exact domain/www and applies requested country to Prisma query",async()=>{
    const result=await getWebsiteKeywordContext("site",250,"US");
    expect(mocks.keywords).toHaveBeenCalledWith(expect.objectContaining({
      where:expect.objectContaining({
        workspaceId:"workspace",
        snapshots:{some:{pageUrl:{contains:"scanmycreds.com"},country:"us",source:"GOOGLE_SEARCH_CONSOLE"}},
      }),
      include:{snapshots:expect.objectContaining({
        where:{pageUrl:{contains:"scanmycreds.com"},country:"us",source:"GOOGLE_SEARCH_CONSOLE"},
      })},
      take:500,
    }));
    expect(result?.topKeywords.map(x=>x.keyword)).toEqual([
      "credit monitoring","credit monitoring www",
    ]);
  });
  it("keeps unspecified country available to unrelated legacy consumers",async()=>{
    await getWebsiteKeywordContext("site");
    const args=mocks.keywords.mock.calls[0][0];
    expect(args.where.snapshots.some.country).toBeUndefined();
    expect(args.where.snapshots.some.source).toBe("GOOGLE_SEARCH_CONSOLE");
  });
  it("rejects missing business and invalid context limits",async()=>{
    await expect(getWebsiteKeywordContext("site",501))
      .rejects.toThrow("KEYWORD_CONTEXT_LIMIT_INVALID");
    await expect(getWebsiteKeywordContext("site",50,"not-a-country"))
      .rejects.toThrow("KEYWORD_CONTEXT_MARKET_INVALID");
  });
});
