import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { SiteShell, siteStyles as s } from "@/components/site/site-shell";
import { FEATURES, featureBySlug } from "@/components/site/features";
import { pageMeta, breadcrumbs, ORGANIZATION } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const f = featureBySlug((await params).slug);
  if (!f) return {};
  return pageMeta(f.seoTitle, f.seoDescription, `/product/${f.slug}`);
}

const COMMON_FAQ = [
  { q: "Can I try it for free?", a: "Yes. A free account includes one website and the overview, no card needed. Starter is free for 7 days and unlocks the full toolset." },
];

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const f = featureBySlug((await params).slug);
  if (!f) notFound();
  const faq = [...f.faq, ...COMMON_FAQ];
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${SITE_URL}/product/${f.slug}`,
      name: f.seoTitle,
      description: f.seoDescription,
      url: `${SITE_URL}/product/${f.slug}`,
      isPartOf: { "@type": "WebSite", name: "Hyprlyx", url: SITE_URL },
      about: { "@type": "SoftwareApplication", name: `Hyprlyx ${f.name}`, applicationCategory: "BusinessApplication", operatingSystem: "Web", publisher: ORGANIZATION },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((q) => ({ "@type": "Question", name: q.q, acceptedAnswer: { "@type": "Answer", text: q.a } })),
    },
    {
      "@context": "https://schema.org",
      "@type": "DefinedTermSet",
      name: `${f.name} terms`,
      hasDefinedTerm: f.terms.map((t) => ({ "@type": "DefinedTerm", name: t.term, description: t.def })),
    },
    breadcrumbs([
      { name: "Home", path: "/" },
      { name: "Product", path: "/product" },
      { name: f.name, path: `/product/${f.slug}` },
    ]),
  ];

  return (
    <SiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className={s.hero}>
        <div className={s.container}>
          <p className={s.eyebrow}>
            <Link href="/product">Product</Link> / {f.name}
          </p>
          <h1 className={s.h1}>{f.title}</h1>
          <div className={s.heroRow}>
            <p className={s.lede}>{f.lede}</p>
            <div className={s.actions}>
              <Link href="/signup" className={s.pill}>Start free</Link>
              <Link href="/pricing" className={s.pillDark}>See pricing</Link>
            </div>
          </div>
        </div>
        {f.shot ? (
          <div className={`${s.stage} ${s.lit}`}>
            <div className={f.shot.extra ? s.shotPair : undefined}>
              <div className={s.shot}>
                <Image src={f.shot.src} alt={f.shot.alt} width={f.shot.w ?? 3200} height={f.shot.h ?? 2000} priority quality={90} sizes="(max-width: 1320px) 100vw, 1320px" />
              </div>
              {f.shot.extra ? (
                <div className={s.shot}>
                  <Image src={f.shot.extra.src} alt={f.shot.extra.alt} width={f.shot.extra.w} height={f.shot.extra.h} quality={90} sizes="(max-width: 1320px) 100vw, 800px" />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      {f.gallery?.map((g) => (
        <section key={g.src + g.title} className={s.section}>
          <div className={s.container}>
            <div className={s.sectionHead}>
              <h2 className={s.h2}>{g.title}</h2>
              <p className={s.muted}>{g.text}</p>
            </div>
          </div>
          <div className={s.stage} style={{ marginTop: 0 }}>
            <div className={s.shot}>
              <Image src={g.src} alt={g.alt} width={g.w} height={g.h} quality={90} sizes="(max-width: 1320px) 100vw, 1320px" />
            </div>
          </div>
        </section>
      ))}

      {f.stats ? (
        <section className={s.section}>
          <div className={s.container}>
            <div className={s.stats}>
              {f.stats.map((st) => (
                <div key={st.label} className={s.stat}>
                  <b>{st.value}</b>
                  <span>{st.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <h2 className={s.h2}>{f.name} in Hyprlyx</h2>
            <p className={s.muted}>{f.short}.</p>
          </div>
          <div className={f.points.length === 4 ? s.grid4 : f.points.length % 3 === 0 ? s.grid3 : s.grid2}>
            {f.points.map((p) => (
              <div key={p.title} className={s.cell}>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <h2 className={s.h2}>Key terms</h2>
            <p className={s.muted}>The numbers on this page, in plain words.</p>
          </div>
          <dl className={s.grid2}>
            {f.terms.map((t) => (
              <div key={t.term} className={s.cell}>
                <dt>{t.term}</dt>
                <dd>{t.def}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className={s.section}>
        <div className={s.container}>
          <div className={s.faqWrap}>
            <h2 className={s.h2}>Questions</h2>
            <div className={s.faq}>
              {faq.map((q) => (
                <details key={q.q}>
                  <summary>{q.q}</summary>
                  <p>{q.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <h2 className={s.h2}>More in Hyprlyx</h2>
            <p className={s.muted}>
              Every tool reads the same data. See <Link href="/pricing">pricing</Link> or the <Link href="/product">product overview</Link>.
            </p>
          </div>
          <ul className={s.linkList}>
            {FEATURES.filter((x) => x.slug !== f.slug).map((x) => (
              <li key={x.slug}>
                <Link href={`/product/${x.slug}`}>
                  <b>{x.name}</b>
                  <span>{x.short}</span>
                  <ArrowRight size={15} aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={s.cta}>
        <h2 className={s.h2}>Try {f.name.toLowerCase()}.</h2>
        <div className={s.actions}>
          <Link href="/signup" className={s.pill}>Get started</Link>
          <Link href="/support" className={s.pillDark}>Contact us</Link>
        </div>
      </section>
    </SiteShell>
  );
}
