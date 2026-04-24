"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface SidebarContextValue {
  isCollapsed: boolean;
  isHovered: boolean;
  isMobileOpen: boolean;
  setIsCollapsed: (v: boolean) => void;
  setIsHovered: (v: boolean) => void;
  toggleMobile: () => void;
  closeMobile: () => void;
  /** Effective expanded: either pinned-open or hover-expanded */
  isExpanded: boolean;
}

const SidebarContext = createContext<SidebarContextValue | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false); // pinned state
  const [isHovered, setIsHovered] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleMobile = useCallback(() => setIsMobileOpen((v) => !v), []);
  const closeMobile = useCallback(() => setIsMobileOpen(false), []);

  // Sidebar shows labels when: not collapsed OR when collapsed but hovered
  const isExpanded = !isCollapsed || isHovered;

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        isHovered,
        isMobileOpen,
        setIsCollapsed,
        setIsHovered,
        toggleMobile,
        closeMobile,
        isExpanded,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used inside SidebarProvider");
  return ctx;
}
