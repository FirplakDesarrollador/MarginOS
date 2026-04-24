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
    <div className="flex min-h-[100dvh] bg-slate-50/50 text-text-primary overflow-hidden">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile drawer */}
      <MobileSidebar />

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 max-h-screen overflow-y-auto">
        <Topbar title={title} />

        <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 xl:px-10 2xl:px-14 py-8 md:py-10">
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
