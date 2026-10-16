/**
 * Export EXACT saved Markdown for one final human editorial review.
 * Free, READ ONLY database operation, no remote APIs and no writes.
 *
 * GROWTH_OS_ENV_DIR=/Users/user/growth-os NODE_OPTIONS=--conditions=react-server \
 * npx tsx scripts/content-export-existing-article-review.ts --article=ID \
 *   > .growth-os-tmp/credit-monitoring-current-article.md
 *
 * The output is the original unmodified Markdown bytes on stdout.
 * Metadata and fingerprint appear on stderr so redirection cannot
 * corrupt bodyMarkdown. Does not leak tokens or credentials.
 */
import {loadEnvConfig} from "@next/env";
loadEnvConfig(process.env.GROWTH_OS_ENV_DIR?.trim()||process.cwd());
async function main(){
  const args=process.argv.slice(2);
  const id=args.find(x=>x.startsWith("--article="))?.slice(10);
  if(args.length!==1||!id||!/^[a-z0-9_-]{5,100}$/i.test(id))
    throw new Error("USAGE: --article=SAVED_ID (READ_ONLY)");
  const {prisma}=await import("../src/lib/prisma");
  try{
    const article=await prisma.contentArticle.findUnique({
      where:{id},select:{
        id:true,status:true,title:true,bodyMarkdown:true,
        h1:true,metaDescription:true,updatedAt:true,
      },
    });
    if(!article)throw new Error("EXISTING_ARTICLE_NOT_FOUND");
    const {buildSerpReplayArticleFingerprintV1}=
      await import("../src/lib/content/serp-replay-fingerprint");
    const fingerprint=buildSerpReplayArticleFingerprintV1(article);
    process.stderr.write(JSON.stringify({
      mode:"READ_ONLY_EXACT_SAVED_ARTICLE_EXPORT",
      articleId:article.id,status:article.status,
      title:article.title,updatedAt:article.updatedAt.toISOString(),
      fingerprint,bytes:Buffer.byteLength(article.bodyMarkdown,"utf8"),
      remoteCalls:0,databaseUnchanged:true,
    })+"\n");
    process.stdout.write(article.bodyMarkdown);
    if(!article.bodyMarkdown.endsWith("\n"))process.stdout.write("\n");
  }finally{await prisma.$disconnect();}
}
main().catch(error=>{
  console.error("EXACT_SAVED_ARTICLE_EXPORT_STOPPED:",
    error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
