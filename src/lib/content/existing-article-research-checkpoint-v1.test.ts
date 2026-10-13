import {describe,expect,it} from "vitest";
import {mkdtemp,readFile,writeFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {
  readExistingResearchPlanningCheckpointV1,
  saveExistingResearchPlanningCheckpointV1,
} from "./existing-article-research-checkpoint-v1";

describe("paid research planning can be reused without repeat charges",()=>{
  async function scoped(){
    const directory=await mkdtemp(join(tmpdir(),"research-plan-checkpoint-"));
    return {
      directory,articleId:"article_test_01",briefId:"brief_test_01",
      updatedAt:"2026-10-13T02:38:04.855Z",
      evidenceSha256:"a".repeat(64),
    };
  }
  it("persists and resumes the exact paid result for the same article and evidence",async()=>{
    const scope=await scoped();
    try{
      expect(await readExistingResearchPlanningCheckpointV1(scope))
        .toBeNull();
      const response='{"sections":[{"sectionId":"section-1","proposedClaims":[]}]}';
      await saveExistingResearchPlanningCheckpointV1(scope,response);
      expect(await readExistingResearchPlanningCheckpointV1(scope))
        .toBe(response);
      await expect(saveExistingResearchPlanningCheckpointV1(scope,response))
        .resolves.toContain("planning.json");
      const path=join(scope.directory,scope.articleId+"-planning.json");
      const stat=await import("node:fs/promises").then(fs=>fs.stat(path));
      expect(stat.mode&0o777).toBe(0o600);
    }finally{await rm(scope.directory,{recursive:true,force:true});}
  });
  it("does not reuse a paid plan after article or snapshot version changes",async()=>{
    const scope=await scoped();
    try{
      await saveExistingResearchPlanningCheckpointV1(scope,"{}");
      await expect(readExistingResearchPlanningCheckpointV1({
        ...scope,evidenceSha256:"b".repeat(64),
      })).rejects.toThrow("RESEARCH_PLAN_CHECKPOINT_STALE");
      await expect(readExistingResearchPlanningCheckpointV1({
        ...scope,updatedAt:"2026-10-14T02:38:04.855Z",
      })).rejects.toThrow("RESEARCH_PLAN_CHECKPOINT_STALE");
    }finally{await rm(scope.directory,{recursive:true,force:true});}
  });
  it("rejects local tampering or accidental truncated writes",async()=>{
    const scope=await scoped();
    try{
      await saveExistingResearchPlanningCheckpointV1(scope,"{}");
      const path=join(scope.directory,scope.articleId+"-planning.json");
      const data=JSON.parse(await readFile(path,"utf8")) as {
        payload:{response:string};sha256:string;
      };
      data.payload.response='{"forged":true}';
      await writeFile(path,JSON.stringify(data));
      await expect(readExistingResearchPlanningCheckpointV1(scope))
        .rejects.toThrow("RESEARCH_PLAN_CHECKPOINT_INTEGRITY_INVALID");
    }finally{await rm(scope.directory,{recursive:true,force:true});}
  });
  it("does not silently replace an existing paid planning response",async()=>{
    const scope=await scoped();
    try{
      await saveExistingResearchPlanningCheckpointV1(scope,"{}");
      await expect(saveExistingResearchPlanningCheckpointV1(scope,'{"x":1}'))
        .rejects.toThrow("RESEARCH_PLAN_CHECKPOINT_ALREADY_EXISTS");
    }finally{await rm(scope.directory,{recursive:true,force:true});}
  });
});
