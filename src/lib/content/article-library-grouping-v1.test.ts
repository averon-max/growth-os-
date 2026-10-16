import {describe,it,expect} from "vitest";
import {normalizeContentTopicKeyV1,groupContentArticlesV1} from "./article-library-grouping-v1";

const article=(id:string,primaryKeyword:string,status:string,day:number,intent="informational")=>({
  id,status,
  updatedAt:new Date(Date.UTC(2026,9,day)),
  brief:{primaryKeyword,searchIntent:intent},
});

describe("Content library deduplication (display only)",()=>{
  it("normalizes case, Unicode and whitespace for a keyword",()=>{
    expect(normalizeContentTopicKeyV1(" WHAT   IS  Credit Monitoring ")).toBe("what is credit monitoring");
  });
  it("groups related versions without deleting historical rows",()=>{
    const rows=[
      article("new","What is credit monitoring","REJECTED",13),
      article("good"," what  is credit monitoring ","IN_REVIEW",12),
      article("older","WHAT IS CREDIT MONITORING","REJECTED",10),
      article("other","free credit monitoring","IN_REVIEW",9),
    ];
    const groups=groupContentArticlesV1(rows);
    expect(groups).toHaveLength(2);
    expect(groups[0].head.id).toBe("good");
    expect(groups[0].related.map(x=>x.id)).toEqual(["new","older"]);
    expect(groups.reduce((sum,g)=>sum+1+g.related.length,0)).toBe(rows.length);
  });
  it("keeps distinct intents as separate pages",()=>{
    const groups=groupContentArticlesV1([
      article("info","credit monitoring","IN_REVIEW",12),
      article("buy","credit monitoring","APPROVED",13,"commercial"),
    ]);
    expect(groups).toHaveLength(2);
  });
  it("prioritizes published canonical page over failed recent attempts",()=>{
    const group=groupContentArticlesV1([
      article("failed","topic","PUBLISH_FAILED",13),
      article("live","topic","PUBLISHED",8),
    ])[0];
    expect(group.head.id).toBe("live");
  });
});
