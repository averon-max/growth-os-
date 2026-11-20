import type { PostInfo } from "@/lib/blog-meta";

/*
 * TEMPLATE. Folders starting with "_" are not published.
 * New post: copy this folder to src/app/blog/<url-of-the-post>/, change `slug` to the same name,
 * then add one line to src/app/blog/posts.ts.
 */
export const post: PostInfo = {
  slug: "how-to-find-keywords-you-can-rank-for",
  title: "How to Find Keywords You Can Actually Rank For",
  description: "A step-by-step way to pick keywords a new site can win in 2–3 months, using free Search Console data and difficulty scores.",
  date: "2026-11-20",
  // updated: "2026-12-15",  — only when the content really changed
  author: "Hyprlyx team",
  tags: ["Keyword research", "Beginners"],
  // cover: "/blog/how-to-find-keywords/cover.webp",
  // coverAlt: "Keyword Planner showing quick wins under 30 difficulty",
  minutes: 7,
  draft: true, // visible on localhost only; delete this line to publish
};
