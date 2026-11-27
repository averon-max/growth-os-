import { Plug } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import styles from "@/components/dashboard/ui.module.css";
import s from "./cms.module.css";

/* CMS publishing is not open yet: one honest "coming soon" page instead of a half-working setup. */
export default function CMSPage() {
  return (
    <>
      <Topbar title="CMS" subtitle="Coming soon" />
      <div className={styles.pageBody}>
        <section className={s.soon}>
          <span className={s.soonIcon} aria-hidden><Plug size={20} /></span>
          <span className={s.soonBadge}>Coming soon</span>
          <h1 className={s.soonTitle}>Publish straight to your CMS</h1>
          <p className={s.soonText}>
            Soon Hyprlyx will publish approved articles and apply approved SEO fixes on WordPress and custom sites for you.
            Until then, copy or download articles from Content, and fix issues from the SEO audit by hand.
          </p>
        </section>
      </div>
    </>
  );
}
