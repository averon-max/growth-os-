import { Topbar } from "@/components/dashboard/topbar";
import styles from "@/components/dashboard/ui.module.css";

export default function Page() {
  return (
    <>
      <Topbar title="Backlinks" />
      <div className={styles.pageBody}>
        <p style={{ color: "var(--secondary)", fontSize: 13 }}>Referring domains, new and lost links, anchors and link quality.</p>
      </div>
    </>
  );
}
