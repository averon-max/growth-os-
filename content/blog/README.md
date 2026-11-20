# How to publish a blog post

1. Copy `_template.md` to a new file. **The file name is the URL**: `keyword-research-guide.md` → `hyprlyx.com/blog/keyword-research-guide`.
   Only lowercase letters, numbers and dashes. Never rename a file after it is published (the old URL would break).
2. Fill in the top block:
   - `title` — 50–60 characters, the main keyword near the start.
   - `description` — 140–160 characters, what the reader gets. Shown in Google under the title.
   - `date` — publish date `YYYY-MM-DD`. `updated` — only when you really changed the content.
   - `cover` — optional, put images in `public/blog/<post-name>/`, `.webp`, 1600×900.
   - `draft: true` — visible only on localhost, hidden on the live site. Remove it (or set `false`) to publish.
3. Write the text in Markdown below the `---` line.
4. Check it on http://localhost:3000/blog/<file-name>.
5. Publish: `git add content public/blog && git commit -m "Blog: <title>" && git push origin HEAD:main`
6. Ask search engines to look at it: see "Indexing" below.

## Indexing

- Google: Search Console → URL inspection → paste the URL → Request indexing. One request per new post is enough.
- Bing, Yandex and others: `node scripts/indexnow.mjs` (sends all published posts) or `node scripts/indexnow.mjs https://hyprlyx.com/blog/<file-name>`.
- Sitemaps to submit once in Search Console: `https://hyprlyx.com/sitemap.xml` and `https://hyprlyx.com/blog/sitemap.xml`.
