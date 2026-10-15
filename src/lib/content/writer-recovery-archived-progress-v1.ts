/**
 * SAME_ARTICLE_PAID_WRITER_CHECKPOINT_ADAPTER_V1
 *
 * The complete runtime contract includes live-fetched source metadata.
 * Its SHA256 can drift despite stable claims and evidence. Never fake
 * equality with an old contractHash. Inspect an immutable historical
 * checkpoint against CURRENT authoritative claims/evidence, then demand
 * freshly paid section semantic verification before any reuse.
 *
 * This module is a read-only deterministic candidate inspector. It
 * never pays providers, updates DB, rewrites disk, or grants factual
 * authority from old checkpoint data.
 */
import {readdir,readFile} from "node:fs/promises";
import {join} from "node:path";
import type {ArticleGenerationContractV1}
  from "./article-generation-contract";
import type {MasterWriterSectionProgressV1}
  from "./master-writer-section-progress-v1";
import {readMasterWriterSectionProgressV1}
  from "./master-writer-section-progress-v1";
import {reconcileGeneratedSectionClaimsV1,
  assertSectionClaimReconciliationPassed}
  from "./section-claim-reconciliation";

const directoryName=/^[a-f0-9]{20}$/;
const fullHash=/^[a-f0-9]{64}$/;
type Candidate={
  readonly checkpoint:MasterWriterSectionProgressV1;
  readonly contractHashPrefix:string;
  readonly verifiedSections:number;
};
export type WriterRecoveryInspectionV1={
  readonly candidateCount:number;
  readonly candidatesInspected:number;
  readonly compatible:boolean;
  readonly archivedPrefix:string|null;
  readonly verifiedSections:number;
  readonly rejectionReasons:readonly string[];
  readonly candidate:Candidate|null;
};
export function inspectSavedWriterAgainstCurrentContractV1({
  checkpoint,contract,modelName,
}:{
  checkpoint:MasterWriterSectionProgressV1;
  contract:Readonly<ArticleGenerationContractV1>;
  modelName:string;
}):readonly string[]{
  const fail:string[]=[];
  if(checkpoint.modelName!==modelName)
    fail.push("MODEL_CHANGED");
  if(checkpoint.accepted.length!==contract.sectionContracts.length)
    fail.push("INCOMPLETE_WRITER_CHECKPOINT");
  if(checkpoint.shell?.version!=="ARTICLE_SHELL_V1")
    fail.push("SHELL_INVALID");
  if(checkpoint.accepted.length!==contract.sectionContracts.length||
    checkpoint.modelName!==modelName)return fail;
  for(let i=0;i<checkpoint.accepted.length;i++){
    const saved=checkpoint.accepted[i];
    const current=contract.sectionContracts[i];
    if(!saved||!current){
      fail.push("SECTION_MISSING:"+i);continue;
    }
    if(saved.section.heading!==current.blueprint.heading||
      saved.section.provenance.sectionIndex!==i||
      saved.section.provenance.modelName!==modelName){
      fail.push("SECTION_PROVENANCE_DRIFT:"+i);continue;
    }
    const previousClaims=[...saved.reconciliation.requiredClaimIds].sort();
    const currentClaims=[...current.blueprint.requiredClaims].sort();
    if(JSON.stringify(previousClaims)!==JSON.stringify(currentClaims)){
      fail.push("SECTION_REQUIRED_CLAIMS_CHANGED:"+i);continue;
    }
    const currentGraphEvidence=new Map(current.evidenceGraph.claimEvidence
      .map(edge=>[edge.id,edge] as const));
    const oldRefs=saved.section.referencedEvidenceIds;
    if(oldRefs.some(id=>{
      const edge=currentGraphEvidence.get(id);
      return !edge||edge.kind!=="VERIFIED_EXCERPT"||
        edge.relation!=="SUPPORTS";
    })){
      fail.push("SECTION_APPROVED_EVIDENCE_CHANGED:"+i);continue;
    }
    try{
      const canonical=reconcileGeneratedSectionClaimsV1({
        contract:current,section:saved.section,
      });
      assertSectionClaimReconciliationPassed(canonical);
      // Old source/evidence relations are useful only as a change
      // detector. Fresh semantic verification still required.
      const supportCurrent=new Map(canonical.verifiedSupport.map(x=>
        [x.claimId,x] as const));
      if(saved.reconciliation.verifiedSupport.some(old=>{
        const now=supportCurrent.get(old.claimId);
        return !now||old.evidenceIds.some(id=>!now.evidenceIds.includes(id))||
          old.sourceIds.some(id=>!now.sourceIds.includes(id));
      })){
        fail.push("SECTION_EVIDENCE_PROVENANCE_CHANGED:"+i);
      }
    }catch{
      fail.push("SECTION_RECONCILIATION_CHANGED:"+i);
    }
  }
  return fail;
}
export async function inspectArchivedWriterProgressV1({
  rootDirectory,articleId,briefId,modelName,contract,
}:{
  rootDirectory:string;
  articleId:string;
  briefId:string;
  modelName:string;
  contract:Readonly<ArticleGenerationContractV1>;
}):Promise<WriterRecoveryInspectionV1>{
  if(!/^[A-Za-z0-9_-]{5,100}$/.test(articleId)||
    !/^[A-Za-z0-9_-]{5,100}$/.test(briefId))
    throw new Error("ARCHIVED_WRITER_ARTICLE_SCOPE_INVALID");
  let dirs:string[];
  try{
    dirs=(await readdir(rootDirectory))
      .filter(x=>directoryName.test(x)).sort().slice(0,128);
  }catch(error){
    if((error as NodeJS.ErrnoException).code==="ENOENT")
      dirs=[];
    else throw error;
  }
  const reasons:string[]=[];
  let inspected=0;
  for(const prefix of dirs){
    const directory=join(rootDirectory,prefix);
    const path=join(directory,articleId+"-SECTION_PROGRESS.json");
    let raw:unknown;
    try{raw=JSON.parse(await readFile(path,"utf8"));}
    catch(error){
      if((error as NodeJS.ErrnoException).code==="ENOENT")continue;
      reasons.push("CHECKPOINT_JSON_UNREADABLE");continue;
    }
    if(!raw||typeof raw!=="object")continue;
    const header=(raw as {checkpoint?:{contractHash?:unknown}})
      .checkpoint;
    if(!header||typeof header.contractHash!=="string"||
      !fullHash.test(header.contractHash)||
      !header.contractHash.startsWith(prefix)){
      reasons.push("CHECKPOINT_HASH_SCOPE_INVALID");continue;
    }
    // Always validate original SHA256 envelope, model and identity via
    // canonical reader. Never accept raw parse above as trusted content.
    let checkpoint:MasterWriterSectionProgressV1|null;
    try{
      checkpoint=await readMasterWriterSectionProgressV1({
        directory,articleId,briefId,
        contractHash:header.contractHash,modelName,
      });
    }catch{
      reasons.push("CHECKPOINT_INTEGRITY_OR_SCOPE_FAILED");continue;
    }
    if(!checkpoint)continue;
    inspected++;
    const mismatch=inspectSavedWriterAgainstCurrentContractV1({
      checkpoint,contract,modelName,
    });
    if(mismatch.length){
      reasons.push(...mismatch.slice(0,8));continue;
    }
    return {
      candidateCount:dirs.length,candidatesInspected:inspected,
      compatible:true,archivedPrefix:prefix,
      verifiedSections:checkpoint.accepted.length,
      rejectionReasons:[],
      candidate:{
        checkpoint,contractHashPrefix:prefix,
        verifiedSections:checkpoint.accepted.length,
      },
    };
  }
  return {
    candidateCount:dirs.length,candidatesInspected:inspected,
    compatible:false,archivedPrefix:null,verifiedSections:0,
    rejectionReasons:[...new Set(reasons)].slice(0,12),
    candidate:null,
  };
}