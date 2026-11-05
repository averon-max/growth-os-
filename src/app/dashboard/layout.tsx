import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/dashboard/sidebar";
import styles from "./layout.module.css";
import { AppFooter } from "@/components/dashboard/app-footer";
import "./pages.css";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}><div className="page-shell">
        <div className="page-content">{children}</div>
        <AppFooter />
      </div></div>
    </div>
  );
}
