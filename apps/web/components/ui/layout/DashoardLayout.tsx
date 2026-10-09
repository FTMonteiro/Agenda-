"use client";

import { ReactNode, useCallback, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./header";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const closeDrawer = useCallback(() => {
    setIsDrawerOpen(false);
  }, []);

  const openDrawer = useCallback(() => {
    setIsDrawerOpen(true);
  }, []);

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      {/* MENU LATERAL */}
      <Sidebar
        open={isDrawerOpen}
        onClose={closeDrawer}
      />

      {/* ÁREA PRINCIPAL */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* HEADER */}
        <Header onOpenMenu={openDrawer} />

        {/* CONTEÚDO */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}