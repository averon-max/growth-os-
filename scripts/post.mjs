#!/usr/bin/env node
/*
 * Blog posts in two commands (no editor, no admin page; the file is the post).
 *
 *   npm run post:paste                       save the article you copied (front matter + Markdown) as content/blog/<slug>.md
 *   npm run post:paste -- --publish          … and publish it straight away
 *   npm run post:new -- "Post title"         start an empty post from content/blog/_template.md
 *   npm run post:check                       check every post (title, description, links, images)
 *   npm run post:publish -- <slug>           check one post, switch draft off, commit, push, then ping Bing/Yandex
 *   npm run post:list                        every post with its state
 *
 * The file name is the URL: content/blog/<slug>.md → https://hyprlyx.com/blog/<slug>. Never rename a published file.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync, spawnSync } from "node:child_process";

const ROOT = process.cwd();
const DIR = path.join(ROOT, "content", "blog");
const PUBLIC = path.join(ROOT, "public");
const SITE = "https://hyprlyx.com";
const BRANCH_TARGET = "HEAD:main"; // the site deploys from main on Vercel

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim = (s) => `\x1b[2m${s}\x1b[0m`;

const slugify = (s) =>
  s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 80).replace(/-$/, "");
const today = () => new Date().toISOString().slice(0, 10);

function parse(raw) {
  const m = raw.replace(/^﻿/, "").match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: raw, ok: false };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i < 1) continue;
    data[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { data, body: m[2], ok: true };
}

/** Product pages that exist on the site (for checking internal links). */
function productSlugs() {
  try {
    const src = fs.readFileSync(path.join(ROOT, "src/components/site/features.ts"), "utf8");
    return new Set([...src.matchAll(/slug: "([a-z0-9-]+)"/g)].map((m) => m[1]));
  } catch {
    return new Set();
  }
}
const STATIC_PAGES = new Set(["/", "/pricing", "/product", "/blog", "/about", "/signup", "/login", "/changelog", "/support", "/privacy", "/terms", "/cookies"]);

function postFiles() {
  return fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => /^[a-z0-9-]+\.md$/.test(f)) : [];
}

