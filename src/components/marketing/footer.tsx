import Link from "next/link";
import { Container } from "@/components/ui/container";

const columns = [
  {
    title: "Product",
    links: ["Features", "Keyword Intelligence", "Audience", "Automation", "Pricing"],
  },
  {
    title: "Resources",
    links: ["Documentation", "Blog", "Guides", "Changelog"],
  },
  {
    title: "Company",
    links: ["About", "Contact", "Security", "Privacy", "Terms"],
  },
];

export function Footer() {
  return (
    <footer className="py-16">
      <Container>
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-[5px] bg-[var(--accent)]">
                <span className="block h-1.5 w-1.5 rounded-full bg-[#12130f]" />
              </span>
              <span className="font-display text-[0.95rem] font-semibold">Signal</span>
            </div>
            <p className="mt-4 max-w-[220px] text-[0.8rem] text-[var(--text-faint)]">Your website, continuously improved.</p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="eyebrow mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link href="#" className="text-[0.83rem] text-[var(--text-dim)] hover:text-[var(--text)]">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-[var(--border)] pt-8 text-[0.75rem] text-[var(--text-faint)] sm:flex-row">
          <span>© 2026 Signal. All rights reserved.</span>
          <div className="flex gap-5">
            <Link href="#" className="hover:text-[var(--text-dim)]">Twitter</Link>
            <Link href="#" className="hover:text-[var(--text-dim)]">LinkedIn</Link>
            <Link href="#" className="hover:text-[var(--text-dim)]">GitHub</Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
