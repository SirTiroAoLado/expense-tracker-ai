# Spendwise — Expense Tracker

A personal expense tracker built with **Next.js 14 (App Router)**, **TypeScript** and **Tailwind CSS**. Data is stored in your browser's `localStorage`.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Production build:

```bash
npm run build && npm start
```

Other scripts: `npm run lint`, `npm run typecheck`.

## Features

- **Add / edit / delete** expenses (date, amount, category, description), with validation and undo after delete
- **Dashboard**: total spending, this month vs last month, daily average, top category, monthly trend chart (6M/12M), category breakdown, recent expenses
- **Expenses page**: search, category filter, date range (with quick presets), sorting, filtered totals
- **Advanced export drawer** (Dashboard → *Export data*, or Expenses → *Export…* which carries over the page filters):
  - Formats: **CSV** (Excel-friendly UTF-8, formula-injection safe), **JSON** (with filter + summary metadata), **PDF** (report with KPI tiles, category breakdown, paginated transactions table)
  - Date range with presets, category multi-select (with per-category counts), column picker, sort order
  - Live preview table, record count / total / average / date-span summary, estimated file size
  - Custom file name (sanitised, auto-generated until you edit it), loading + success + error states, `Ctrl/Cmd+Enter` to export
  - Format/column/sort preferences are remembered
- **Currency selector** (USD, EUR, GBP, BRL, JPY) for display formatting
- **Sample data** button for trying the app out
- Responsive layout with a mobile bottom nav, loading skeletons, toasts, error banner, and sync across browser tabs

## Project structure

```
docs/             project write-ups (e.g. code-analysis.md)
src/
  app/            layout, providers, dashboard (/) and expenses (/expenses) pages
  components/     form, modal, list, filter bar, summary cards, charts/, export/ (drawer, options, preview)
  hooks/          useExpenses (data + persistence), useExportDrawer, useToast, useExpenseDialog
  lib/            types, analytics (filter/sort/aggregate), storage, formatting, export/ (selection logic + CSV/JSON/PDF formats)
```

## Export feature variants (branches)

As a course exercise, the data-export feature was built three different ways, each on its own branch off `master`:

| Branch | Approach | Extra dependencies |
| --- | --- | --- |
| `feature-data-export-v1` | One-click **CSV** download from the dashboard | none |
| `feature-data-export-v2` | Export **drawer** with CSV, JSON and PDF, filters, column picker and live preview | `jspdf`, `jspdf-autotable` |
| `feature-data-export-v3` | **Share & Export hub** (`/exports`): templates, encrypted share links with QR codes, simulated cloud integrations and scheduled exports | `qrcode` |

To try one: `git switch feature-data-export-v2`, then `npm install` (v2 and v3 add packages) and `npm run dev`.

A side-by-side comparison (architecture, security, performance, maintainability) is in [`docs/code-analysis.md`](docs/code-analysis.md).
