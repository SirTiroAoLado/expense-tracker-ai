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
- **Share & Export hub** (`/exports`, also reachable from the Dashboard and Expenses pages):
  - **Templates**: Tax Report, Monthly Summary, Category Analysis (CSV) and Full Backup (JSON), each for any period
  - **Destinations**: Download, Copy as table (pastes into Sheets/Excel/Notion), Share link, Email, Google Sheets, Google Drive, Dropbox, OneDrive, Slack
  - **Share links with no server**: the report is compressed (and optionally AES-256-GCM encrypted with a password) into the URL fragment, with an expiry date, a QR code, and a read-only viewer at `/share`
  - **Background jobs**: an activity tray shows progress, and jobs pause while offline and resume when the connection returns
  - **Scheduled backups**: daily/weekly/monthly; they run while the app is open, and a missed run happens once when you next open the app
  - **History** of every export (re-run with current data), **integrations** with a simulated sign-in and live-sync status, **auto-written insights** in emails and Slack digests
  - **Demo mode**: third-party services and email sending are *simulated* and nothing leaves the browser. Downloads, clipboard, email drafts (`mailto:`) and share links really work.
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