/** Errors stop a publish; warnings are advice. */
function check(slug, raw) {
  const errors = [];
  const warnings = [];
  const { data, body, ok } = parse(raw);
  if (!ok) errors.push("No front matter: the file must start with --- and the title/description/date block.");
  if (!/^[a-z0-9-]+$/.test(slug)) errors.push(`File name "${slug}" may only use a–z, 0–9 and dashes.`);
  const title = data.title ?? "";
  const description = data.description ?? "";
  if (!title) errors.push("title is missing.");
  else if (title.length < 40 || title.length > 65) warnings.push(`title is ${title.length} characters (best 50–60).`);
  if (!description) errors.push("description is missing.");
  else if (description.length < 120 || description.length > 165) warnings.push(`description is ${description.length} characters (best 140–160).`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date ?? "")) errors.push("date must look like 2026-11-28.");
  else if (data.date > today()) warnings.push(`date ${data.date} is in the future; the post shows that date.`);
  if (data.updated && !/^\d{4}-\d{2}-\d{2}$/.test(data.updated)) errors.push("updated must be empty or look like 2026-11-28.");
  if (data.cover && !fs.existsSync(path.join(PUBLIC, data.cover))) errors.push(`cover ${data.cover} is not in public/.`);
  if (/^#\s/m.test(body)) errors.push("Do not use a single # heading in the text: the title is already the H1. Start sections with ##.");
  const h2 = (body.match(/^##\s/gm) ?? []).length;
  if (h2 < 3) warnings.push(`only ${h2} sections (##); 4–8 read best.`);
  const words = body.split(/\s+/).filter(Boolean).length;
  if (words < 600) warnings.push(`${words} words; most posts that rank have 1,200+.`);
  const products = productSlugs();
  const posts = new Set(postFiles().map((f) => f.replace(/\.md$/, "")));
  let internal = 0;
  for (const m of body.matchAll(/!?\[[^\]]*\]\(([^)\s]+)\)/g)) {
    const href = m[1];
    const isImage = m[0].startsWith("!");
    if (isImage) {
      if (href.startsWith("/") && !fs.existsSync(path.join(PUBLIC, href))) errors.push(`image ${href} is not in public/.`);
      continue;
    }
    if (!href.startsWith("/")) continue;
    internal++;
    const clean = href.split(/[?#]/)[0].replace(/\/$/, "") || "/";
    if (clean.startsWith("/blog/")) {
      if (!posts.has(clean.slice(6))) errors.push(`link ${href}: there is no post with that name.`);
    } else if (clean.startsWith("/product/")) {
      if (!products.has(clean.slice(9))) errors.push(`link ${href}: there is no product page with that name (${[...products].join(", ")}).`);
    } else if (!STATIC_PAGES.has(clean)) {
      warnings.push(`link ${href}: not a known page, check it.`);
    }
  }
  if (internal === 0) warnings.push("no links to other Hyprlyx pages; add 2–4 (product pages or other posts).");
  return { errors, warnings, data, words };
}

function report(slug, res) {
  const head = `${slug}  ${dim(`${res.words} words${res.data.draft === "true" ? " · draft" : ""}`)}`;
  if (!res.errors.length && !res.warnings.length) return console.log(`${green("✓")} ${head}`);
  console.log(`${res.errors.length ? red("✗") : yellow("!")} ${head}`);
  for (const e of res.errors) console.log(`    ${red("error")}  ${e}`);
  for (const w of res.warnings) console.log(`    ${yellow("note")}   ${w}`);
}

function git(cmd) {
  return execSync(`git ${cmd}`, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
}

async function waitAndPing(url) {
  // Bing/Yandex fetch the page when pinged, so wait until the deploy is live (usually 1–3 minutes).
  process.stdout.write(dim(`Waiting for ${url} to go live`));
  for (let i = 0; i < 36; i++) {
    try {
      const r = await fetch(url, { method: "GET", redirect: "follow" });
      if (r.ok) {
        console.log(" — live.");
        const run = spawnSync("node", ["scripts/indexnow.mjs", url], { cwd: ROOT, stdio: "inherit" });
        if (run.status !== 0) console.log(yellow("IndexNow did not go through; run later: node scripts/indexnow.mjs " + url));
        return true;
      }
    } catch {
      /* not live yet */
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, 10_000));
  }
  console.log(yellow("\nNot live after 6 minutes. Check Vercel, then run: node scripts/indexnow.mjs " + url));
  return false;
}

async function publish(slug) {
  const file = path.join(DIR, `${slug}.md`);
  if (!fs.existsSync(file)) {
    console.log(red(`content/blog/${slug}.md does not exist.`));
    process.exit(1);
  }
  let raw = fs.readFileSync(file, "utf8");
  const res = check(slug, raw);
  report(slug, res);
  if (res.errors.length) {
    console.log(red("Fix the errors above, then run the command again."));
    process.exit(1);
  }
  // Draft off.
  raw = raw.replace(/^draft:\s*true\s*$/m, "draft: false");
  fs.writeFileSync(file, raw);
  const assets = path.join(PUBLIC, "blog", slug);
  git(`add "content/blog/${slug}.md"${fs.existsSync(assets) ? ` "public/blog/${slug}"` : ""}`);
  const staged = git("diff --cached --name-only");
  if (!staged) {
    console.log(dim("Nothing new to commit (already published?). Pushing anyway."));
  } else {
    execSync(`git commit -q -m ${JSON.stringify(`Blog: ${res.data.title}`)}`, { cwd: ROOT, stdio: "inherit" });
  }
  execSync(`git push -q origin ${BRANCH_TARGET}`, { cwd: ROOT, stdio: "inherit" });
  const url = `${SITE}/blog/${slug}`;
  console.log(green(`Pushed. Vercel deploys it in 1–3 minutes: ${url}`));
  console.log(dim("Google: Search Console → URL inspection → paste the URL → Request indexing."));
  await waitAndPing(url);
}

function save(raw, { force = false } = {}) {
  const { data, ok } = parse(raw);
  if (!ok || !data.title) {
    console.log(red("That text has no front matter with a title. Copy the whole article, starting from the first --- line."));
    process.exit(1);
  }
  const slug = slugify(data.slug || data.title);
  // "slug:" is only a helper for this script; the file name is the URL, so drop it from the file.
  let clean = raw.replace(/^﻿/, "").replace(/^slug:.*\r?\n/m, "");
  if (!/^date:\s*\d{4}-\d{2}-\d{2}/m.test(clean)) clean = clean.replace(/^---\r?\n/, `---\ndate: ${today()}\n`);
  const file = path.join(DIR, `${slug}.md`);
  if (fs.existsSync(file) && !force) {
    console.log(red(`content/blog/${slug}.md already exists. Add --force to replace it (the URL stays the same).`));
    process.exit(1);
  }
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(file, clean.endsWith("\n") ? clean : clean + "\n");
  console.log(green(`Saved content/blog/${slug}.md`) + dim(`  → ${SITE}/blog/${slug}`));
  report(slug, check(slug, clean));
  return slug;
}

function readClipboard() {
  for (const cmd of ["pbpaste", "wl-paste", "xclip -selection clipboard -o", "powershell -command Get-Clipboard"]) {
    try {
      const out = execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] }).toString();
      if (out.trim()) return out;
    } catch {
      /* try the next one */
    }
  }
  return "";
}

