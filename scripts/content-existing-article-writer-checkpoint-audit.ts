/**
 * READ-ONLY local audit of already paid/saved Writer verified sections.
 * Never contacts providers, queries the database or mutates checkpoints.
 *
 * Usage: npx tsx scripts/content-existing-article-writer-checkpoint-audit.ts
 * --article=cmv...
 */
import {readdir,stat} from "node:fs/promises";
import {resolve,join} from "node:path";
import {
  readMasterWriterSectionProgressV1,
} from "../src/lib/content/master-writer-section-progress-v1";
import {
  detectHighConfidenceEditorialRepetitionV1,
} from "../src/lib/content/editorial-repetition-guard-v1";

async function main(){
  const flags=process.argv.slice(2);
  const flag=flags.find(a=>a.startsWith("--article="));
  const articleId=flag?.slice("--article=".length)??"";
  if(!/^[a-zA-Z0-9_-]{8,100}$/.test(articleId)||
    flags.length!==1)throw new Error("USAGE: --article=EXISTING_ARTICLE_ID");
  const base=resolve(".growth-os-tmp/article-checkpoints/research-recovery");
  let directories:string[];
  try{
    directories=(await readdir(base))
      .filter(name=>/^[a-f0-9]{20}$/.test(name));
  }catch(e){
    if((e as NodeJS.ErrnoException).code==="ENOENT"){
      console.log(JSON.stringify({
        mode:"READ_ONLY_WRITER_CHECKPOINT_AUDIT",
        articleId,checkpointCount:0,reason:"NO_CHECKPOINTS_FOUND",
        aiCalls:0,databaseUnchanged:true,
      },null,2));
      return;
    }
    throw e;
  }
  const found=[];
  for(const dir of directories.slice(0,200)){
    const directory=join(base,dir);
    // The integrity-checked checkpoint reader is authoritative.
    // The directory prefix is a known SHA256 contract fingerprint.
    const file=join(directory,articleId+"-SECTION_PROGRESS.json");
    try{
      const {readFile}=await import("node:fs/promises");
      const raw=JSON.parse(await readFile(file,"utf8")) as
        {checkpoint?:{briefId?:string;contractHash?:string;modelName?:string}};
      const c=raw.checkpoint;
      if(!c?.contractHash||c.contractHash.slice(0,20)!==dir||
         !c?.briefId||!c.modelName)continue;
      const saved=await readMasterWriterSectionProgressV1({
        directory,articleId,briefId:c.briefId,
        contractHash:c.contractHash,modelName:c.modelName,
      });
      if(!saved)continue;
      const fileStat=await stat(file);
      const sections=saved.accepted.map(x=>({
        heading:x.section.heading,bodyMarkdown:x.section.bodyMarkdown,
      }));
      const repeated=detectHighConfidenceEditorialRepetitionV1(sections);
      found.push({
        savedAt:fileStat.mtime.toISOString(),
        contractHashPrefix:dir,
        acceptedSections:saved.accepted.length,
        modelName:saved.modelName,
        sectionWords:saved.accepted.map((x,i)=>({
          index:i,
          heading:x.section.heading,
          words:(x.section.bodyMarkdown.match(/[\p{L}\p{N}]+/gu)??[]).length,
          semanticStatus:x.semanticVerification.status,
        })),
        editorialRepetition:repeated.map(x=>({
          code:x.code,sectionIndex:x.sectionIndex,
          affectedSections:x.affectedSections,
          repeatedPhrases:x.repeatedPhrases,
        })),
        initialWriterEditorialPass:repeated.length===0,
      });
    }catch(e){
      if((e as NodeJS.ErrnoException).code==="ENOENT")continue;
      throw e;
    }
  }
  found.sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
  console.log(JSON.stringify({
    mode:"READ_ONLY_WRITER_CHECKPOINT_AUDIT",
    articleId,checkpointCount:found.length,
    checkpoints:found.slice(0,5),
    warning:"WRITER_CHECKPOINT_IS_NOT_THE_POST_CRITIC_ARTICLE",
    aiCalls:0,dataForSeoCalls:0,databaseUnchanged:true,
  },null,2));
}
main().catch(err=>{
  console.error("WRITER_CHECKPOINT_AUDIT_FAILED:",err instanceof Error?err.message:String(err));
  process.exitCode=1;
});
