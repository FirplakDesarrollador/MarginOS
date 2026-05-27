"use client";

import { Sidebar, MobileSidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import React from "react";

function ShellInner({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <div className="flex min-h-[100dvh] bg-[color:var(--bg-base)] text-text-primary overflow-hidden">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile drawer */}
      <MobileSidebar />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 max-h-screen overflow-y-auto">
        <Topbar title={title} />

        <main className="flex-1 w-full px-3 sm:px-4 md:px-5 lg:px-6 pt-8 pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <SidebarProvider>
      <ShellInner title={title}>{children}</ShellInner>
    </SidebarProvider>
  );
}
