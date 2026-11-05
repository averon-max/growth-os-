import { Topbar } from "@/components/dashboard/topbar";
import styles from "@/components/dashboard/ui.module.css";

export default function Page() {
  return (
    <>
      <Topbar title="Bots & crawlers" />
      <div className={styles.pageBody}>
        <p style={{ color: "var(--secondary)", fontSize: 13 }}>Which search engines, AI crawlers and SEO bots visit the site.</p>
      </div>
    </>
  );
}
