"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { ExportDrawer } from "@/components/export/ExportDrawer";
import type { ExportSeed } from "@/components/export/useExportForm";

interface ExportDrawerContextValue {
  /** Open the export drawer, optionally pre-filled (e.g. from the Expenses page filters). */
  openExport: (seed?: ExportSeed) => void;
}

const ExportDrawerContext = createContext<ExportDrawerContextValue | null>(null);

export function ExportDrawerProvider({ children }: { children: ReactNode }) {
  const [seed, setSeed] = useState<ExportSeed | null>(null);
  const openExport = useCallback((s: ExportSeed = {}) => setSeed(s), []);
  const close = useCallback(() => setSeed(null), []);

  return (
    <ExportDrawerContext.Provider value={{ openExport }}>
      {children}
      {seed && <ExportDrawer seed={seed} onClose={close} />}
    </ExportDrawerContext.Provider>
  );
}

export function useExportDrawer(): ExportDrawerContextValue {
  const ctx = useContext(ExportDrawerContext);
  if (!ctx) throw new Error("useExportDrawer must be used inside <ExportDrawerProvider>");
  return ctx;
}
