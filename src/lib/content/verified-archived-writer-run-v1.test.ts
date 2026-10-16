import {describe,expect,it,vi} from "vitest";
import {rebindSignedArchivedWriterRunV1}
  from "./verified-archived-writer-run-v1";
import type {MasterWriterSectionProgressV1}
  from "./master-writer-section-progress-v1";
import type {ArticleGenerationContractV1}
  from "./article-generation-contract";
import type {MasterSectionVerificationGenerator}
  from "./master-section-repair";
describe("source-verified archived Writer rebound guard",()=>{
  it("stops on model/contract mismatch before touching paid semantic verifier",async()=>{
    const verify=vi.fn();
    const generator={
      modelName:"current-model",verifySection:verify,
    } as unknown as MasterSectionVerificationGenerator;
    const progress={
      modelName:"archived-model",
      accepted:[],
      shell:{version:"ARTICLE_SHELL_V1"},
    } as unknown as MasterWriterSectionProgressV1;
    const contract={
      sectionContracts:[],
    } as unknown as ArticleGenerationContractV1;
    await expect(rebindSignedArchivedWriterRunV1({
      progress,contract,generator,
      article:{title:"Article",metaDescription:"Description",
        h1:"Article",bodyMarkdown:""},
    })).rejects.toThrow("QUALITY_ARCHIVE_CURRENT_EVIDENCE_MISMATCH:MODEL_CHANGED");
    expect(verify).not.toHaveBeenCalled();
  });
  it("refuses a stale signed shell even with matching section claim set",async()=>{
    const verify=vi.fn();
    const generator={
      modelName:"model",verifySection:verify,
    } as unknown as MasterSectionVerificationGenerator;
    const progress={
      modelName:"model",
      accepted:[],
      shell:{version:"ARTICLE_SHELL_V1",
        title:"Old title",metaDescription:"Description",
        h1:"Old title",
        provenance:{modelName:"model",
          h1Mission:"Mission",
          sourceRuntimeVersion:"MASTER_RUNTIME_SNAPSHOT_V1"}},
    } as unknown as MasterWriterSectionProgressV1;
    const contract={
      sectionContracts:[],h1Mission:"Mission",
      sourceRuntimeVersion:"MASTER_RUNTIME_SNAPSHOT_V1",
    } as unknown as ArticleGenerationContractV1;
    await expect(rebindSignedArchivedWriterRunV1({
      progress,contract,generator,
      article:{title:"New title",metaDescription:"Description",
        h1:"New title",bodyMarkdown:""},
    })).rejects.toThrow("QUALITY_ARCHIVE_SHELL_MISMATCH");
    expect(verify).not.toHaveBeenCalled();
  });
});
