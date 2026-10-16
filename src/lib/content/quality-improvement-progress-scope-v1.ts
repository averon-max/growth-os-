/**
 * A partial quality revision is NOT saved to the database. Its verified
 * section output may be reused only while the exact original Article
 * version, signed research snapshot, bound Writer contract, model and
 * progress policy remain identical. The canonical section progress
 * reader separately checks its SHA256 envelope.
 */
import {createHash} from "node:crypto";
import {join} from "node:path";

const VERSION="SAME_ARTICLE_QUALITY_PROGRESS_SCOPE_V1";
function digest(value:unknown):string{
  return createHash("sha256").update(JSON.stringify(value),"utf8")
    .digest("hex");
}
export function qualityImprovementProgressDirectoryV1({
  root,articleId,briefId,updatedAt,article,snapshot,contract,modelName,
}:{
  root:string;
  articleId:string;
  briefId:string;
  updatedAt:string;
  article:Readonly<{
    title:string;metaDescription:string;h1:string;bodyMarkdown:string;
  }>;
  snapshot:unknown;
  contract:unknown;
  modelName:string;
}):string{
  if(!/^[A-Za-z0-9_-]{5,100}$/.test(articleId)||
    !/^[A-Za-z0-9_-]{5,100}$/.test(briefId)||
    !modelName.trim()||!Number.isFinite(Date.parse(updatedAt)))
    throw new Error("QUALITY_PROGRESS_SCOPE_INVALID");
  const key=digest({
    version:VERSION,articleId,briefId,updatedAt,
    articleFingerprint:digest(article),
    evidenceFingerprint:digest(snapshot),
    boundContractFingerprint:digest(contract),
    modelName,
  });
  return join(root,"quality-improvement",key.slice(0,20));
}
/** Only originally assigned H2 sections may be revised. */
export function classifyVerifiedQualitySectionsV1({
  originalBodies,currentBodies,plannedIndices,
}:{
  originalBodies:readonly string[];
  currentBodies:readonly string[];
  plannedIndices:readonly number[];
}):Readonly<number[]>{
  if(originalBodies.length!==currentBodies.length)
    throw new Error("QUALITY_PROGRESS_SECTION_COUNT_DRIFT");
  const allowed=new Set(plannedIndices);
  const changed:number[]=[];
  for(let i=0;i<originalBodies.length;i++){
    if(originalBodies[i].trim()===currentBodies[i].trim())continue;
    if(!allowed.has(i))
      throw new Error("QUALITY_PROGRESS_UNPLANNED_SECTION_CHANGE:"+i);
    changed.push(i);
  }
  return changed;
}
