import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f2f1ed", color: "#0a0a0a", fontFamily: "-apple-system, 'SF Pro Display', sans-serif" }}>
      <Sidebar />
      <div style={{ flex: 1, overflow: "hidden" }}>{children}</div>
    </div>
  );
}
