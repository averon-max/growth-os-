import Link from "next/link";
import { Article, H2 } from "@/components/blog/article";
import { postMetadata } from "@/lib/blog-meta";
import { post } from "./meta";

export const metadata = postMetadata(post);

// Headings listed here appear in "On this page" (use the same text as the <H2>s).
const TOC = ["Why most new sites pick the wrong keywords", "Step 1: Start from Search Console", "Key takeaways"];

export default function Page() {
  return (
    <Article post={post} toc={TOC}>
      <p>
        Start with one or two sentences that answer the question right away. Then say what the reader will be able to do by the end.
      </p>

      <H2>Why most new sites pick the wrong keywords</H2>
      <p>
        Plain paragraphs, <strong>bold</strong>, <em>italic</em> and links to your own pages: <Link href="/product/keywords">keyword research</Link>.
        Links to other sites: <a href="https://developers.google.com/search/docs" target="_blank" rel="noopener">Google&apos;s guide</a>.
      </p>

      <h3>A smaller heading inside a section</h3>
      <ul>
        <li>A bullet list</li>
        <li>One idea per line</li>
      </ul>

      <H2>Step 1: Start from Search Console</H2>
      <ol>
        <li>A numbered list</li>
        <li>For steps in order</li>
      </ol>
      <blockquote><p>A quote or an important takeaway.</p></blockquote>

      {/* Images: put the file in public/blog/<post>/ and point to it from the root. */}
      {/* <figure><img src="/blog/how-to-find-keywords/planner.webp" alt="Keyword Planner with difficulty under 30" loading="lazy" width={1600} height={1000} /><figcaption>Quick wins in Keyword Planner</figcaption></figure> */}

      <div className="table">
        <table>
          <thead><tr><th>Keyword</th><th>Volume</th><th>Difficulty</th></tr></thead>
          <tbody>
            <tr><td>free credit monitoring</td><td>135K</td><td>61</td></tr>
            <tr><td>credit freeze vs lock</td><td>2.9K</td><td>22</td></tr>
          </tbody>
        </table>
      </div>

      <H2>Key takeaways</H2>
      <p>End with a short summary or a checklist the reader can follow.</p>
    </Article>
  );
}
