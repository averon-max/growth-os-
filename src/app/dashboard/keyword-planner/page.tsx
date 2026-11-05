import { Topbar } from "@/components/dashboard/topbar";
import styles from "@/components/dashboard/ui.module.css";

export default function Page() {
  return (
    <>
      <Topbar title="Keyword Planner" />
      <div className={styles.pageBody}>
        <p style={{ color: "var(--secondary)", fontSize: 13 }}>Volume, difficulty, CPC, trend and intent for any seed keyword.</p>
      </div>
    </>
  );
}
