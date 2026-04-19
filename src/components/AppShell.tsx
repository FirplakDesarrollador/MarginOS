"use client";

import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import React from "react";

export function AppShell({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div className="flex min-h-[100dvh] bg-slate-50/50 text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 max-h-screen overflow-y-auto">
        <Topbar title={title} />
        
        {/* We limit max wrapper size here, allowing wide layout naturally */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 md:px-10 xl:px-12 2xl:px-16 py-8 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
