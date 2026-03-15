"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";

export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
