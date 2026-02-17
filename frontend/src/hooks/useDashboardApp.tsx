"use client";

import React, { createContext, useContext } from "react";
import type { TrainerApp, Trainer } from "@/types";

interface DashboardAppContextType {
  app: TrainerApp;
  trainer: Trainer | null;
}

const DashboardAppContext = createContext<DashboardAppContextType | null>(null);

export function DashboardAppProvider({
  app,
  trainer,
  children,
}: {
  app: TrainerApp;
  trainer: Trainer | null;
  children: React.ReactNode;
}) {
  return (
    <DashboardAppContext.Provider value={{ app, trainer }}>{children}</DashboardAppContext.Provider>
  );
}

export function useDashboardApp(): DashboardAppContextType {
  const ctx = useContext(DashboardAppContext);
  if (!ctx) {
    throw new Error("useDashboardApp must be used inside a DashboardAppProvider");
  }
  return ctx;
}
