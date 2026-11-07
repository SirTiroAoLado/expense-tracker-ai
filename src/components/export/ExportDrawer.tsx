"use client";

import { AlertCircle, CheckCircle2, Download, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useExpenses } from "@/hooks/useExpenses";
import { useToast } from "@/hooks/useToast";
import { EXPORTERS, runExport } from "@/lib/export";
import { buildCSV } from "@/lib/export/formats/csv";
import { buildJSON } from "@/lib/export/formats/json";
import { formatCurrency } from "@/lib/format";
import { ExportOptionsPanel } from "./ExportOptionsPanel";
import { ExportPreviewTable, ExportSummaryStrip } from "./ExportPreview";
import { useExportForm, type ExportSeed } from "./useExportForm";

type Phase = { kind: "idle" } | { kind: "exporting" } | { kind: "done"; filename: string } | { kind: "error"; message: string };

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function ExportDrawer({ seed, onClose }: { seed: ExportSeed; onClose: () => void }) {
  const { expenses, currency } = useExpenses();
  const { toast } = useToast();
  const form = useExportForm(expenses, seed);
  const { state, rows, summary, hasErrors, options } = form;
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [mobileTab, setMobileTab] = useState<"options" | "preview">("options");
  const panelRef = useRef<HTMLDivElement>(null);
  const busy = phase.kind === "exporting" || phase.kind === "done";

  // Live file-size estimate for text formats (cheap for realistic data sizes).
  const estimate = useMemo(() => {
    if (state.format === "pdf" || rows.length === 0 || rows.length > 20000) return null;
    const ctx = { rows, options, summary, currency, generatedAt: new Date() };
    const text = state.format === "csv" ? buildCSV(ctx) : buildJSON(ctx);
    return new TextEncoder().encode(text).length;
  }, [state.format, rows, options, summary, currency]);

  const canExport = !hasErrors && rows.length > 0 && !busy;

  const doExport = useCallback(async () => {
    if (!canExport) return;
    setPhase({ kind: "exporting" });
    try {
      // Let the spinner paint before heavy synchronous work (PDF layout).
      await new Promise((r) => setTimeout(r, 50));
      const res = await runExport({ rows, options, summary, currency, generatedAt: new Date() });
      setPhase({ kind: "done", filename: res.filename });
      toast(`Exported ${rows.length.toLocaleString()} expense${rows.length === 1 ? "" : "s"} · ${res.filename} (${formatBytes(res.bytes)})`);
      setTimeout(onClose, 1100);
    } catch (err) {
      console.error(err);
      setPhase({ kind: "error", message: "Something went wrong while generating the file. Please try again." });
    }
  }, [canExport, rows, options, summary, currency, toast, onClose]);

  // Keyboard: Esc closes (unless mid-export), Ctrl/Cmd+Enter exports, Tab is trapped.
  const doExportRef = useRef(doExport);
  doExportRef.current = doExport;
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>("input[name='export-format']:checked")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busyRef.current) onCloseRef.current();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void doExportRef.current();
      }
      if (e.key === "Tab" && panelRef.current) {
        const els = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>("button, input, select, [tabindex]:not([tabindex='-1'])"),
        ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
        if (!els.length) return;
        const [first, last] = [els[0], els[els.length - 1]];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, []);

  const exporter = EXPORTERS[state.format];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-slate-900/40 backdrop-blur-[2px]" onClick={() => !busy && onClose()} aria-hidden />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        className="relative flex h-full w-full max-w-5xl animate-drawer-in flex-col bg-white shadow-2xl"
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 id="export-title" className="text-lg font-semibold text-slate-900">
              Export expenses
            </h2>
            <p className="text-sm text-slate-500">Choose a format, narrow down the data, and preview before downloading.</p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="-mr-2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
            aria-label="Close export"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Mobile tabs */}
        <div className="flex border-b border-slate-200 lg:hidden" role="tablist">
          {(["options", "preview"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={mobileTab === t}
              onClick={() => setMobileTab(t)}
              className={`flex-1 border-b-2 py-2.5 text-sm font-medium capitalize ${
                mobileTab === t ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500"
              }`}
            >
              {t === "preview" ? `Preview (${rows.length})` : "Options"}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="grid min-h-0 flex-1 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div
            className={`min-h-0 overflow-y-auto border-slate-200 bg-slate-50/60 px-5 py-5 sm:px-6 lg:block lg:border-r ${
              mobileTab === "options" ? "block" : "hidden"
            }`}
          >
            <ExportOptionsPanel form={form} disabled={busy} />
          </div>

          <div
            className={`min-h-0 flex-col gap-4 overflow-hidden px-5 py-5 sm:px-6 lg:flex ${
              mobileTab === "preview" ? "flex" : "hidden"
            }`}
            aria-label="Export preview"
          >
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Preview</h3>
              <span className="text-xs text-slate-500">
                {exporter.label} · {state.columns.length} column{state.columns.length === 1 ? "" : "s"}
              </span>
            </div>
            <ExportSummaryStrip summary={summary} currency={currency} />
            <ExportPreviewTable rows={rows} columns={state.columns} currency={currency} />
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white px-5 py-3.5 sm:px-6">
          {phase.kind === "error" && (
            <div role="alert" className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
              {phase.message}
            </div>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600" aria-live="polite">
              {rows.length === 0 ? (
                <span className="text-slate-500">No records selected</span>
              ) : (
                <>
                  <span className="font-semibold text-slate-900">{rows.length.toLocaleString()}</span> record
                  {rows.length === 1 ? "" : "s"} · <span className="tabular-nums">{formatCurrency(summary.total, currency)}</span>
                  {estimate !== null && <span className="text-slate-400"> · ~{formatBytes(estimate)}</span>}
                </>
              )}
            </p>
            <div className="flex items-center gap-2">
              <span className="mr-1 hidden text-xs text-slate-400 xl:inline">
                <kbd className="rounded border border-slate-200 px-1 font-sans">Ctrl</kbd>+
                <kbd className="rounded border border-slate-200 px-1 font-sans">Enter</kbd>
              </span>
              <button onClick={onClose} disabled={busy} className="btn-secondary flex-1 sm:flex-none">
                Cancel
              </button>
              <button
                onClick={() => void doExport()}
                disabled={!canExport}
                className={`btn-primary min-w-[170px] flex-1 sm:flex-none ${phase.kind === "done" ? "!bg-emerald-600" : ""}`}
              >
                {phase.kind === "exporting" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Generating {exporter.label}…
                  </>
                ) : phase.kind === "done" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    Downloaded
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" aria-hidden />
                    Export {rows.length > 0 ? rows.length.toLocaleString() : ""} as {exporter.label}
                  </>
                )}
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