const [cmd, ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter((a) => a.startsWith("--")));
const args = rest.filter((a) => !a.startsWith("--"));

if (cmd === "new") {
  const title = args.join(" ").trim();
  if (!title) {
    console.log('Usage: npm run post:new -- "Post title"');
    process.exit(1);
  }
  const tpl = fs.readFileSync(path.join(DIR, "_template.md"), "utf8");
  const slug = slugify(title);
  const raw = tpl
    .replace(/^title:.*$/m, `title: ${title}`)
    .replace(/^date:.*$/m, `date: ${today()}`)
    .replace(/^cover:.*$/m, "cover:")
    .replace(/^coverAlt:.*$/m, "coverAlt:")
    .replace(/^!\[[^\]]*\]\([^)]*\)\s*$/gm, ""); // the template's sample image does not exist
  save(raw.replace(/^---\r?\n/, `---\nslug: ${slug}\n`), { force: flags.has("--force") });
  console.log(dim(`Open content/blog/${slug}.md, write, then: npm run post:publish -- ${slug}`));
} else if (cmd === "paste" || cmd === "save") {
  const file = args[0];
  const raw = file ? fs.readFileSync(file, "utf8") : readClipboard();
  if (!raw.trim()) {
    console.log(red("The clipboard is empty. Copy the whole article first (or pass a file: npm run post:paste -- article.md)."));
    process.exit(1);
  }
  const slug = save(raw, { force: flags.has("--force") });
  if (flags.has("--publish")) await publish(slug);
  else console.log(dim(`Check it on http://localhost:3000/blog/${slug}, then: npm run post:publish -- ${slug}`));
} else if (cmd === "check") {
  const files = args.length ? args.map((s) => `${s.replace(/\.md$/, "")}.md`) : postFiles();
  if (!files.length) console.log(dim("No posts yet."));
  let bad = 0;
  for (const f of files) {
    const p = path.join(DIR, f);
    if (!fs.existsSync(p)) { console.log(red(`content/blog/${f} does not exist.`)); bad++; continue; }
    const res = check(f.replace(/\.md$/, ""), fs.readFileSync(p, "utf8"));
    report(f.replace(/\.md$/, ""), res);
    if (res.errors.length) bad++;
  }
  process.exit(bad ? 1 : 0);
} else if (cmd === "publish") {
  if (!args[0]) {
    console.log("Usage: npm run post:publish -- <slug>");
    process.exit(1);
  }
  await publish(args[0].replace(/\.md$/, ""));
} else if (cmd === "list") {
  for (const f of postFiles()) {
    const { data } = parse(fs.readFileSync(path.join(DIR, f), "utf8"));
    console.log(`${data.draft === "true" ? yellow("draft    ") : green("published")}  ${data.date ?? "????-??-??"}  ${f.replace(/\.md$/, "")}  ${dim(data.title ?? "")}`);
  }
} else {
  console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").slice(2, 12).join("\n").replace(/^ \* ?/gm, ""));
}
