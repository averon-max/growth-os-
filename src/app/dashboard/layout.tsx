"use client";
import { SessionProvider } from "next-auth/react";
import { Sidebar } from "@/components/dashboard/sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div style={{ display: "flex", minHeight: "100vh", background: "#08090A", color: "#F5F7FA" }}>
        <Sidebar />
        <div style={{ flex: 1, background: "#08090A", minHeight: "100vh" }}>
          {children}
        </div>
      </div>
    </SessionProvider>
  );
}
