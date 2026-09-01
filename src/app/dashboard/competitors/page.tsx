import { Sparkles } from "lucide-react";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import styles from "@/components/dashboard/ui.module.css";

export default function CompetitorsPage() {
  return (
    <>
      <Topbar title="Competitors" />
      <div className={styles.pageBody}>
        <EmptyState
          icon={Sparkles}
          title="Competitors is not built yet"
          description="This part of Growth OS doesn't have a backend or data source connected yet. It will appear here once it's implemented."
        />
      </div>
    </>
  );
}
