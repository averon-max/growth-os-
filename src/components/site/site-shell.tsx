import Link from "next/link";
import { Geist_Mono, Newsreader } from "next/font/google";
import { ChevronDown, Menu } from "lucide-react";
import { FEATURES } from "./features";
import s from "./site.module.css";

const display = Newsreader({ subsets: ["latin"], variable: "--font-landing-display", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-landing-mono", display: "swap" });


const FOOTER = [
  { title: "Product", links: [{ label: "Overview", href: "/product" }, ...FEATURES.map((f) => ({ label: f.name, href: `/product/${f.slug}` })), { label: "Pricing", href: "/pricing" }, { label: "Changelog", href: "/changelog" }] },
  { title: "Company", links: [{ label: "About", href: "/about" }, { label: "Contact", href: "/support" }] },
  { title: "Resources", links: [{ label: "Support", href: "/support" }, { label: "Log in", href: "/login" }, { label: "Sign up", href: "/signup" }] },
  { title: "Legal", links: [{ label: "Terms of Service", href: "/terms" }, { label: "Privacy Policy", href: "/privacy" }, { label: "Cookie Policy", href: "/cookies" }] },
];

export function SiteHeader() {
  return (
    <header className={s.nav}>
      <div className={s.navInner}>
        <Link href="/" className={s.brand}>Hyprlyx</Link>

        <nav className={s.navCenter} aria-label="Main">
          <div className={s.drop}>
            <Link href="/product" className={s.navLink}>Product <ChevronDown size={14} /></Link>
            <div className={s.dropPanel}>
              <div className={s.dropGrid}>
                {FEATURES.map((f) => {
                  const Icon = f.icon;
                  return (
                    <Link key={f.slug} href={`/product/${f.slug}`} className={s.dropItem}>
                      <span className={s.dropIcon}><Icon size={16} strokeWidth={1.8} /></span>
                      <span><b>{f.name}</b><small>{f.short}</small></span>
                    </Link>
                  );
                })}
              </div>
              <Link href="/product" className={s.dropFoot}>Product overview →</Link>
            </div>
          </div>
          <Link href="/pricing" className={s.navLink}>Pricing</Link>
          <Link href="/changelog" className={s.navLink}>Changelog</Link>
          <Link href="/support" className={s.navLink}>Support</Link>
        </nav>

        <div className={s.navRight}>
          <Link href="/login" className={s.navLink}>Log in</Link>
          <Link href="/signup" className={s.pill}>Sign up</Link>
          <details className={s.menu}>
            <summary aria-label="Open menu"><Menu size={22} strokeWidth={1.7} /></summary>
            <div className={s.menuPanel}>
              <Link href="/product">Product</Link>
              {FEATURES.map((f) => <Link key={f.slug} href={`/product/${f.slug}`} className={s.menuSub}>{f.name}</Link>)}
              <Link href="/pricing">Pricing</Link>
              <Link href="/changelog">Changelog</Link>
              <Link href="/support">Support</Link>
              <Link href="/login">Log in</Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className={s.footer}>
      <div className={s.container}>
        <div className={s.footerGrid}>
          <div className={s.footerBrand}>
            <Link href="/" className={s.brand}>Hyprlyx</Link>
            <p>The SEO workspace for teams that publish.</p>
            <a href="mailto:support@hyprlyx.com" className={s.footerMail}>support@hyprlyx.com</a>
          </div>
          {FOOTER.map((col) => (
            <nav key={col.title} className={s.footerCol} aria-label={col.title}>
              <h3>{col.title}</h3>
              <ul>{col.links.map((l) => <li key={l.label}><Link href={l.href}>{l.label}</Link></li>)}</ul>
            </nav>
          ))}
        </div>
        <div className={s.footerBottom}>
          <span>© {new Date().getFullYear()} Hyprlyx. All rights reserved.</span>
          <span>hyprlyx.com</span>
        </div>
      </div>
    </footer>
  );
}

/** Wraps every public marketing page: same fonts, header and footer. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${s.page} ${display.variable} ${mono.variable}`}>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

export { s as siteStyles };
