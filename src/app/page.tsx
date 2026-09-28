import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Globe2,
  Search,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import { LandingReveal } from "@/components/marketing/landing-reveal";
import styles from "./landing.module.css";

export default function HomePage() {
  return (
    <main className={styles.page} data-landing="linear-growth-v6">
      <LandingReveal />

      <div className={styles.gridBackground} />

      <header className={styles.header}>
        <div className={styles.navbar}>
          <Link href="/" className={styles.brand}>
            <Logo />
            <span>Growth OS</span>
          </Link>

          <nav className={styles.nav}>
            <a href="#product">Product</a>
            <a href="#keywords">Keywords</a>
            <a href="#audience">Audience</a>
            <a href="#execution">Automations</a>
            <Link href="/pricing">Pricing</Link>
          </nav>

          <div className={styles.account}>
            <Link href="/login">
              Log in
            </Link>

            <Link href="/signup" className={styles.signup}>
              Sign up
            </Link>
          </div>
        </div>
      </header>

      <section className={styles.hero} id="product">
        <div className={styles.heroCopy} data-reveal>
          <div className={styles.eyebrow}>
            <span className={styles.liveDot} />
            Growth intelligence for operators
          </div>

          <h1>
            Run organic growth
            <span> like a product team.</span>
          </h1>

          <p>
            Connect website intelligence, search demand,
            audience behavior and execution in one operating system.
          </p>

          <div className={styles.heroActions}>
            <Link href="/signup" className={styles.primaryButton}>
              Get started
              <ArrowRight size={12} />
            </Link>

            <a href="#keywords" className={styles.textButton}>
              Explore the product
              <ArrowRight size={11} />
            </a>
          </div>
        </div>

          <div className={styles.productFrame} data-reveal>
            <Image
              src="/landing/hero-keywords.png"
              alt="Growth OS keyword intelligence workspace"
              fill
              priority
              className={styles.productFrameImage}
            />
          </div>

          <div className={styles.integrationStrip}>
          <span>Connected system</span>

          <div>
            <strong>Crawler</strong>
            <strong>Search Console</strong>
            <strong>DataForSEO</strong>
            <strong>Cloudflare</strong>
            <strong>CMS</strong>
          </div>
        </div>
      </section>

      <section className={styles.statement} data-reveal>
        <div className={styles.statementIndex}>
          01
        </div>

        <div>
          <span className={styles.sectionEyebrow}>
            ONE SYSTEM
          </span>

          <h2>
            Less reporting.
            <br />
            More operating.
          </h2>

          <p>
            Growth OS keeps analysis, evidence, priorities and
            execution in the same workspace instead of spreading
            them across disconnected tools.
          </p>
        </div>
      </section>

      <section
        className={styles.featureSection}
        id="keywords"
        data-reveal
      >
        <div className={styles.featureCopy}>
          <span className={styles.sectionEyebrow}>
            02 · KEYWORDS
          </span>

          <h2>
            Search signals
            you can act on.
          </h2>

          <p>
            Ranking history becomes a structured queue of
            opportunities instead of another spreadsheet.
          </p>
        </div>

        <div className={styles.featureShot}>
          <Image
            src="/landing/feature-keywords.png"
            alt="Growth OS keyword detail panel with volume, difficulty and trend data"
            width={2300}
            height={872}
            className={styles.featureShotImage}
          />
        </div>
      </section>

      <section
        className={styles.featureSection}
        id="audience"
        data-reveal
      >
        <div className={styles.featureCopy}>
          <span className={styles.sectionEyebrow}>
            03 · AUDIENCE
          </span>

          <h2>
            Understand what
            reaches the site.
          </h2>

          <p>
            Traffic snapshots stay tied to their source,
            with period controls and real breakdown dimensions.
          </p>
        </div>

        <div className={styles.audiencePanel}>
          <div className={styles.audienceTopbar}>
            <div>
              <Activity size={11} />
              <span>Traffic overview</span>
            </div>

            <div className={styles.periodControl}>
              <span className={styles.periodActive}>7</span>
              <span>15</span>
              <span>30</span>
            </div>
          </div>

          <div className={styles.audienceMetrics}>
            <AudienceMetric
              icon={<Activity size={11} />}
              label="Requests"
            />

            <AudienceMetric
              icon={<Users size={11} />}
              label="Visitor days"
            />

            <AudienceMetric
              icon={<Bot size={11} />}
              label="Verified bots"
            />

            <AudienceMetric
              icon={<Globe2 size={11} />}
              label="Bandwidth"
            />
          </div>

          <div className={styles.audienceBody}>
            <div className={styles.trafficArea}>
              <div className={styles.trafficHeader}>
                <div>
                  <span>Traffic activity</span>
                  <strong>Requests over time</strong>
                </div>

                <span>Cloudflare</span>
              </div>

              <div className={styles.trafficCanvas}>
                <i />
                <i />
                <i />
                <i />

                <div className={styles.snapshotState}>
                  <span className={styles.liveDot} />
                  Synced daily snapshots
                </div>
              </div>
            </div>

            <aside className={styles.breakdowns}>
              <Breakdown
                icon={<Globe2 size={11} />}
                label="Countries"
              />

              <Breakdown
                icon={<Users size={11} />}
                label="Devices"
              />

              <Breakdown
                icon={<Bot size={11} />}
                label="Bot activity"
              />
            </aside>
          </div>
        </div>
      </section>

      <section
        className={styles.executionSection}
        id="execution"
        data-reveal
      >
        <div className={styles.executionHeader}>
          <span className={styles.sectionEyebrow}>
            04 · EXECUTION
          </span>

          <h2>
            Close the loop.
          </h2>

          <p>
            From connected data to analysis, review,
            execution and verification.
          </p>
        </div>

        <div className={styles.pipeline}>
          <PipelineStep
            index="01"
            icon={<Globe2 size={13} />}
            title="Connect"
            detail="Website + sources"
            tone="accent"
          />

          <PipelineStep
            index="02"
            icon={<Search size={13} />}
            title="Analyze"
            detail="Rules + signals"
            tone="accent"
          />

          <PipelineStep
            index="03"
            icon={<Sparkles size={13} />}
            title="Prioritize"
            detail="Opportunity"
            tone="warning"
          />

          <PipelineStep
            index="04"
            icon={<Zap size={13} />}
            title="Apply"
            detail="Approved action"
            tone="accent"
          />

          <PipelineStep
            index="05"
            icon={<CheckCircle2 size={13} />}
            title="Verify"
            detail="Real re-fetch"
            tone="success"
            last
          />
        </div>
      </section>

      <section className={styles.final} data-reveal>
        <div>
          <span className={styles.sectionEyebrow}>
            GROWTH OS
          </span>

          <h2>
            Understand the signal.
            <br />
            Move the work.
          </h2>
        </div>

        <div className={styles.finalRight}>
          <p>
            One operating system for organic growth,
            from first signal to verified outcome.
          </p>

          <div>
            <Link href="/signup" className={styles.primaryButton}>
              Start growing
              <ArrowRight size={12} />
            </Link>

            <Link href="/pricing" className={styles.secondaryButton}>
              Pricing
            </Link>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <Link href="/" className={styles.brand}>
          <Logo />
          <span>Growth OS</span>
        </Link>

        <span>
          SEO intelligence + growth operations
        </span>

        <div>
          <Link href="/pricing">
            Pricing
          </Link>

          <Link href="/login">
            Log in
          </Link>
        </div>
      </footer>
    </main>
  );
}

