import { BarChart3, CalendarRange, DatabaseBackup, Landmark, type LucideIcon } from "lucide-react";
import { roundMoney } from "../format";
import { CATEGORIES, type CurrencyCode, type Expense } from "../types";
import { inRange, resolvePeriod, type PeriodId } from "./period";

export type TemplateId = "tax-report" | "monthly-summary" | "category-analysis" | "full-backup";
export type FileFormat = "csv" | "json";

export interface ExportTemplate {
  id: TemplateId;
  name: string;
  tagline: string;
  audience: string;
  icon: LucideIcon;
  accent: string; // tailwind gradient classes for the card art
  defaultPeriod: PeriodId;
  format: FileFormat;
  includes: string[];
}

export const TEMPLATES: ExportTemplate[] = [
  {
    id: "tax-report",
    name: "Tax Report",
    tagline: "Itemised transactions grouped by category, with subtotals and a grand total.",
    audience: "For your accountant",
    icon: Landmark,
    accent: "from-emerald-500 to-teal-600",
    defaultPeriod: "last-year",
    format: "csv",
    includes: ["Every transaction, grouped by category", "Category subtotals", "Grand total & period"],
  },
  {
    id: "monthly-summary",
    name: "Monthly Summary",
    tagline: "One row per month, one column per category. Perfect for spotting trends.",
    audience: "For budgeting",
    icon: CalendarRange,
    accent: "from-brand-500 to-indigo-600",
    defaultPeriod: "this-year",
    format: "csv",
    includes: ["Month × category pivot", "Monthly totals & counts", "Smart insights digest"],
  },
  {
    id: "category-analysis",
    name: "Category Analysis",
    tagline: "Totals, share, averages and largest purchases per category.",
    audience: "For understanding habits",
    icon: BarChart3,
    accent: "from-amber-500 to-orange-600",
    defaultPeriod: "last-3-months",
    format: "csv",
    includes: ["Share of spend per category", "Average & largest transaction", "Last purchase date"],
  },
  {
    id: "full-backup",
    name: "Full Backup",
    tagline: "Complete, machine-readable copy of every expense. Restore-ready.",
    audience: "For safekeeping",
    icon: DatabaseBackup,
    accent: "from-slate-600 to-slate-800",
    defaultPeriod: "all",
    format: "json",
    includes: ["All fields incl. IDs & timestamps", "Schema-versioned JSON", "Ideal for scheduled backups"],
  },
];

export const getTemplate = (id: TemplateId) => TEMPLATES.find((t) => t.id === id)!;

/** A generated export, ready to deliver to any destination. */
export interface Artifact {
  template: ExportTemplate;
  periodLabel: string;
  filename: string;
  mimeType: string;
  /** File contents in the template's native format. */
  content: string;
  /** Tabular view used for spreadsheet destinations, clipboard (TSV) and previews. */
  table: string[][];
  records: number;
  bytes: number;
}

const money = (n: number) => roundMoney(n).toFixed(2);

function buildTable(id: TemplateId, rows: Expense[], from: string, to: string): string[][] {
  switch (id) {
    case "tax-report": {
      const out: string[][] = [["Category", "Date", "Description", "Amount"]];
      let grand = 0;
      for (const c of CATEGORIES) {
        const items = rows.filter((e) => e.category === c).sort((a, b) => a.date.localeCompare(b.date));
        if (!items.length) continue;
        let sub = 0;
        for (const e of items) {
          out.push([c, e.date, e.description, money(e.amount)]);
          sub += e.amount;
        }
        out.push([`${c} subtotal`, "", `${items.length} item(s)`, money(sub)]);
        grand += sub;
      }
      out.push(["GRAND TOTAL", `${from || "start"} to ${to || "today"}`, `${rows.length} item(s)`, money(grand)]);
      return out;
    }
    case "monthly-summary": {
      const months = Array.from(new Set(rows.map((e) => e.date.slice(0, 7)))).sort();
      const out: string[][] = [["Month", ...CATEGORIES, "Total", "Transactions"]];
      for (const m of months) {
        const inMonth = rows.filter((e) => e.date.startsWith(m));
        const per = CATEGORIES.map((c) => inMonth.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0));
        out.push([m, ...per.map(money), money(per.reduce((a, b) => a + b, 0)), String(inMonth.length)]);
      }
      return out;
    }
    case "category-analysis": {
      const total = rows.reduce((s, e) => s + e.amount, 0);
      const out: string[][] = [["Category", "Transactions", "Total", "Share %", "Average", "Largest", "Largest item", "Last purchase"]];
      const stats = CATEGORIES.map((c) => {
        const items = rows.filter((e) => e.category === c);
        const t = items.reduce((s, e) => s + e.amount, 0);
        const largest = items.reduce<Expense | null>((m, e) => (!m || e.amount > m.amount ? e : m), null);
        const last = items.reduce((m, e) => (e.date > m ? e.date : m), "");
        return { c, n: items.length, t, largest, last };
      })
        .filter((s) => s.n > 0)
        .sort((a, b) => b.t - a.t);
      for (const s of stats) {
        out.push([
          s.c,
          String(s.n),
          money(s.t),
          total ? ((s.t / total) * 100).toFixed(1) : "0.0",
          money(s.t / s.n),
          money(s.largest!.amount),
          s.largest!.description,
          s.last,
        ]);
      }
      return out;
    }
    case "full-backup":
      return [
        ["id", "date", "category", "amount", "description", "createdAt", "updatedAt"],
        ...rows.map((e) => [e.id, e.date, e.category, money(e.amount), e.description, e.createdAt, e.updatedAt]),
      ];
  }
}

function csvCell(s: string): string {
  // Neutralise spreadsheet formula injection in text cells (numbers like "-5.00" are left alone).
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const tableToCSV = (t: string[][]) => t.map((r) => r.map(csvCell).join(",")).join("\r\n");
/** Tab-separated: pastes straight into Google Sheets, Excel, Numbers or Notion tables. */
export const tableToTSV = (t: string[][]) => t.map((r) => r.map((c) => c.replace(/[\t\r\n]+/g, " ")).join("\t")).join("\n");

export function buildArtifact(templateId: TemplateId, all: Expense[], periodId: PeriodId, currency: CurrencyCode): Artifact {
  const template = getTemplate(templateId);
  const period = resolvePeriod(periodId);
  const rows = all.filter((e) => inRange(e.date, period.from, period.to)).sort((a, b) => b.date.localeCompare(a.date));
  const table = buildTable(templateId, rows, period.from, period.to);

  const content =
    template.format === "json"
      ? JSON.stringify(
          { $schema: "spendwise-backup/v1", exportedAt: new Date().toISOString(), currency, period: { from: period.from || null, to: period.to || null }, count: rows.length, expenses: rows },
          null,
          2,
        )
      : "﻿" + tableToCSV(table);

  const stamp = new Date().toISOString().slice(0, 10);
  return {
    template,
    periodLabel: period.label,
    filename: `spendwise-${template.id}-${periodId}-${stamp}.${template.format}`,
    mimeType: template.format === "json" ? "application/json" : "text/csv;charset=utf-8",
    content,
    table,
    records: rows.length,
    bytes: new TextEncoder().encode(content).length,
  };
}

export function downloadArtifact(a: Artifact): void {
  const url = URL.createObjectURL(new Blob([a.content], { type: a.mimeType }));
  const link = Object.assign(document.createElement("a"), { href: url, download: a.filename });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
