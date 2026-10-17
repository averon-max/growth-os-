/**
 * Wire the shared Markdown whitespace helper into an older main composer.
 * No AI, DB or remote effects. Idempotent, preserves unrelated edits.
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

async function main(){
  const path=resolve("src/lib/content/master-article-composer.ts");
  let source=await readFile(path,"utf8");
  const importBlock='import {\n  normalizeMasterArticleProseSpacesV1,\n} from "./article-prose-whitespace-v1";';
  const old='          section.bodyMarkdown\n            .trim(),';
  const replacement='          normalizeMasterArticleProseSpacesV1(\n            section.bodyMarkdown.trim()\n          ),';
  const anchor='import {\n  ContentGenerationError,\n} from "./generator";';
  const count=(value:string,needle:string)=>value.split(needle).length-1;
  if(source.includes(importBlock)&&source.includes(replacement)){
    console.log("MAIN_COMPOSER_NORMALIZER_ALREADY_WIRED");
    return;
  }
  if(count(source,old)!==1||count(source,replacement)!==0||
    count(source,anchor)!==1||count(source,importBlock)!==0){
    throw new Error("MAIN_COMPOSER_UNEXPECTED_LAYOUT_NO_FILES_CHANGED");
  }
  source=source.replace(old,replacement);
  source=source.replace(anchor,anchor+"\n\n"+importBlock);
  await writeFile(path,source,"utf8");
  console.log("MAIN_COMPOSER_NORMALIZER_WIRED");
}
main().catch(error=>{
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
