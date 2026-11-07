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
src/
  app/            layout, providers, dashboard (/) and expenses (/expenses) pages
  components/     form, modal, list, filter bar, summary cards, charts/
  hooks/          useExpenses (data + persistence), useToast, useExpenseDialog
  lib/            types, analytics (filter/sort/aggregate), csv, storage, formatting
```
