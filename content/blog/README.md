# How to publish a blog post

The file is the post: `content/blog/<slug>.md` → `https://hyprlyx.com/blog/<slug>`.
Never rename a published file (the old URL would break).

## The quick way (two steps)

1. Open a new chat, paste `docs/BLOG_PROMPT.md` and add the topic at the end. Copy the Markdown block it returns.
2. In the terminal:

   ```
   cd ~/growth-os && npm run post:paste -- --publish
   ```

   It reads the clipboard, saves `content/blog/<slug>.md`, checks it, commits, pushes to `main`,
   waits until the page is live and pings Bing/Yandex (IndexNow).
   Then in Google Search Console: URL inspection → paste the URL → Request indexing.

Want to look first? `npm run post:paste` (without `--publish`), open http://localhost:3000/blog/<slug>
(`npm run dev`), then `npm run post:publish -- <slug>`.

## Other commands

| Command | What it does |
|---|---|
| `npm run post:new -- "Title"` | empty post from `_template.md` (draft) |
| `npm run post:check` | checks every post: title/description length, date, headings, images, internal links |
| `npm run post:publish -- <slug>` | checks, turns `draft` off, commits, pushes, pings IndexNow when live |
| `npm run post:list` | every post with its state |
| `npm run post:paste -- file.md` | same as paste, from a file instead of the clipboard |
| `npm run post:paste -- --force` | replace an existing post with the same slug (the URL stays) |

## Front matter

- `title` — 50–60 characters, the main keyword near the start.
- `description` — 140–160 characters, what the reader gets. Shown in Google under the title.
- `date` — `YYYY-MM-DD` (paste fills today). `updated` — only when you really changed the content.
- `cover` — optional, `public/blog/<slug>/cover.webp`, 1600×900.
- `draft: true` — visible only on localhost, hidden on the live site.
- `slug:` in a pasted article only picks the file name; it is removed from the file.

Images go to `public/blog/<slug>/` as `.webp` and are linked as `/blog/<slug>/name.webp`.

## Code posts (rare)

For a post that needs its own components, copy `src/app/blog/_template/` to `src/app/blog/<slug>/`,
edit `meta.ts` and `page.tsx`, then run `node scripts/sync-posts.mjs`. Google sees the same HTML either way,
so Markdown is the normal route.

## Indexing

- Google: Search Console → URL inspection → Request indexing (one request per new post).
- Bing, Yandex and others: done by `post:publish`; by hand: `node scripts/indexnow.mjs https://hyprlyx.com/blog/<slug>`.
- Sitemaps (submit once): `https://hyprlyx.com/sitemap.xml` and `https://hyprlyx.com/blog/sitemap.xml`.
