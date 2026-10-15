import {describe,expect,it} from "vitest";
import {mkdtemp,rm,mkdir,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {
  inspectArchivedWriterProgressV1,
  inspectSavedWriterAgainstCurrentContractV1,
} from "./writer-recovery-archived-progress-v1";
import {writeMasterWriterSectionProgressV1}
  from "./master-writer-section-progress-v1";
import type {MasterWriterSectionProgressV1}
  from "./master-writer-section-progress-v1";
import type {ArticleGenerationContractV1}
  from "./article-generation-contract";

const articleId="cmv606xg60006siqlir66uq23";
const briefId="cmv606xbp0004siqlh7pbecns";
const modelName="gpt-5.6-luna";
const progress={
  articleId,briefId,modelName,contractHash:"a".repeat(64),
  shell:{version:"ARTICLE_SHELL_V1"},
  accepted:[{
    section:{
      version:"GENERATED_SECTION_V1",
      heading:"What is credit monitoring?",
      bodyMarkdown:"Credit monitoring can notify you about report changes.",
      referencedEvidenceIds:[],
      referencedClaimIds:[],
      coveredQueryNodeIds:[],
      usedInternalLinks:[],
      assetUsed:null,
      provenance:{
        modelName,sourceContractVersion:"SECTION_GENERATION_CONTRACT_V1",
        sectionIndex:0,sectionNumber:1,totalSections:1,
        blueprintHeading:"What is credit monitoring?",
      },
    },
    reconciliation:{
      status:"PASS",requiredClaimIds:[],verifiedSupport:[],
    },
    semanticVerification:{status:"PASS"},
    repair:{sectionIndex:0},
  }],
} as unknown as MasterWriterSectionProgressV1;
const contract={
  sectionContracts:[{
    blueprint:{
      heading:"What is credit monitoring?",
      requiredClaims:[],forbiddenClaims:[],evidenceIds:[],
    },
    evidenceGraph:{sources:[],claimEvidence:[]},
    claimLedger:{claims:[]},
  }],
} as unknown as ArticleGenerationContractV1;

describe("historical Writer checkpoint cannot silently authorize new facts",()=>{
  it("accepts only same section/claim ownership before paid semantic verification",()=>{
    expect(inspectSavedWriterAgainstCurrentContractV1({
      checkpoint:progress,contract,modelName,
    })).toEqual([]);
    const changed={
      ...contract,
      sectionContracts:[{
        ...contract.sectionContracts[0],
        blueprint:{
          ...contract.sectionContracts[0].blueprint,
          requiredClaims:["unverified-new-claim"],
        },
      }],
    } as never;
    expect(inspectSavedWriterAgainstCurrentContractV1({
      checkpoint:progress,contract:changed,modelName,
    })).toContain("SECTION_REQUIRED_CLAIMS_CHANGED:0");
    expect(inspectSavedWriterAgainstCurrentContractV1({
      checkpoint:progress,contract,modelName:"another-model",
    })).toContain("MODEL_CHANGED");
  });
  it("validates the original immutable SHA256 disk envelope and rejects tampering",async()=>{
    const root=await mkdtemp(join(tmpdir(),"writer-rebound-"));
    const dir=join(root,"a".repeat(20));
    try{
      await mkdir(dir,{recursive:true});
      await writeMasterWriterSectionProgressV1({
        directory:dir,...progress,
      });
      const result=await inspectArchivedWriterProgressV1({
        rootDirectory:root,articleId,briefId,modelName,contract,
      });
      expect(result.compatible).toBe(true);
      expect(result.archivedPrefix).toBe("a".repeat(20));
      expect(result.verifiedSections).toBe(1);
      await writeFile(join(dir,articleId+"-SECTION_PROGRESS.json"),
        '{"checkpoint":{"articleId":"'+articleId+'","contractHash":"'+
        "a".repeat(64)+'"}}',"utf8");
      const corrupted=await inspectArchivedWriterProgressV1({
        rootDirectory:root,articleId,briefId,modelName,contract,
      });
      expect(corrupted.compatible).toBe(false);
      expect(corrupted.rejectionReasons).toContain(
        "CHECKPOINT_INTEGRITY_OR_SCOPE_FAILED");
    }finally{
      await rm(root,{force:true,recursive:true});
    }
  });
  it("read-only scan of non-existent directory gives no eligible candidates",async()=>{
    const missing=join(tmpdir(),"missing-writer-rebound-f0aa14478e2");
    const result=await inspectArchivedWriterProgressV1({
      rootDirectory:missing,articleId,briefId,modelName,contract,
    });
    expect(result.compatible).toBe(false);
    expect(result.verifiedSections).toBe(0);
  });
});