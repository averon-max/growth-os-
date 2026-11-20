import type { Metadata } from "next";

/** What every blog post declares about itself (code posts: in their own meta.ts). */
export interface PostInfo {
  slug: string;
  title: string;
  description: string;
  date: string;
  updated?: string;
  author?: string;
  tags?: string[];
  cover?: string;
  coverAlt?: string;
  draft?: boolean;
  minutes?: number;
}

export const SITE_URL = "https://hyprlyx.com";

/** page.tsx: export const metadata = postMetadata(post); */
export function postMetadata(post: PostInfo): Metadata {
  const url = `${SITE_URL}/blog/${post.slug}`;
  return {
    title: `${post.title} | Hyprlyx`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    robots: post.draft ? { index: false, follow: false } : undefined,
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.description,
      siteName: "Hyprlyx",
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: [post.author ?? "Hyprlyx team"],
      tags: post.tags,
      images: post.cover ? [{ url: post.cover, alt: post.coverAlt ?? post.title }] : undefined,
    },
    twitter: { card: post.cover ? "summary_large_image" : "summary", title: post.title, description: post.description },
  };
}
