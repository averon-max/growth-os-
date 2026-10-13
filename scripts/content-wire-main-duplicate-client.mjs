/**
 * Idempotent compatibility adapter for older local Growth OS worktree.
 * Does not replace existing UI or overwrite unrelated local edits.
 * No DB, AI, network or other files touched.
 */
import {readFile,writeFile} from "node:fs/promises";
import {resolve} from "node:path";

const path=resolve("src/components/dashboard/content-create-button.tsx");
async function main(){
  let source=await readFile(path,"utf8");
  if(source.includes("CONTENT_TOPIC_ALREADY_EXISTS")){
    console.log("MAIN_DUPLICATE_CLIENT_ALREADY_HANDLED");
    return;
  }
  const pattern=/(\bconst briefJson\s*=\s*await briefResponse\.json\(\);)(\s*)(if\s*\(\s*!briefResponse\.ok\s*\))/g;
  const matches=[...source.matchAll(pattern)];
  if(matches.length!==1){
    throw new Error("MAIN_DUPLICATE_UI_UNEXPECTED_LAYOUT_NO_FILES_CHANGED");
  }
  const addition="\n      // CONTENT_DUPLICATE_REUSE_CLIENT_V1\n      if (\n        !briefResponse.ok &&\n        briefResponse.status===409 &&\n        briefJson?.code===\"CONTENT_TOPIC_ALREADY_EXISTS\"\n      ) {\n        const existingArticle=briefJson.existingArticleId;\n        const existingBrief=briefJson.existingBriefId;\n        if(typeof existingArticle===\"string\"&&existingArticle.length>0){\n          window.location.assign(\n            \"/dashboard/content/articles/\"+encodeURIComponent(existingArticle)\n          );\n          return;\n        }\n        if(typeof existingBrief===\"string\"&&existingBrief.length>0){\n          window.location.assign(\n            \"/dashboard/content?websiteId=\"+encodeURIComponent(websiteId)+\n            \"#brief-\"+encodeURIComponent(existingBrief)\n          );\n          return;\n        }\n        throw new Error(\"An article or brief already exists for this topic.\");\n      }\n";
  source=source.replace(pattern,(_,read,spaces,errorCheck)=>
    read+addition+spaces+errorCheck
  );
  await writeFile(path,source,"utf8");
  console.log("MAIN_DUPLICATE_CLIENT_WIRED");
}
main().catch(error=>{
  console.error(error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
