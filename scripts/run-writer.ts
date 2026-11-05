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
  const a = r.article.bodyMarkdown;
  console.log("H1:", r.article.h1);
  console.log("H2:", a.match(/^## .+/gm));
  console.log("H3:", a.match(/^### .+/gm));
  console.log("words:", r.article.totalWordCount, "| code blocks:", Math.floor((a.match(/```/g) || []).length / 2));
  console.log("log:", r.logFile);
}
main().catch((e) => { console.error("FAIL:", e); process.exit(1); });
