import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Providers } from "../providers";
import { isUserAdmin } from "@/lib/auth-helpers";
import { Sidebar } from "@/components/dashboard/sidebar";
import styles from "./layout.module.css";
import { AppFooter } from "@/components/dashboard/app-footer";
import { FeedbackWidget } from "@/components/feedback-widget";
import "./pages.css";

// Личный кабинет не должен попадать в поиск, даже если ссылка где-то утечёт.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  const userId = (session.user as { id?: string }).id;
  const isAdmin = userId ? await isUserAdmin(userId) : false;

  return (
    <Providers session={session}>
    <div className={styles.shell}>
      <Sidebar isAdmin={isAdmin} />
      <div className={styles.main}><div className="page-shell">
        <div className="page-content">{children}</div>
        <AppFooter />
        <FeedbackWidget />
      </div></div>
    </div>
    </Providers>
  );
}
