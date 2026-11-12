# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Spendwise: a client-only personal expense tracker built with Next.js 14 (App Router), React 18, TypeScript (strict) and Tailwind CSS 3. There is no backend. All data lives in the browser's `localStorage`. This is a Coursera course project (Claude Code Software Engineering with Generative AI Agents).

## Commands

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (also lints and type-checks)
npm run lint       # next lint (eslint: next/core-web-vitals)
npm run typecheck  # tsc --noEmit
```

There is no test suite yet. Before you consider a change done, run `npm run typecheck`, `npm run lint` and `npm run build`.

## Architecture

- `src/app/`: routes. `/` is the dashboard (`page.tsx`), `/expenses` is the filterable list, `/exports` is the Share & Export hub, and `/share` is the read-only share-link viewer. `providers.tsx` wraps the app in `ToastProvider` > `ExpensesProvider` > `CloudProvider` > `ExpenseDialogProvider` > `ExportFlowProvider`.
- `src/hooks/useCloud.tsx`: integrations, the background job queue, scheduled exports, export history and shared links. Third-party services (Google, Dropbox, OneDrive, Slack, email sending) are **simulated** and labelled "Demo". Downloads, clipboard, `mailto:` drafts and share links are real.
- `src/hooks/useExpenses.tsx`: the single source of truth. It is a React context that hydrates from `localStorage` on mount, persists on change, syncs across tabs via the `storage` event, and exposes CRUD, undo (`restoreExpense`), currency and sample data.
- `src/lib/`: pure, framework-free logic. Keep it that way.
  - `types.ts`: `Expense`, `Category` (the fixed `CATEGORIES` tuple), `CurrencyCode`, filters and sort keys.
  - `storage.ts`: versioned keys (`expense-tracker:*:v1`), validation of stored rows, `generateId`.
  - `analytics.ts`: filter/sort/aggregate. `format.ts`: money and date helpers.
  - `cloud/`: `templates.ts` (export templates and CSV/JSON output), `share.ts` (share links: deflate plus optional AES-256-GCM, stored in the URL fragment), `schedule.ts`, `period.ts`, `services.ts` (simulated integrations), `insights.ts`. `qrcode` is lazy-loaded.
- `src/components/`: UI. Charts are hand-built in `components/charts/`, with no chart library.

## Conventions

- Import from `src` with the `@/` alias (for example `@/lib/types`).
- Dates are ISO calendar strings `YYYY-MM-DD` in local time, not `Date` objects or timestamps.
- Amounts are numbers in major units, rounded with `roundMoney`.
- Components that use hooks or browser APIs need `"use client"`. Access `window`/`localStorage` only inside effects or event handlers, never during render.
- If you change the shape of stored data, bump the storage key version and handle old data.
- CSV output (`lib/cloud/templates.ts`) must stay formula-injection safe (text cells that start with `=`, `+`, `-`, `@`, tab or CR get a `'` prefix).
- Icons come from `lucide-react`. Prefer that over adding new UI dependencies.

## Branches and tags

- `master` is the only branch. It contains the app with the v3 Share & Export hub.
- The tags `export-v1`, `export-v2` and `export-v3` preserve the three export implementations, which are compared in `docs/code-analysis.md`. v1 and v2 are alternatives that were not adopted, so don't port code from them unless asked.
- Known open issues in the adopted v3 code are listed in `docs/code-analysis.md` §7: H-1 (the `/share` viewer doesn't validate rows), H-2 (no cross-tab coordination in `useCloud`), M-2, M-3, L-5, L-6 and L-7.
- After switching to another tag and building, `npm run typecheck` can fail on stale `.next/types`. Run `npm run build`, or delete `.next`.
