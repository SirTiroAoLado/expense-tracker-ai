"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { ActivityTray } from "@/components/cloud/ActivityTray";
import { ExportFlow, type FlowSeed } from "@/components/cloud/ExportFlow";

interface ExportFlowContextValue {
  openFlow: (seed?: FlowSeed) => void;
}

const ExportFlowContext = createContext<ExportFlowContextValue | null>(null);

/** Hosts the export flow modal and the background activity tray app-wide. */
export function ExportFlowProvider({ children }: { children: ReactNode }) {
  const [seed, setSeed] = useState<FlowSeed | null>(null);
  const openFlow = useCallback((s: FlowSeed = {}) => setSeed(s), []);
  const close = useCallback(() => setSeed(null), []);
  return (
    <ExportFlowContext.Provider value={{ openFlow }}>
      {children}
      {seed && <ExportFlow seed={seed} onClose={close} />}
      <ActivityTray />
    </ExportFlowContext.Provider>
  );
}

export function useExportFlow(): ExportFlowContextValue {
  const ctx = useContext(ExportFlowContext);
  if (!ctx) throw new Error("useExportFlow must be used inside <ExportFlowProvider>");
  return ctx;
}
