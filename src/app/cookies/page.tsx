import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL, LegalShell, legalStyles as s } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Cookie Policy · Hyprlyx",
  description: "The cookies and browser storage Hyprlyx uses, and why.",
  alternates: { canonical: "/cookies" },
};

export default function CookiesPage() {
  return (
    <LegalShell title="Cookie Policy" current="cookies">
      <div className={s.summary}>
        <p>
          <strong>Short version.</strong> We only use cookies that are needed to log you in, keep your session secure and remember a couple of
          interface choices. No advertising cookies, no cross-site tracking, so there&apos;s no cookie banner to click.
        </p>
      </div>

      <h2>1. What cookies are</h2>
      <p>
        Cookies are small files a website stores in your browser. Similar technologies, such as local storage, work the same way. This
        policy covers both and explains how {LEGAL.company} uses them on {LEGAL.site}.
      </p>

      <h2>2. Cookies we set</h2>
      <p>All of these are strictly necessary. The Service can&apos;t work without them, so they don&apos;t need your consent under EU and UK law.</p>
      <table className={s.table}>
        <thead><tr><th>Name</th><th>Purpose</th><th>Duration</th></tr></thead>
        <tbody>
          <tr><td>__Secure-next-auth.session-token</td><td>Keeps you logged in. Encrypted, HTTP-only, sent only over HTTPS.</td><td>30 days</td></tr>
          <tr><td>__Host-next-auth.csrf-token</td><td>Protects forms against cross-site request forgery.</td><td>Session</td></tr>
          <tr><td>__Secure-next-auth.callback-url</td><td>Returns you to the right page after logging in.</td><td>Session</td></tr>
        </tbody>
      </table>

      <h2>3. Browser storage</h2>
      <table className={s.table}>
        <thead><tr><th>Key</th><th>Purpose</th><th>Duration</th></tr></thead>
        <tbody>
          <tr><td>sidebar-collapsed</td><td>Remembers whether you collapsed the app sidebar.</td><td>Until you clear it</td></tr>
        </tbody>
      </table>

      <h2>4. Third parties</h2>
      <ul>
        <li>
          <strong>Stripe</strong> sets its own cookies on its checkout and billing pages to process payments and prevent fraud. See{" "}
          <a href="https://stripe.com/cookies-policy/legal" rel="noopener noreferrer" target="_blank">Stripe&apos;s cookie policy</a>.
        </li>
        <li>
          <strong>Google Fonts</strong> delivers some typefaces. Google receives your IP address to serve the font files but doesn&apos;t set
          cookies for this.
        </li>
        <li>
          <strong>Google sign-in</strong> pages, shown when you connect Search Console or Analytics, are run by Google under Google&apos;s
          policies.
        </li>
      </ul>

      <h2>5. Analytics and advertising</h2>
      <p>
        We don&apos;t use advertising cookies or third-party analytics on {LEGAL.site} today. If we ever add analytics or marketing cookies,
        we will update this page and ask for your consent first where the law requires it.
      </p>

      <h2>6. Controlling cookies</h2>
      <p>
        You can block or delete cookies in your browser settings. If you block the necessary cookies above, you won&apos;t be able to log in.
        Logging out removes the session cookie.
      </p>

      <h2>7. Contact</h2>
      <p>
        Questions: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. See also our <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalShell>
  );
}
