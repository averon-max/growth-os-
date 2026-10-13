/**
 * EXISTING_ARTICLE_RESEARCH_PAID_PLAN_CHECKPOINT_V1
 *
 * A single OpenAI planning response can be useful even if a later
 * verification / writer / SERP gate fails. Keep it on the LOCAL
 * machine with 0600 permissions so a retry does NOT pay to invent
 * the same candidate claims again. This is not SaaS durable storage:
 * hosted deployments should use persistent job/object storage.
 *
 * No checkpoint ever grants source authority or changes the DB.
 */
import {createHash} from "node:crypto";
import {mkdir,readFile,open} from "node:fs/promises";
import {resolve,join} from "node:path";
const VERSION="EXISTING_ARTICLE_RESEARCH_PAID_PLAN_CHECKPOINT_V1" as const;
const sha=(value:string)=>createHash("sha256").update(value,"utf8").digest("hex");
type Scope=Readonly<{
  articleId:string;briefId:string;updatedAt:string;
  evidenceSha256:string;
  directory?:string;
}>;
type Payload={
  version:typeof VERSION;
  articleId:string;
  briefId:string;
  updatedAt:string;
  evidenceSha256:string;
  response:string;
};
const checked=(scope:Scope)=>{
  if(!/^[A-Za-z0-9_-]{5,100}$/.test(scope.articleId)||
    !/^[A-Za-z0-9_-]{5,100}$/.test(scope.briefId)||
    !Number.isFinite(Date.parse(scope.updatedAt))||
    !/^[a-f0-9]{64}$/.test(scope.evidenceSha256))
    throw new Error("RESEARCH_PLAN_CHECKPOINT_SCOPE_INVALID");
  const directory=resolve(scope.directory ??
    process.env.GROWTH_OS_RESEARCH_RECOVERY_CHECKPOINT_DIR ??
    ".growth-os-tmp/research-recovery");
  return {path:join(directory,scope.articleId+"-planning.json"),
    directory};
};
function parse(value:string,scope:Scope):string {
  let file:unknown;
  try{file=JSON.parse(value);}catch{
    throw new Error("RESEARCH_PLAN_CHECKPOINT_INVALID_JSON");
  }
  if(file===null||typeof file!=="object"||Array.isArray(file))
    throw new Error("RESEARCH_PLAN_CHECKPOINT_INVALID_RECORD");
  const record=file as Record<string,unknown>;
  const payload=record.payload as Payload|undefined;
  if(!payload||payload.version!==VERSION ||
    payload.articleId!==scope.articleId||
    payload.briefId!==scope.briefId||
    payload.updatedAt!==scope.updatedAt||
    payload.evidenceSha256!==scope.evidenceSha256)
    throw new Error("RESEARCH_PLAN_CHECKPOINT_STALE");
  if(typeof payload.response!=="string" ||
    payload.response.length>120000||
    typeof record.sha256!=="string"||
    record.sha256!==sha(JSON.stringify(payload)))
    throw new Error("RESEARCH_PLAN_CHECKPOINT_INTEGRITY_INVALID");
  return payload.response;
}
export async function readExistingResearchPlanningCheckpointV1(
  scope:Scope
):Promise<string|null>{
  const {path}=checked(scope);
  try{return parse(await readFile(path,"utf8"),scope);}
  catch(error){
    if((error as NodeJS.ErrnoException).code==="ENOENT")return null;
    throw error;
  }
}
export async function saveExistingResearchPlanningCheckpointV1(
  scope:Scope,response:string
):Promise<string>{
  const {path,directory}=checked(scope);
  if(typeof response!=="string"||response.length===0||
    response.length>120000)
    throw new Error("RESEARCH_PLAN_CHECKPOINT_RESPONSE_TOO_LARGE");
  await mkdir(directory,{recursive:true,mode:0o700});
  const existing=await readExistingResearchPlanningCheckpointV1(scope);
  if(existing!==null){
    if(existing!==response)
      throw new Error("RESEARCH_PLAN_CHECKPOINT_ALREADY_EXISTS");
    return path;
  }
  const payload:Payload={
    version:VERSION,
    articleId:scope.articleId,briefId:scope.briefId,
    updatedAt:scope.updatedAt,
    evidenceSha256:scope.evidenceSha256,response,
  };
  const data=JSON.stringify({
    sha256:sha(JSON.stringify(payload)),payload,
  });
  // Exclusive creation means a concurrent execution cannot overwrite
  // another paid response for this immutable input scope.
  const writer=await open(path,"wx",0o600);
  try{await writer.writeFile(data,"utf8");await writer.sync();}
  finally{await writer.close();}
  return path;
}
