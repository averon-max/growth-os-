import styles from "./growth-os-landing.module.css";

export function GrowthOsLanding() {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logo}>
            <span className={styles.logoMark} />
            Growth OS
          </div>
          <div className={styles.navLinks}>
            <a href="#how">How it works</a>
            <a href="#features">Product</a>
            <a href="#">Pricing</a>
            <a href="#">Customers</a>
          </div>
          <div className={styles.navCta}>
            <a className={`${styles.btn} ${styles.btnGhost}`} href="#">Log in</a>
            <a className={`${styles.btn} ${styles.btnPrimary}`} href="#">Get started</a>
          </div>
        </div>
      </nav>

      <header className={styles.hero}>
        <div className={`${styles.wrap} ${styles.heroGrid}`}>
          <div>
            <div className={`${styles.eyebrowLine} ${styles.heroReveal}`}>
              <span className={styles.dot} />
              Now monitoring 4,200+ websites
            </div>
            <h1 className={`${styles.headline} ${styles.heroReveal}`}>
              Your website&apos;s <span className={styles.accentWord}>growth engine</span>, running in the background.
            </h1>
            <p className={`${styles.heroSub} ${styles.heroReveal}`}>
              Growth OS crawls your site, finds what&apos;s holding back your traffic, and fixes it — with your approval at every step. No SEO degree required.
            </p>
            <div className={`${styles.heroForm} ${styles.heroReveal}`}>
              <input className={styles.heroInput} type="text" placeholder="yourbusiness.com" />
              <button className={`${styles.btn} ${styles.btnPrimary}`}>Analyze my site</button>
            </div>
            <p className={`${styles.heroNote} ${styles.heroReveal}`}>Free crawl, no card needed. Takes about 90 seconds.</p>
          </div>

          <div className={styles.loopCard}>
            <div className={styles.loopCardHead}>
              <span className={styles.loopCardTitle}>scanmycreds.com</span>
              <span className={styles.loopCardBadge}>● live</span>
            </div>
            <svg className={styles.loop} viewBox="0 0 300 300">
              <circle className={styles.loopRing} cx="150" cy="150" r="118" />
              <circle className={styles.traveler} r="4" />
              <g fontFamily="IBM Plex Mono" fontSize="10.5" fill="#9aa0ab">
                <circle cx="150" cy="32" r="4" fill="#7274f2" />
                <text x="150" y="18" textAnchor="middle" fill="#f1f2f4">Connect</text>

                <circle cx="253" cy="91" r="3.2" fill="#383d47" />
                <text x="253" y="76" textAnchor="middle">Crawl</text>

                <circle cx="253" cy="209" r="3.2" fill="#383d47" />
                <text x="253" y="238" textAnchor="middle">Analyze</text>

                <circle className={styles.activeNode} cx="150" cy="268" r="3.2" fill="#e3ac5e" />
                <text x="150" y="288" textAnchor="middle" fill="#e3ac5e">Prioritize</text>

                <circle cx="47" cy="209" r="3.2" fill="#383d47" />
                <text x="47" y="238" textAnchor="middle">Fix</text>

                <circle className={styles.activeNode} cx="47" cy="91" r="3.2" fill="#7ed19a" />
                <text x="47" y="76" textAnchor="middle" fill="#7ed19a">Verify</text>
              </g>
              <g transform="translate(150,150)" textAnchor="middle" fontFamily="IBM Plex Mono">
                <text y="-6" fontSize="22" fill="#f1f2f4" fontWeight={500}>73</text>
                <text y="14" fontSize="10" fill="#666c76">site score</text>
              </g>
            </svg>
            <div className={styles.miniRow}>
              <span style={{ color: "var(--textTertiary)" }}>Last action</span>
              <span className={styles.mono} style={{ color: "var(--text)" }}>Fixed 3 missing meta titles</span>
            </div>
            <div className={styles.miniRow}>
              <span style={{ color: "var(--textTertiary)" }}>Next check-in</span>
              <span className={styles.mono} style={{ color: "var(--text)" }}>6 hours</span>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.trust}>
        <div className={`${styles.wrap} ${styles.trustInner}`}>
          <span className={styles.trustLabel}>Every number traces back to a real source —</span>
          <div className={styles.trustSources}>
            <span className={styles.sourceChip}><span className={styles.sq} style={{ background: "#4285f4" }} />Google Search Console</span>
            <span className={styles.sourceChip}><span className={styles.sq} style={{ background: "#f4b400" }} />Google Analytics</span>
            <span className={styles.sourceChip}><span className={styles.sq} style={{ background: "#7274f2" }} />DataForSEO</span>
            <span className={styles.sourceChip}><span className={styles.sq} style={{ background: "#7ed19a" }} />Live crawler</span>
          </div>
        </div>
      </div>

      <section className={styles.how} id="how">
        <div className={styles.wrap}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionKicker}>HOW GROWTH OS WORKS</div>
            <h2>One loop, running continuously.</h2>
            <p>Most SEO tools hand you a report and stop there. Growth OS keeps going — from finding a problem to shipping the fix — and checks its own work.</p>
          </div>

          <div className={styles.stepRow}>
            <div className={styles.stepIndex}>01</div>
            <div className={styles.stepText}>
              <h3>Connect your website</h3>
              <p>Point Growth OS at your domain and link Search Console. No plugin required for most setups — our crawler reads your site the way Google does.</p>
            </div>
            <div className={`${styles.stepVisual} ${styles.miniPanel}`}>
              <div className={styles.mpTitle}>Keywords · scanmycreds.com</div>
              <div className={styles.miniRow}><span className={styles.miniKw}>identity verification api</span><span className={`${styles.badge} ${styles.badgeOpportunity}`}>pos. 14</span></div>
              <div className={styles.miniRow}><span className={styles.miniKw}>background check software</span><span className={`${styles.badge} ${styles.badgeMuted}`}>pos. 8</span></div>
              <div className={styles.miniRow}><span className={styles.miniKw}>credential screening</span><span className={`${styles.badge} ${styles.badgeGrowth}`}>pos. 3</span></div>
            </div>
          </div>

          <div className={styles.stepRow}>
            <div className={styles.stepIndex}>02</div>
            <div className={styles.stepText}>
              <h3>Growth OS finds what&apos;s costing you traffic</h3>
              <p>Pages with thin content, missing metadata, cannibalized keywords, rankings sliding backward — surfaced and ranked by how much they&apos;re worth fixing.</p>
            </div>
            <div className={`${styles.stepVisual} ${styles.miniPanel}`}>
              <div className={styles.mpTitle}>Signals detected</div>
              <div className={styles.miniRow}><span style={{ color: "var(--text)" }}>Quick win on page /pricing</span><span className={`${styles.badge} ${styles.badgeOpportunity}`}>QUICK_WIN</span></div>
              <div className={styles.miniRow}><span style={{ color: "var(--text)" }}>Ranking dropped, /blog/api-guide</span><span className={`${styles.badge} ${styles.badgeDanger}`}>DECLINING</span></div>
              <div className={styles.miniRow}><span style={{ color: "var(--text)" }}>Two pages competing for same term</span><span className={`${styles.badge} ${styles.badgeMuted}`}>CANNIBALIZATION</span></div>
            </div>
          </div>

          <div className={styles.stepRow}>
            <div className={styles.stepIndex}>03</div>
            <div className={styles.stepText}>
              <h3>Review and approve the fix</h3>
              <p>Growth OS drafts the change — a rewritten title tag, a new content brief, a corrected heading — and shows you exactly what will change before it touches your site.</p>
            </div>
            <div className={`${styles.stepVisual} ${styles.miniPanel}`}>
              <div className={styles.mpTitle}>Meta title · /pricing</div>
              <div className={`${styles.diffLine} ${styles.diffRemove}`}>Pricing — ScanMyCreds</div>
              <div className={`${styles.diffLine} ${styles.diffAdd}`}>ScanMyCreds Pricing: Plans for Teams of Any Size</div>
            </div>
          </div>

          <div className={styles.stepRow}>
            <div className={styles.stepIndex}>04</div>
            <div className={styles.stepText}>
              <h3>Applied, then verified</h3>
              <p>Once you approve, Growth OS pushes the change through your CMS and re-crawls the page to confirm it actually took — then keeps watching for what happens next.</p>
            </div>
            <div className={`${styles.stepVisual} ${styles.miniPanel}`}>
              <div className={styles.mpTitle}>Fix history · /pricing</div>
              <div className={styles.verifyLine}>
                <span className={styles.verifyCheck}>
                  <svg width="8" height="8" viewBox="0 0 10 10"><path d="M1 5l2.5 2.5L9 2" stroke="#7ed19a" strokeWidth="1.6" fill="none" /></svg>
                </span>
                Applied via Custom Website API
              </div>
              <div className={styles.verifyLine}>
                <span className={styles.verifyCheck}>
                  <svg width="8" height="8" viewBox="0 0 10 10"><path d="M1 5l2.5 2.5L9 2" stroke="#7ed19a" strokeWidth="1.6" fill="none" /></svg>
                </span>
                Verified live 4 minutes later
              </div>
              <div className={styles.verifyLine} style={{ color: "var(--textTertiary)" }}>Monitoring for ranking movement</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.features} id="features">
        <div className={styles.wrap}>
          <div className={styles.sectionHead}>
            <div className={styles.sectionKicker}>BUILT FOR THE WHOLE LOOP</div>
            <h2>Everything between &quot;we should fix that&quot; and it being fixed.</h2>
          </div>
          <div className={styles.featureGrid}>
            <div className={styles.featureCell}>
              <span className={styles.featureTag}>KEYWORD INTELLIGENCE</span>
              <h4>Know exactly where you rank</h4>
              <p>Real Search Console rankings, clicks, and impressions, enriched with true search volume and difficulty from DataForSEO — not estimates.</p>
            </div>
            <div className={styles.featureCell}>
              <span className={styles.featureTag}>OPPORTUNITY ENGINE</span>
              <h4>Prioritized by impact, not alphabet</h4>
              <p>Growth OS scores every issue by potential traffic gain, so you always know what&apos;s worth doing first.</p>
            </div>
            <div className={styles.featureCell}>
              <span className={styles.featureTag}>CONTENT & FIXES</span>
              <h4>Drafted for you, grounded in your data</h4>
              <p>New articles and on-page fixes are generated using your actual keyword context — never generic filler copy.</p>
            </div>
            <div className={styles.featureCell}>
              <span className={styles.featureTag}>APPLY & VERIFY</span>
              <h4>Changes that check their own work</h4>
              <p>Every applied fix is re-crawled and confirmed live, with a full audit history you can always look back through.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.cta}>
        <div className={styles.wrap}>
          <div className={styles.ctaBox}>
            <h2>Give your website a growth engine of its own.</h2>
            <a className={`${styles.btn} ${styles.btnPrimary}`} href="#">Analyze my site free</a>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={`${styles.wrap} ${styles.footerInner}`}>
          <div className={styles.logo} style={{ fontSize: 13 }}>
            <span className={styles.logoMark} style={{ width: 16, height: 16 }} />
            Growth OS
          </div>
          <span>© 2026 Growth OS. Data sourced from Google Search Console, Google Analytics, and DataForSEO.</span>
        </div>
      </footer>
    </div>
  );
}
