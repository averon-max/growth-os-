import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { SiteShell, siteStyles as s } from "@/components/site/site-shell";
import { FEATURES, featureBySlug } from "@/components/site/features";

export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const f = featureBySlug((await params).slug);
  if (!f) return {};
  return { title: `${f.name} · Hyprlyx`, description: f.lede, alternates: { canonical: `/product/${f.slug}` } };
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const f = featureBySlug((await params).slug);
  if (!f) notFound();
  const i = FEATURES.findIndex((x) => x.slug === f.slug);
  const next = FEATURES[(i + 1) % FEATURES.length];
  const Icon = f.icon;

  return (
    <SiteShell>
      <section className={s.hero}>
        <div className={s.container}>
          <p className={s.eyebrow}><Link href="/product" style={{ color: "inherit", textDecoration: "none" }}>Product</Link> / {f.name}</p>
          <h1 className={s.h1}>{f.title}</h1>
          <p className={s.lede}>{f.lede}</p>
          <div className={s.actions}>
            <Link href="/signup" className={s.pill}>Start free</Link>
            <Link href="/pricing" className={s.textLink}>See pricing <ArrowRight size={15} /></Link>
          </div>
        </div>
        <div className={s.container} style={{ marginTop: 56 }}>
          {f.shot ? (
            <div className={s.shot}><Image src={f.shot.src.replace("-v9", "-v10")} alt={f.shot.alt} width={3200} height={2000} priority unoptimized /></div>
          ) : f.stats ? (
            <div className={s.stats}>{f.stats.map((st) => <div key={st.label} className={s.stat}><b>{st.value}</b><span>{st.label}</span></div>)}</div>
          ) : null}
        </div>
      </section>

      <section className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}>
            <h2 className={s.h2}>What you get</h2>
            <p className={s.muted}>{f.short}.</p>
          </div>
          <div className={f.points.length % 3 === 0 ? s.grid3 : s.grid2}>
            {f.points.map((p) => (
              <div key={p.title} className={s.cell}>
                <span className={s.cellIcon}><Icon size={16} strokeWidth={1.8} /></span>
                <h3>{p.title}</h3><p>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={s.section}>
        <div className={s.container}>
          <div className={s.sectionHead}><h2 className={s.h2}>How it works</h2><span /></div>
          <div className={s.steps}>{f.steps.map((st) => <div key={st} className={s.step}>{st}</div>)}</div>
        </div>
      </section>

      <section className={s.section}>
        <div className={s.narrow}>
          <h2 className={s.h2} style={{ marginBottom: 28 }}>Questions</h2>
          <div className={s.faq}>
            {f.faq.map((q) => <details key={q.q}><summary>{q.q}</summary><p>{q.a}</p></details>)}
            <details><summary>Can I try it for free?</summary><p>Yes. The free plan includes one website — no credit card needed. Upgrade when you need more.</p></details>
          </div>
        </div>
      </section>

      <section className={s.cta}>
        <div className={s.container}>
          <h2 className={s.h2} style={{ fontSize: "clamp(2.2rem,4.6vw,3.5rem)" }}>Try {f.name.toLowerCase()} on your site</h2>
          <div className={s.actions}>
            <Link href="/signup" className={s.pill}>Start free</Link>
            <Link href={`/product/${next.slug}`} className={s.textLink}>Next: {next.name} <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