function Logo() {
  return (
    <span className={styles.logo}>
      <i />
      <i />
      <i />
    </span>
  );
}

function SignalGroup({
  tone,
  title,
  description,
}: {
  tone: string;
  title: string;
  description: string;
}) {
  return (
    <div className={styles.issueRow}>
      <span
        className={styles.statusDot}
        data-tone={tone}
      />

      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>

      <ArrowRight size={11} />
    </div>
  );
}

function AudienceMetric({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className={styles.audienceMetric}>
      <div>
        {icon}
        <span>{label}</span>
      </div>

      <strong>Connected</strong>
    </div>
  );
}

function Breakdown({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className={styles.breakdown}>
      <div>
        {icon}
        <strong>{label}</strong>
      </div>

      <span />
      <span />
      <span />
    </div>
  );
}

function PipelineStep({
  index,
  icon,
  title,
  detail,
  tone,
  last = false,
}: {
  index: string;
  icon: ReactNode;
  title: string;
  detail: string;
  tone: string;
  last?: boolean;
}) {
  return (
    <div className={styles.pipelineStep}>
      <div className={styles.pipelineMeta}>
        <span>{index}</span>

        <i data-tone={tone}>
          {icon}
        </i>
      </div>

      <strong>{title}</strong>
      <span>{detail}</span>

      {!last && (
        <ArrowRight
          size={12}
          className={styles.pipelineArrow}
        />
      )}
    </div>
  );
}
