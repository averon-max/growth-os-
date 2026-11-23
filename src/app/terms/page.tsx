import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, LegalShell, legalStyles as s } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Terms of Service · Hyprlyx",
  description: "The agreement between you and Hyprlyx for using the Service.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" current="terms">
      <div className={s.summary}>
        <p>
          <strong>Short version.</strong> Use Hyprlyx lawfully, keep your account secure, pay for the plan you choose, and you own what you
          create. Paid plans renew every month until you cancel. Cancel any time in Settings → Billing and keep access until the end of the
          period you paid for. The Starter free trial is charged only if you don&apos;t cancel before it ends. We can&apos;t promise rankings
          or traffic.
        </p>
      </div>

      <h2>1. The agreement</h2>
      <p>
        These Terms are a contract between you and {LEGAL.company} (&quot;Hyprlyx&quot;, &quot;we&quot;) for using {LEGAL.site} and the
        Hyprlyx application (the &quot;Service&quot;). By creating an account or using the Service you accept these Terms and our{" "}
        <Link href="/privacy">Privacy Policy</Link>. If you use the Service for a company, you confirm you can bind that company, and
        &quot;you&quot; means the company. You must be at least 16 years old.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>Give accurate information and keep it up to date.</li>
        <li>Keep your password secret. You are responsible for activity under your account.</li>
        <li>Tell us right away at <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> if you suspect unauthorized access.</li>
        <li>One person per login. Invite teammates to your workspace instead of sharing passwords.</li>
        <li>Billing belongs to the workspace owner. Only the owner can start, change or cancel a subscription.</li>
      </ul>

      <h2>3. Plans, billing and cancellation</h2>
      <h3>Plans and prices</h3>
      <ul>
        <li>
          The Free plan costs nothing and needs no card. Paid plans (Starter, Growth, Autopilot) are billed monthly, in advance, in US dollars,
          through our payment processor Stripe. What each plan includes and its current price are shown on the{" "}
          <Link href="/pricing">pricing page</Link> and at checkout.
        </li>
        <li>Where we are required to charge sales tax, it is shown at checkout before you pay.</li>
        <li><strong>Usage limits.</strong> Each plan has limits, for example the number of websites and AI article drafts per month. Some data features also have a daily limit across the Service; when it is reached, saved data keeps working and fresh data is available again the next day.</li>
      </ul>
      <h3>Free trial</h3>
      <ul>
        <li>The Starter plan comes with a 7-day free trial. You add a card at checkout; nothing is charged during the trial.</li>
        <li>
          <strong>When the trial ends, your card is charged the Starter monthly price</strong> shown at checkout, and the subscription then
          renews every month until you cancel. The date of the first charge is shown at checkout and in Settings → Billing.
        </li>
        <li>Cancel any time before the trial ends in Settings → Billing and you pay nothing. You keep access until the trial ends.</li>
        <li>One free trial per workspace. A trial includes a limited amount of fresh keyword, backlink and competitor data.</li>
        <li>If you switch to another plan during the trial, the trial ends at that moment and the new plan&apos;s price is charged.</li>
      </ul>
      <h3>Renewal, changes and cancellation</h3>
      <ul>
        <li><strong>Automatic renewal.</strong> Paid plans renew automatically every month at the then-current price until you cancel.</li>
        <li>
          <strong>Cancelling.</strong> Cancel any time in Settings → Billing. Cancelling stops the next renewal; you keep paid features until
          the end of the period you paid for, and you are not charged again. You can undo the cancellation before the period ends.
        </li>
        <li>
          <strong>Removing your card.</strong> You can remove your saved card in Settings → Billing. Doing so also stops renewal, because there
          is nothing left to charge.
        </li>
        <li>
          <strong>Upgrades and downgrades</strong> take effect immediately. On an upgrade you pay only the difference for the rest of the
          current month; on a downgrade the unused difference is credited to your next invoices. Settings → Billing shows the exact amount
          before you confirm.
        </li>
        <li>
          <strong>Price changes.</strong> We will email you at least 30 days before a price change affects your subscription. If you don&apos;t
          agree, cancel before the change takes effect.
        </li>
        <li>
          <strong>Failed payments.</strong> If a renewal payment fails, Stripe retries it and we email you. If it still can&apos;t be
          collected, the subscription ends and the workspace moves to the Free plan.
        </li>
        <li>
          <strong>Refunds.</strong> Fees are non-refundable except where the law requires otherwise, or where we decide to refund at our
          discretion. If you think you were charged by mistake, write to us within 30 days and we will look into it.
        </li>
        <li>
          <strong>Deleting your account</strong> (Settings → Account) cancels every subscription you pay for immediately and removes your
          saved card from Stripe, so you won&apos;t be charged again. Time left in the current period is not refunded automatically; if you
          want a refund for it, write to us before deleting.
        </li>
        <li>
          <strong>Plans we grant.</strong> We may give a plan free of charge, for example for a promotion or as a goodwill gesture. Such plans
          end on the date we set and never charge your card.
        </li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>break any law, or infringe anyone&apos;s intellectual property, privacy or other rights;</li>
        <li>connect or analyse websites or accounts you aren&apos;t authorized to access;</li>
        <li>generate spam, malware, phishing, hateful, defamatory or deceptive content, or content that violates search engine spam policies at scale;</li>
        <li>probe, scan or test the Service&apos;s security, bypass rate limits or usage limits, or disrupt the Service;</li>
        <li>scrape the Service, resell it, or use it to build a competing product;</li>
        <li>reverse engineer the Service except where the law expressly allows it.</li>
      </ul>
      <p>
        Found a security issue? Report it to <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Good-faith reports are welcome and we
        won&apos;t pursue researchers who follow responsible disclosure.
      </p>

      <h2>5. Your content and data</h2>
      <ul>
        <li>
          <strong>You own it.</strong> You keep all rights to the content you create and the data you bring in, including AI-generated
          articles produced for you.
        </li>
        <li>
          <strong>License to us.</strong> You give us a limited license to host, process and display your content only to provide and
          improve the Service for you. It ends when you delete the content, except for backups that expire on their own.
        </li>
        <li>
          <strong>Your responsibility.</strong> You are responsible for what you publish. Review AI-generated content before publishing;
          it can contain mistakes.
        </li>
      </ul>

      <h2>6. AI features</h2>
      <p>
        AI output is generated automatically and may be inaccurate, incomplete, or similar to content produced for others. It is not legal,
        financial, medical or other professional advice. Check facts, citations and claims before you rely on or publish them.
      </p>

      <h2>7. Third-party services</h2>
      <p>
        The Service connects to third parties such as Google, Cloudflare, Stripe and DataForSEO. Your use of them is governed by their own
        terms. We aren&apos;t responsible for their availability, accuracy or changes to their APIs, which may affect features.
      </p>

      <h2>8. Our intellectual property</h2>
      <p>
        The Service, its software, design and brand belong to us and our licensors. These Terms give you a personal, non-exclusive,
        non-transferable right to use the Service while your account is in good standing — nothing more.
      </p>

      <h2>9. Availability and changes</h2>
      <p>
        We work to keep the Service available but don&apos;t guarantee it will be uninterrupted or error-free. We may change or discontinue
        features. If we discontinue a paid feature you rely on, we will give reasonable notice and a prorated refund where appropriate.
      </p>

      <h2>10. Suspension and termination</h2>
      <ul>
        <li>You can delete your account any time in Settings → Account. This also cancels any subscription you pay for, as described in section 3.</li>
        <li>
          We may suspend or close accounts that break these Terms, put others at risk, or don&apos;t pay. Where reasonable, we will warn you
          first and let you export your data.
        </li>
        <li>After closing, we delete your data as described in the Privacy Policy.</li>
      </ul>

      <h2>11. No guarantee of results</h2>
      <p>
        Search rankings depend on search engines and many factors outside our control. We do not guarantee any ranking, traffic, revenue or
        other result.
      </p>

      <h2>12. Disclaimers</h2>
      <p className={s.caps}>
        The Service is provided &quot;as is&quot; and &quot;as available&quot;. To the fullest extent permitted by law, we disclaim all
        warranties, express or implied, including merchantability, fitness for a particular purpose, accuracy and non-infringement.
      </p>

      <h2>13. Limitation of liability</h2>
      <p className={s.caps}>
        To the fullest extent permitted by law, we are not liable for indirect, incidental, special, consequential or punitive damages, or
        for lost profits, revenue, data or rankings. Our total liability for any claim is limited to the amount you paid us in the 12 months
        before the event giving rise to the claim, or USD $100 if you paid nothing.
      </p>
      <p>Some jurisdictions don&apos;t allow these limits, so they may not fully apply to you. Nothing here limits rights you have as a consumer that can&apos;t be waived.</p>

      <h2>14. Indemnity</h2>
      <p>
        You will defend and compensate us for third-party claims arising from your content, your use of the Service in breach of these
        Terms, or your violation of law or third-party rights.
      </p>

      <h2>15. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of {LEGAL.jurisdiction}, and the federal laws of Canada that apply there, without regard to
        conflict-of-law rules. The courts located in that province have exclusive jurisdiction, except that consumers may also bring claims
        in the courts where they live if their local law gives them that right. Before filing a claim, please contact us so we can try to
        resolve it informally within 30 days.
      </p>

      <h2>16. Changes to these Terms</h2>
      <p>
        We may update these Terms. For material changes we will email account owners at least 14 days in advance. Continuing to use the
        Service after changes take effect means you accept them.
      </p>

      <h2>17. Other terms</h2>
      <ul>
        <li>These Terms and the Privacy Policy are the entire agreement between us about the Service.</li>
        <li>If any part is unenforceable, the rest stays in force.</li>
        <li>Not enforcing a right isn&apos;t a waiver of it.</li>
        <li>You can&apos;t transfer these Terms without our consent; we may transfer them in a merger, acquisition or sale of assets.</li>
        <li>Neither of us is liable for delays caused by events beyond reasonable control.</li>
      </ul>

      <h2>18. Contact</h2>
      <p>
        {LEGAL.company} · <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>
      </p>
    </LegalShell>
  );
}
