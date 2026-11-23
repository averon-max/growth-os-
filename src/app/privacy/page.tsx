import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, LegalShell, legalStyles as s } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy · Hyprlyx",
  description: "What data Hyprlyx collects, why, who processes it, how long we keep it, and your rights.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" current="privacy">
      <div className={s.summary}>
        <p>
          <strong>Short version.</strong> We collect what we need to run your account and the SEO tools you connect. We don&apos;t sell your
          data, we don&apos;t show ads, we don&apos;t track you across other sites, and we don&apos;t use your content to train AI models.
          Card details stay with Stripe. You can delete your account yourself in Settings → Account; that also cancels any subscription and
          removes your saved card.
        </p>
      </div>

      <h2>1. Who we are</h2>
      <p>
        {LEGAL.company} (&quot;Hyprlyx&quot;, &quot;we&quot;, &quot;us&quot;) operates {LEGAL.site} and the Hyprlyx web application (the
        &quot;Service&quot;). We are the controller of the personal data described in this policy. For anything privacy-related, contact{" "}
        <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.
      </p>
      <p>
        When you connect your own website and its data to Hyprlyx (for example Google Search Console), we process that data on your behalf
        and under your instructions. For that data you are the controller and we act as your processor.
      </p>

      <h2>2. What we collect</h2>
      <h3>Account data</h3>
      <ul>
        <li>Name, email address and a hashed password. We never store or see your password in readable form. If you sign in with Google, we receive your name and email from Google.</li>
        <li>Workspace name, team members and their roles.</li>
        <li>Security records: login attempts, password reset requests, request counts used for rate limiting, and the IP address they came from.</li>
      </ul>
      <h3>Billing data</h3>
      <ul>
        <li>
          Your plan, subscription status, trial and renewal dates, and the identifiers of your customer and subscription at Stripe. Card
          details are entered on Stripe&apos;s page and stored by Stripe; we never receive or store card numbers. To show your saved card
          and invoices in Settings → Billing we read the card brand, last four digits, expiry date and invoice list from Stripe when you
          open that page.
        </li>
      </ul>
      <h3>Data from services you connect</h3>
      <ul>
        <li>
          <strong>Google Search Console and Google Analytics 4:</strong> search queries, impressions, clicks, positions, page and traffic
          statistics for the properties you authorize, plus the OAuth tokens needed to keep the connection working.
        </li>
        <li><strong>Cloudflare:</strong> traffic and bot statistics for zones you connect, using the API token you provide.</li>
        <li><strong>Your CMS:</strong> the credentials you provide so we can publish or fix pages when you ask us to.</li>
        <li><strong>Your website:</strong> publicly available pages, sitemaps and metadata we crawl for audits and planning.</li>
      </ul>
      <h3>Content you create</h3>
      <ul>
        <li>Websites, keywords you track, audits, briefs, drafts, articles and settings you save in the Service.</li>
      </ul>
      <h3>Support and feedback</h3>
      <ul>
        <li>
          Messages you send through the support or feedback forms: your name, email, subject and message, the page you sent it from and your
          browser type, plus our replies and internal notes about the request.
        </li>
      </ul>
      <h3>Technical data</h3>
      <ul>
        <li>IP address, browser type, device and request logs, kept by our hosting provider for security and debugging.</li>
        <li>Cookies and similar storage described in our <Link href="/cookies">Cookie Policy</Link>. We use only what is needed to sign you in, keep your account secure and remember interface choices.</li>
      </ul>
      <p>We don&apos;t knowingly collect sensitive categories of data, and the Service is not meant for anyone under 16.</p>

      <h2>3. Why we use it (and the legal basis)</h2>
      <table className={s.table}>
        <thead><tr><th>Purpose</th><th>Legal basis (GDPR)</th></tr></thead>
        <tbody>
          <tr><td>Create and run your account, provide the Service</td><td>Performance of our contract with you</td></tr>
          <tr><td>Process payments, free trials, plan changes and cancellations; keep billing records</td><td>Contract; legal obligation (tax and accounting)</td></tr>
          <tr><td>Fetch and analyse data from services you connect</td><td>Contract; your explicit authorization of each connection</td></tr>
          <tr><td>Generate content with AI on your request</td><td>Contract</td></tr>
          <tr><td>Answer support and feedback messages</td><td>Contract; legitimate interest in improving the Service</td></tr>
          <tr><td>Keep the Service secure: rate limits, usage limits, fraud and abuse prevention, a log of staff actions on accounts</td><td>Legitimate interest in protecting users and the Service</td></tr>
          <tr><td>Service emails: password resets, trial and billing notices, account deletion confirmation, replies to your messages</td><td>Contract</td></tr>
          <tr><td>Product updates and news</td><td>Consent — only if you opt in; unsubscribe any time</td></tr>
          <tr><td>Comply with law and respond to lawful requests</td><td>Legal obligation</td></tr>
        </tbody>
      </table>
      <p>
        <strong>AI and your data.</strong> When you ask Hyprlyx to write or analyse content, the relevant inputs (keywords, briefs, page text)
        are sent to our AI provider to produce the result. We use API access where providers state they do not use the data to train their
        models. We never use your data to train our own models.
      </p>
      <p>
        <strong>Inside our team.</strong> A small number of staff can see account details, plans and support messages to help you, manage
        billing and keep the Service safe. Each staff change to an account (for example granting or removing a plan) is recorded in an
        internal log. When someone starts a free trial, our team receives an email with that account&apos;s email address.
      </p>
      <p>
        <strong>Saved search data.</strong> Keyword volumes, search results and backlink figures we buy from DataForSEO are public search
        data, not personal data. We save them and reuse them for every customer who asks the same question, so the same data isn&apos;t
        bought twice. Saved answers are deleted automatically after a set number of days.
      </p>

      <h2>4. Who we share it with</h2>
      <p>We share data only with service providers who process it for us under written agreements, and only as much as they need:</p>
      <table className={s.table}>
        <thead><tr><th>Provider</th><th>What for</th><th>Location</th></tr></thead>
        <tbody>
          <tr><td>Vercel</td><td>Hosting, request logs</td><td>USA / global edge</td></tr>
          <tr><td>Neon</td><td>Database</td><td>USA (AWS us-east-1)</td></tr>
          <tr><td>Stripe</td><td>Payments, cards, invoices, free trials, fraud prevention</td><td>USA / EU</td></tr>
          <tr><td>Resend</td><td>Sending service and support email</td><td>USA</td></tr>
          <tr><td>OpenAI, Groq</td><td>AI content generation on your request</td><td>USA</td></tr>
          <tr><td>DataForSEO</td><td>Keyword, search result and backlink metrics (no personal data sent)</td><td>EU / USA</td></tr>
          <tr><td>Google</td><td>Sign-in with Google; Search Console / GA4 APIs you connect; Google Trends; web fonts; site icons shown next to your websites</td><td>USA / global</td></tr>
          <tr><td>Cloudflare</td><td>API access for zones you connect</td><td>USA / global</td></tr>
        </tbody>
      </table>
      <p>
        We may also disclose data if required by law, to protect rights and safety, or as part of a merger or acquisition (in which case we
        will tell you first). We do not sell or rent personal data, and we do not share it for cross-context behavioural advertising.
      </p>

      <h2>5. International transfers</h2>
      <p>
        Our providers are mostly in the United States. Where data from the EEA, UK or Switzerland is transferred, we rely on the European
        Commission&apos;s Standard Contractual Clauses, the UK Addendum, or the provider&apos;s certification under the EU-U.S. Data Privacy
        Framework, as applicable.
      </p>

      <h2>6. How long we keep it</h2>
      <ul>
        <li><strong>Account and content:</strong> while your account is active. When you delete your account, it is removed immediately together with every workspace where you are the only member; copies in backups are overwritten within 30 days.</li>
        <li><strong>Reports, scans and drafts:</strong> for the period the workspace owner sets in Settings → Data retention. A cleanup runs every night; the latest audit and scan for each site are always kept.</li>
        <li><strong>Data from connected services:</strong> until you disconnect the service or delete the website from Hyprlyx.</li>
        <li><strong>Saved search data:</strong> for a set number of days per kind of data, then deleted automatically.</li>
        <li><strong>Billing:</strong> when you delete your account we cancel your subscription immediately and delete your customer record and saved cards at Stripe. Invoices and payment records are kept for up to 7 years, because tax law requires it.</li>
        <li><strong>Support and feedback messages:</strong> as long as needed to handle the request and keep a record of it; ask us and we will delete them sooner where the law allows.</li>
        <li><strong>Security logs and rate-limit records:</strong> up to 90 days. Records of staff actions on accounts are kept for accountability while the Service runs.</li>
      </ul>

      <h2>7. How we protect it</h2>
      <ul>
        <li>Encryption in transit (HTTPS/TLS everywhere, HSTS) and at rest at our database provider.</li>
        <li>Passwords hashed with bcrypt; password reset links are single-use, expire after 30 minutes and are stored only as hashes.</li>
        <li>Changing your password signs you out on every device, and you can sign out everywhere from Settings → Account.</li>
        <li>Rate limiting on login, sign-up, password reset and every API route; checks against known breached passwords.</li>
        <li>Least-privilege access to production systems and an internal log of staff actions on accounts.</li>
      </ul>
      <p>
        No system is perfectly secure. If a breach affects your personal data, we will notify you and the relevant authorities as the law
        requires.
      </p>

      <h2>8. Your rights</h2>
      <p>Depending on where you live, you can:</p>
      <ul>
        <li>access the personal data we hold about you and get a copy in a portable format;</li>
        <li>correct inaccurate data;</li>
        <li>delete your data (&quot;right to be forgotten&quot;) — you can delete your account yourself in Settings → Account;</li>
        <li>restrict or object to certain processing, including processing based on legitimate interest;</li>
        <li>withdraw consent at any time, without affecting earlier processing;</li>
        <li>disconnect any third-party service, remove your saved card and cancel your subscription from Settings at any time;</li>
        <li>complain to your data protection authority.</li>
      </ul>
      <p>
        For anything else, email <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> from your account address. We answer within 30 days and
        may ask you to confirm your identity. We will not treat you differently for using your rights.
      </p>
      <h3>California residents (CCPA/CPRA)</h3>
      <p>
        In the last 12 months we collected identifiers, commercial information, internet activity and the other categories listed in section
        2, for the purposes in section 3. We do not sell or share personal information as those terms are defined in the CCPA, and we do not
        use sensitive personal information to infer characteristics about you.
      </p>
      <h3>Canada (PIPEDA)</h3>
      <p>
        We collect, use and disclose personal information with your consent and only for the purposes described here. You can withdraw
        consent subject to legal or contractual limits, and you can contact the Office of the Privacy Commissioner of Canada if you are not
        satisfied with our answer.
      </p>

      <h2>9. Google API data</h2>
      <p>
        Hyprlyx&apos;s use and transfer of information received from Google APIs adheres to the{" "}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" rel="noopener noreferrer" target="_blank">
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. We use Google data only to show you your own search and traffic analytics inside Hyprlyx;
        we don&apos;t use it for advertising, don&apos;t sell it, and don&apos;t let humans read it unless you ask us to for support, it is
        needed for security, or the law requires it. You can revoke access at any time from your Google Account settings.
      </p>

      <h2>10. Changes</h2>
      <p>
        If we make material changes, we will email account owners and show a notice in the app at least 14 days before they take effect.
        The date at the top always shows the current version.
      </p>

      <h2>11. Contact</h2>
      <p>
        {LEGAL.company} · <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>
      </p>
    </LegalShell>
  );
}
