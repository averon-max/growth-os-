import fs from "fs";
import { runWriter } from "../src/lib/writer/orchestrator";

async function main() {
  const [kw, cat] = process.argv.slice(2);
  const r = await runWriter({
    seedKeyword: kw,
    category: cat as never,
    dataForSeoLogin: process.env.DATAFORSEO_LOGIN!,
    dataForSeoPassword: process.env.DATAFORSEO_PASSWORD!,
    openAiKey: process.env.OPENAI_API_KEY!,
  });
  const out = `/tmp/gos-article-${Date.now()}.md`;
  fs.writeFileSync(out, r.article.bodyMarkdown, "utf-8");
  console.log("saved:", out);
  console.log("log:", r.logFile);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); });
