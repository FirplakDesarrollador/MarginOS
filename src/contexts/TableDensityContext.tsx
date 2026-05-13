"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type TableDensity = "compact" | "normal" | "comodo";

interface TableDensityContextType {
  density: TableDensity;
  setDensity: (density: TableDensity) => void;
  getTableClasses: () => {
    th: string;
    td: string;
    input: string;
    inputDesc: string;
    inputCant: string;
    colDescWidth: string;
    colCantWidth: string;
    button: string;
    tableWrapper: string;
    badge: string;
  };
}

const TableDensityContext = createContext<TableDensityContextType | undefined>(undefined);

export function TableDensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = useState<TableDensity>("normal");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("marginos:table_density");
      if (saved && ["compact", "normal", "comodo"].includes(saved)) {
        setDensityState(saved as TableDensity);
      }
    } catch (e) {
      console.warn("Could not read table density from localStorage", e);
    }
  }, []);

  const setDensity = (newDensity: TableDensity) => {
    setDensityState(newDensity);
    try {
      localStorage.setItem("marginos:table_density", newDensity);
    } catch (e) {
      console.warn("Could not save table density to localStorage", e);
    }
  };

  const getTableClasses = () => {
    switch (density) {
      case "compact":
        return {
          th: "px-2 py-2 text-xs",
          td: "px-2 py-2 text-xs",
          input: "h-8 text-xs px-2 py-1",
          inputDesc: "h-8 text-xs px-1 py-1 w-[64px] text-center",
          inputCant: "h-8 text-xs px-1 py-1 w-[72px] text-center",
          colDescWidth: "72px",
          colCantWidth: "80px",
          button: "h-8 text-xs px-2 py-1",
          tableWrapper: "text-xs",
          badge: "px-1.5 py-0.5 text-[10px]",
        };
      case "comodo":
        return {
          th: "px-5 py-4 text-base",
          td: "px-5 py-4 text-base",
          input: "h-12 text-base px-4 py-2",
          inputDesc: "h-12 text-base px-2 py-2 w-[80px] text-center",
          inputCant: "h-12 text-base px-2 py-2 w-[96px] text-center",
          colDescWidth: "88px",
          colCantWidth: "104px",
          button: "h-11 text-sm px-4 py-2",
          tableWrapper: "text-base",
          badge: "px-3 py-1.5 text-xs",
        };
      case "normal":
      default:
        return {
          th: "px-4 py-3 text-sm",
          td: "px-4 py-4 text-sm",
          input: "h-10 text-sm px-3 py-1.5",
          inputDesc: "h-10 text-sm px-2 py-1.5 w-[72px] text-center",
          inputCant: "h-10 text-sm px-2 py-1.5 w-[84px] text-center",
          colDescWidth: "80px",
          colCantWidth: "92px",
          button: "h-9 text-sm px-3 py-1.5",
          tableWrapper: "text-sm",
          badge: "px-2.5 py-1 text-[11px]",
        };
    }
  };

  return (
    <TableDensityContext.Provider value={{ density, setDensity, getTableClasses }}>
      {children}
    </TableDensityContext.Provider>
  );
}

export function useTableDensity() {
  const context = useContext(TableDensityContext);
  if (context === undefined) {
    throw new Error("useTableDensity must be used within a TableDensityProvider");
  }
  return context;
}
