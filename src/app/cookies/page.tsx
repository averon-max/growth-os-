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
          <strong>Short version.</strong> We only use cookies that are needed to sign you in, keep your account secure and remember a few
          interface choices. No advertising cookies, no analytics cookies, no cross-site tracking. We show a short notice once, on your first
          visit.
        </p>
      </div>

      <h2>1. What cookies are</h2>
      <p>
        Cookies are small files a website stores in your browser. Similar technologies, such as local storage, work the same way. This
        policy covers both and explains how {LEGAL.company} uses them on {LEGAL.site}.
      </p>

      <h2>2. Cookies we set</h2>
      <p>
        All of these are strictly necessary or only remember a choice you made. The Service can&apos;t work without the sign-in and security
        cookies, so under EU, UK and Canadian law they don&apos;t need your consent.
      </p>
      <table className={s.table}>
        <thead><tr><th>Name</th><th>Purpose</th><th>Duration</th></tr></thead>
        <tbody>
          <tr><td>__Secure-next-auth.session-token</td><td>Keeps you signed in. Encrypted, HTTP-only, sent only over HTTPS.</td><td>30 days</td></tr>
          <tr><td>__Host-next-auth.csrf-token</td><td>Protects forms against cross-site request forgery.</td><td>Session</td></tr>
          <tr><td>__Secure-next-auth.callback-url</td><td>Returns you to the right page after signing in.</td><td>Session</td></tr>
          <tr><td>hyprlyx_cookie_notice</td><td>Remembers that you&apos;ve seen the cookie notice, so it isn&apos;t shown again.</td><td>12 months</td></tr>
        </tbody>
      </table>

      <h2>3. Browser storage</h2>
      <table className={s.table}>
        <thead><tr><th>Key</th><th>Purpose</th><th>Duration</th></tr></thead>
        <tbody>
          <tr><td>sidebar-collapsed</td><td>Remembers whether you collapsed the app sidebar.</td><td>Until you clear it</td></tr>
          <tr><td>growth-os:code-variant</td><td>Remembers which code format you chose when exporting an article.</td><td>Until you clear it</td></tr>
        </tbody>
      </table>

      <h2>4. Third parties</h2>
      <ul>
        <li>
          <strong>Stripe</strong> sets its own cookies on its checkout and billing pages to process payments and prevent fraud. See{" "}
          <a href="https://stripe.com/cookies-policy/legal" rel="noopener noreferrer" target="_blank">Stripe&apos;s cookie policy</a>.
        </li>
        <li>
          <strong>Google</strong> serves some typefaces and the small site icons shown next to your websites. Google receives your IP address
          to deliver these files but doesn&apos;t set cookies for them.
        </li>
        <li>
          <strong>Google sign-in</strong> pages, shown when you sign in with Google or connect Search Console or Analytics, are run by Google
          under Google&apos;s policies.
        </li>
      </ul>

      <h2>5. Analytics and advertising</h2>
      <p>
        We don&apos;t use advertising cookies or third-party analytics on {LEGAL.site}. If we ever add analytics or marketing cookies, we will
        update this page and ask for your consent first, with a real choice to accept or decline, where the law requires it.
      </p>

      <h2>6. Controlling cookies</h2>
      <p>
        You can block or delete cookies in your browser settings. If you block the necessary cookies above, you won&apos;t be able to sign in.
        Signing out removes the session cookie.
      </p>

      <h2>7. Contact</h2>
      <p>
        Questions: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. See also our <Link href="/privacy">Privacy Policy</Link> and{" "}
        <Link href="/terms">Terms of Service</Link>.
      </p>
    </LegalShell>
  );
}
