// IndexNow: tells Bing, Yandex, Seznam and Naver right away that a page is new or changed. (Google does not use IndexNow.)
//
//   node scripts/indexnow.mjs init                         create the key file in public/ (once, then deploy)
//   node scripts/indexnow.mjs                              send every published blog post + the blog index
//   node scripts/indexnow.mjs https://hyprlyx.com/blog/x   send specific URLs
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const HOST = "hyprlyx.com";
const PUBLIC = path.join(process.cwd(), "public");
const BLOG = path.join(process.cwd(), "content", "blog");
const findKey = () => fs.readdirSync(PUBLIC).map((f) => f.match(/^([a-f0-9]{32})\.txt$/)?.[1]).find(Boolean);

const args = process.argv.slice(2);
if (args[0] === "init") {
  const existing = findKey();
  if (existing) { console.log(`Key already exists: public/${existing}.txt`); process.exit(0); }
  const key = crypto.randomBytes(16).toString("hex");
  fs.writeFileSync(path.join(PUBLIC, `${key}.txt`), key);
  console.log(`Created public/${key}.txt — commit and deploy it, then run: node scripts/indexnow.mjs`);
  process.exit(0);
}

const key = findKey();
if (!key) { console.error("No key yet. Run: node scripts/indexnow.mjs init — then deploy."); process.exit(1); }

let urls = args.filter((a) => a.startsWith("https://"));
if (urls.length === 0) {
  const posts = fs.existsSync(BLOG) ? fs.readdirSync(BLOG).filter((f) => /^[a-z0-9-]+\.md$/.test(f)) : [];
  const published = posts.filter((f) => !/^draft:\s*true\s*$/m.test(fs.readFileSync(path.join(BLOG, f), "utf8")));
  urls = [`https://${HOST}/blog`, ...published.map((f) => `https://${HOST}/blog/${f.replace(/\.md$/, "")}`)];
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key, keyLocation: `https://${HOST}/${key}.txt`, urlList: urls }),
});
console.log(res.status === 200 || res.status === 202 ? `Sent ${urls.length} URL(s). Status ${res.status}.` : `IndexNow answered ${res.status}: ${await res.text()}`);
