import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  FileText,
  Gauge,
  Globe2,
  Search,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

import { LandingReveal } from "@/components/marketing/landing-reveal";
import styles from "./landing.module.css";

const presets = [
  ["Quick Wins", Zap],
  ["High Volume", BarChart3],
  ["Low Difficulty", Target],
  ["Commercial", CircleDot],
  ["Top 10", TrendingUp],
  ["Near Page 1", TrendingUp],
] as const;

const signals = [
  {
    tone: "success",
    name: "Quick wins",
    description: "Ranking 11–20 with meaningful impressions.",
  },
  {
    tone: "warning",
    name: "High impressions, low CTR",
    description: "Visible often in search but clicked less than expected.",
  },
  {
    tone: "danger",
    name: "Declining",
    description: "Average position is getting worse over time.",
  },
  {
    tone: "accent",
    name: "Growing",
    description: "Average position is improving from ranking history.",
  },
] as const;

export default function HomePage() {
  return (
    <main className={styles.page} data-landing="linear-growth-v6">
      <LandingReveal />

      <div className={styles.gridBackground} />
      <div className={styles.ambientTop} />

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
          <div className={styles.appTopbar}>
            <div className={styles.appBrand}>
              <Logo />
              <span>Growth OS</span>

              <i />

              <span className={styles.websitePicker}>
                Website
                <ChevronDown size={9} />
              </span>
            </div>

            <span className={styles.workspaceName}>
              Workspace
            </span>

            <div className={styles.appTools}>
              <Search size={11} />
              <span>⌘ K</span>
              <b>G</b>
            </div>
          </div>

          <div className={styles.appBody}>
            <aside className={styles.sidebar}>
              <Sidebar icon={<Gauge size={12} />} label="Overview" />
              <Sidebar icon={<CircleDot size={12} />} label="SEO" />
              <Sidebar icon={<Search size={12} />} label="Keywords" active />
              <Sidebar icon={<Users size={12} />} label="Audience" />
              <Sidebar icon={<FileText size={12} />} label="Content" />
              <Sidebar icon={<Sparkles size={12} />} label="Opportunities" />
              <Sidebar icon={<Zap size={12} />} label="Automations" />
              <Sidebar icon={<BarChart3 size={12} />} label="Reports" />

              <div className={styles.sidebarFooter}>
                <Sidebar
                  icon={<Settings size={12} />}
                  label="Settings"
                />
              </div>
            </aside>

            <div className={styles.workspace}>
              <div className={styles.workspaceHeader}>
                <div>
                  <span>Search intelligence</span>
                  <strong>Keywords</strong>
                </div>

                <div className={styles.headerActions}>
                  <button type="button">
                    🇺🇸 United States
                    <ChevronDown size={9} />
                  </button>

                  <button
                    type="button"
                    className={styles.syncButton}
                  >
                    Sync now
                    <ArrowRight size={10} />
                  </button>
                </div>
              </div>

              <div className={styles.presetRow}>
                {presets.map(([label, Icon]) => (
                  <button key={label} type="button">
                    <Icon size={10} />
                    {label}
                  </button>
                ))}
              </div>

              <div className={styles.workspaceContent}>
                <section className={styles.signalPanel}>
                  <PanelHeader
                    kicker="Ranking history"
                    title="Signals"
                    source="Search Console"
                  />

                  <div>
                    {signals.map((signal) => (
                      <SignalRow
                        key={signal.name}
                        tone={signal.tone}
                        name={signal.name}
                        description={signal.description}
                      />
                    ))}
                  </div>
                </section>

                <section className={styles.explorerPanel}>
                  <PanelHeader
                    kicker="Keyword explorer"
                    title="Market + ranking metrics"
                    source="GSC · DataForSEO"
                  />

                  <div className={styles.explorerToolbar}>
                    <div>
                      <Search size={10} />
                      Search keywords
                    </div>

                    <button type="button">
                      Filters
                    </button>
                  </div>

                  <div className={styles.tableHeader}>
                    <span>Keyword</span>
                    <span>Position</span>
                    <span>Volume</span>
                    <span>Difficulty</span>
                  </div>

                  <div className={styles.connectedState}>
                    <div className={styles.connectedIcon}>
                      <Search size={16} />
                    </div>

                    <strong>
                      Connected keyword intelligence
                    </strong>

                    <p>
                      Rankings come from Search Console.
                      Market metrics are enriched independently.
                    </p>

                    <div className={styles.sourceTags}>
                      <span>Search Console</span>
                      <span>DataForSEO</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
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

        <div className={styles.issueView}>
          <div className={styles.issueTopbar}>
            <div>
              <Zap size={11} />
              <span>Keyword signals</span>
            </div>

            <span>
              Ranking history
            </span>
          </div>

          <SignalGroup
            tone="success"
            title="Quick wins"
            description="Ranking 11–20 with meaningful impressions."
          />

          <SignalGroup
            tone="warning"
            title="High impressions, low CTR"
            description="Frequently visible in search but under-clicked."
          />

          <SignalGroup
            tone="danger"
            title="Declining"
            description="Average position has started moving down."
          />

          <SignalGroup
            tone="accent"
            title="Growing"
            description="Ranking history is moving in the right direction."
          />

          <SignalGroup
            tone="muted"
            title="Lost"
            description="Fresh ranking data is no longer available."
          />

          <SignalGroup
            tone="danger"
            title="Cannibalization"
            description="Multiple pages compete for the same keyword."
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

function Sidebar({
  icon,
  label,
  active = false,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={
        active
          ? `${styles.sidebarItem} ${styles.sidebarActive}`
          : styles.sidebarItem
      }
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function PanelHeader({
  kicker,
  title,
  source,
}: {
  kicker: string;
  title: string;
  source: string;
}) {
  return (
    <div className={styles.panelHeader}>
      <div>
        <span>{kicker}</span>
        <strong>{title}</strong>
      </div>

      <span>{source}</span>
    </div>
  );
}

function SignalRow({
  tone,
  name,
  description,
}: {
  tone: string;
  name: string;
  description: string;
}) {
  return (
    <div className={styles.signalRow}>
      <span
        className={styles.statusDot}
        data-tone={tone}
      />

      <div>
        <strong>{name}</strong>
        <span>{description}</span>
      </div>

      <ArrowRight size={10} />
    </div>
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
