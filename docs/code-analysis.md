# Data Export: Code Analysis of Three Implementations

**Repository:** `expense-tracker-ai` (Spendwise): Next.js 14 App Router, TypeScript, Tailwind, `localStorage` persistence
**Branches analysed:** `feature-data-export-v1` (`5679a2e`), `feature-data-export-v2` (`a5de14f`), `feature-data-export-v3` (`1e64c1f`). All three branch from `master` (`e7267f3`).
**Date:** 2026-11-07

> **Decision (2026-11-12):** v3 was adopted and merged into `master`. The three branches have been replaced by the tags `export-v1`, `export-v2` and `export-v3`, and the commit hashes below are still reachable through them. **H-1 and H-2 (§7) have since been fixed in `master`**, with unit tests. The rest of this document is unchanged from the original analysis.

> **Disclosure:** all three branches were written by the same author (Claude), on request, as deliberately different design exercises. Read this as a structured self-review. Every finding below was checked against the code on each branch (see *Method*), but an independent reviewer may weigh things differently.

---

## Contents

1. [Executive summary](#1-executive-summary)
2. [Baseline: what `master` already had](#2-baseline-what-master-already-had)
3. [Version 1: one-button CSV](#3-version-1--one-button-csv)
4. [Version 2: advanced local export drawer](#4-version-2--advanced-local-export-drawer)
5. [Version 3: cloud-style Share & Export hub](#5-version-3--cloud-style-share--export-hub)
6. [Side-by-side comparison](#6-side-by-side-comparison)
7. [Issues found, by severity](#7-issues-found-by-severity)
8. [Recommendation: what to adopt and how to combine](#8-recommendation--what-to-adopt-and-how-to-combine)
9. [Method](#9-method)

---

## 1. Executive summary

| | **v1: Simple** | **v2: Advanced local** | **v3: Cloud hub** |
|---|---|---|---|
| UX pattern | One button on the dashboard | Slide-over drawer: options on the left, live preview on the right | Dedicated `/exports` page with 5 tabs + a 3-step modal wizard + a background activity tray |
| Formats | CSV | CSV, JSON, PDF | CSV (4 templates), JSON (backup), TSV (clipboard), self-contained share link |
| Files changed (excl. lockfile) | 2 | 18 | 31 |
| Lines (+/−) | +19 / −8 | +1,312 / −52 | +3,644 / −60 |
| New runtime deps | none | `jspdf`, `jspdf-autotable` (lazy-loaded) | `qrcode` (lazy-loaded) |
| First-load JS, `/` | 110 kB | 119 kB | 130 kB |
| Prod-dependency audit (vs. `master`'s 2) | 2 (unchanged) | **5** (+3 via jsPDF → DOMPurify) | 2 (unchanged) |
| Real vs. simulated | 100 % real | 100 % real | Mixed: download, clipboard, `mailto:` and share links are real; OAuth, uploads, email sending, Slack, live sync and schedules' delivery are **simulated** |
| Best at | Zero-cost, zero-risk "get my data out" | Precise, user-controlled exports, incl. printable reports | Sharing and recurring workflows; the share-link mechanism is genuinely novel |
| Biggest weakness | No feedback, no options | jsPDF supply-chain weight; PDF can't render non-Latin text | Large surface area, mostly simulated; one 440-line god-provider; several real bugs (§7) |

**Bottom line:** adopt **v2's export engine** (pure selection functions + an `Exporter` interface per format) as the core, put **v1's one-click path** on top of it as a quick action, and port **v3's two genuinely working ideas**: serverless share links and "copy as table". Leave v3's simulated integrations out until a backend exists. Details in §8.

---

## 2. Baseline: what `master` already had

Context matters, because each version replaces or extends this:

- `src/lib/csv.ts`: `expensesToCSV()` builds the columns `Date, Category, Description, Amount` with an `escapeCell()` that quotes RFC-4180 style and **neutralises spreadsheet formula injection** (prefixes `'` to text cells starting with `= + - @ \t \r`). `downloadCSV()` adds a UTF-8 BOM (so Excel shows accents correctly), creates a `Blob`, then clicks a temporary `<a download>` and revokes the object URL after 1 s.
- `src/app/expenses/page.tsx`: an **"Export CSV"** button exports the *currently filtered and sorted* list, with toasts for the empty and failure cases.
- State: `ExpensesProvider` (React context + `localStorage`, cross-tab sync via the `storage` event), `ToastProvider`, `ExpenseDialogProvider`.

So `master` already had a basic export. Each branch handles it differently:

| | v1 | v2 | v3 |
|---|---|---|---|
| Expenses-page "Export CSV" | kept (and its column order changes as a side effect) | button now opens the drawer, pre-seeded with the page's date and category filters | button now opens the wizard (no seeding) |
| `src/lib/csv.ts` | modified | deleted (logic moved to `lib/export/formats/csv.ts`) | deleted (logic moved to `lib/cloud/templates.ts`) |

---

## 3. Version 1: one-button CSV

### 3.1 Files

| File | Change |
|---|---|
| `src/app/page.tsx` | **Modified.** Adds an "Export Data" button to the dashboard header (+15 lines) |
| `src/lib/csv.ts` | **Modified.** Column order changes to `Date, Category, Amount, Description` (2 lines) |

### 3.2 Architecture overview

There's no new architecture. The feature is one inline event handler that reuses existing modules:

```
DashboardPage (client component)
  └─ <button onClick={() => downloadCSV(sortExpenses(expenses, "date-desc"), `expenses-${todayISO()}.csv`)}>
        │                │                                     │
        │                └─ lib/analytics.ts (existing)        └─ lib/format.ts (existing)
        └─ lib/csv.ts (existing, column order changed)
```

### 3.3 Key components and responsibilities

| Unit | Responsibility |
|---|---|
| `DashboardPage` | Renders the button; disables it when `expenses.length === 0` |
| `sortExpenses()` | Sorts newest-first (stable tiebreak on `createdAt`) |
| `expensesToCSV()` / `escapeCell()` | Serialisation, quoting, formula-injection guard |
| `downloadCSV()` | BOM + Blob + object URL + programmatic `<a download>` click |

### 3.4 Libraries

None added. It uses only browser APIs: `Blob`, `URL.createObjectURL`, `HTMLAnchorElement.download`.

### 3.5 Patterns

- **Reuse over abstraction:** the existing utilities are composed inline.
- **Synchronous, fire-and-forget:** no state, no loading or result phases.

### 3.6 Complexity

Trivial: 0 new hooks, 0 new components, cyclomatic complexity ≈ 1. Anyone can read the whole feature in under a minute.

### 3.7 Error handling

- **None at the call site.** There's no `try/catch` and no toast. If `Blob` creation or the click throws (e.g. a sandboxed iframe or a locked-down browser), the exception goes to React's error overlay in dev and is silently lost in prod. `master`'s Expenses-page button *does* wrap the same call in `try/catch` with a toast, so v1 is less defensive than the code it sits next to.
- **Empty state:** handled by disabling the button.
- **No success feedback.** The browser's download UI is the only signal.

### 3.8 Security

- Formula injection is guarded (inherited from `escapeCell`). Amounts are formatted with `toFixed(2)` and are numbers, so they're never prefixed.
- The file never leaves the device. No new attack surface.

### 3.9 Performance

O(n log n) sort + O(n) serialise, on the main thread, synchronously. That's fine for realistic personal data (thousands of rows take milliseconds). There's no lazy loading and no bundle impact (+~0.5 kB page JS).

### 3.10 Extensibility and maintainability

- **Pros:** almost nothing to maintain.
- **Cons:** nothing to extend. Adding a second format means reworking the call site.
- **Side effect:** reordering the columns in the shared `expensesToCSV()` also changes the Expenses-page export, a behaviour change outside the feature's stated scope. It's documented in the commit message, but it's still a coupling hazard: two features share one serialiser with no tests pinning its output.

### 3.11 Technical deep dive

| Question | Answer |
|---|---|
| How does export work? | Click → sort all expenses → build CSV string → `Blob` → object URL → hidden `<a download>` click → revoke URL after 1 s |
| File generation | String concatenation in memory; `\r\n` line endings; UTF-8 BOM prefix; RFC-4180 quoting |
| User interaction | A single click. The button is disabled when there's no data |
| State management | None. Reads `expenses` from `ExpensesProvider` |
| Edge cases | Empty: button disabled. Commas, quotes, newlines: quoted. Formula-like text: prefixed with `'`. Non-ASCII: BOM. **Not handled:** download failure feedback; same-day re-exports get the browser's automatic ` (1)` suffix |

---

## 4. Version 2: advanced local export drawer

### 4.1 Files

| File | Change | Lines |
|---|---|---|
| `src/lib/export/types.ts` | New: domain types (`ExportOptions`, `ExportSummary`, `ExportContext`, `Exporter`) | 54 |
| `src/lib/export/prepare.ts` | New: pure functions `selectRows`, `summarize`, `orderedColumns`, `cellValue`, `sanitizeFilename`, `defaultFilename` | 84 |
| `src/lib/export/formats/csv.ts` | New: CSV exporter (BOM, quoting, formula guard, column subset) | 26 |
| `src/lib/export/formats/json.ts` | New: JSON exporter with `$schema`, filters and summary metadata | 41 |
| `src/lib/export/formats/pdf.ts` | New: jsPDF report (header, KPI tiles, category table with colour dots, paginated transactions, footers) | 156 |
| `src/lib/export/index.ts` | New: `EXPORTERS` registry, `downloadBlob`, `runExport`, re-exports | 35 |
| `src/components/export/useExportForm.ts` | New: `useReducer` form state, derived rows and summary, validation, persisted preferences | 140 |
| `src/components/export/ExportOptionsPanel.tsx` | New: 5 numbered sections (format, date range, categories, columns and sort, filename) | 321 |
| `src/components/export/ExportPreview.tsx` | New: summary strip + preview table (first 100 rows) | 148 |
| `src/components/export/ExportDrawer.tsx` | New: drawer shell, mobile tabs, footer, export lifecycle, keyboard handling | 232 |
| `src/hooks/useExportDrawer.tsx` | New: context provider exposing `openExport(seed?)` | 31 |
| `src/app/page.tsx` | Modified: "Export data" button | |
| `src/app/expenses/page.tsx` | Modified: button opens the drawer seeded with page filters; old handler removed | |
| `src/app/providers.tsx` | Modified: adds `ExportDrawerProvider` | |
| `tailwind.config.ts` | Modified: `drawer-in` keyframe | |
| `src/lib/csv.ts` | **Deleted** | |
| `package.json`, `README.md` | Modified | |

### 4.2 Architecture overview

A clean **three-layer** split:

```
┌─ UI layer ───────────────────────────────────────────────────────────┐
│ ExportDrawerProvider (hooks/useExportDrawer)                          │
│   └─ ExportDrawer  ── phase machine: idle → exporting → done | error  │
│        ├─ ExportOptionsPanel   (pure view over form state)            │
│        └─ ExportSummaryStrip / ExportPreviewTable                     │
├─ State layer ────────────────────────────────────────────────────────┤
│ useExportForm(expenses, seed)                                         │
│   useReducer(reducer) → state; useMemo → rows, summary, counts        │
│   derived: errors, options; effect: persist prefs to localStorage     │
├─ Domain layer (framework-free, unit-testable) ───────────────────────┤
│ lib/export/prepare.ts   selectRows · summarize · sanitizeFilename     │
│ lib/export/formats/*    Exporter { id, extension, mimeType, build() } │
│ lib/export/index.ts     EXPORTERS registry · runExport · downloadBlob │
└──────────────────────────────────────────────────────────────────────┘
```

The domain layer has **no React imports**. That's why it could be compiled and tested in plain Node during development, including generating a real 4-page PDF.

### 4.3 Key components and responsibilities

| Unit | Responsibility |
|---|---|
| `Exporter` interface | Strategy pattern: `build(ctx) => Promise<Blob>`. Adding a format means adding one module plus a registry entry |
| `selectRows` | Date-range + category-set filter, then sort (`date-desc` / `date-asc` / `amount-desc`) |
| `summarize` | Count, total, average, first and last date, per-category breakdown (sorted) |
| `sanitizeFilename` | Strips `<>:"/\|?*` and control characters, collapses whitespace, trims leading and trailing `.`, spaces and `-`, caps at 120 chars |
| `defaultFilename` | Auto-name from filters (e.g. `spendwise-expenses-food-2026-10-01_to_today`) until the user edits it |
| `useExportForm` | Reducer with 8 action types; `filenameEdited` flag keeps auto-naming until the user takes over; validation object; persists format, columns and sort |
| `ExportDrawer` | Lifecycle (`Phase` union type), file-size estimate, Esc / Ctrl+Enter / focus trap, body scroll lock, focus restore, mobile Options/Preview tabs |
| `buildPDF` | Lazy `import("jspdf")` + `import("jspdf-autotable")`; WinAnsi sanitising of locale spaces; page footers with "Page X of Y" |

### 4.4 Libraries

| Package | Version | Use | Loading |
|---|---|---|---|
| `jspdf` | 2.5.2 | PDF document model and text/vector drawing | Dynamic `import()` inside `buildPDF`, so it costs nothing until a PDF is generated |
| `jspdf-autotable` | 3.8.4 | Paginated tables with header, footer and hooks | Same |

**Measured bundle impact:** `/` first load went from 110 kB to 119 kB, mostly drawer UI code. jsPDF (~350 kB) sits in a separate chunk.

### 4.5 Patterns

- **Strategy + registry** for formats.
- **Reducer** for multi-field form state, with **derived state** via `useMemo` (rows, summary, category counts) instead of storing duplicates.
- **Discriminated union** for the export lifecycle (`{kind:"idle"} | {kind:"exporting"} | {kind:"done", filename} | {kind:"error", message}`).
- **Ref-latching** (`doExportRef`, `busyRef`, `onCloseRef`) so the global `keydown` listener is attached once and always sees the latest closures.
- **Context-provided imperative API** (`openExport(seed)`) so any page can open the drawer with pre-filled filters.
- **Progressive disclosure:** sensible defaults (all categories, all columns, auto filename) and remembered preferences.

### 4.6 Complexity

Moderate. Roughly 1,240 new lines across 11 new modules; 7 `useState`, 1 `useReducer`, 3 `useEffect`, 10 memo/callback hooks. The largest file (`ExportOptionsPanel.tsx`, 321 lines) is mostly declarative JSX. The real logic sits in ~200 lines of pure functions, which keeps the cognitive load reasonable.

### 4.7 Error handling

| Case | Behaviour |
|---|---|
| Invalid range (start > end) | Inline error; export disabled |
| No categories / no columns | Inline error; export disabled |
| Empty or invalid filename after sanitising | Inline error; export disabled |
| Zero matching rows | Empty-state preview; export disabled; footer reads "No records selected" |
| Exporter throws (e.g. jsPDF chunk fails to load) | `try/catch` → `console.error` + inline error banner in the footer; the drawer stays open so the user can retry |
| Close during export | Esc, backdrop and Cancel are disabled while busy |
| `localStorage` unavailable | Preference load and save wrapped in `try/catch`; defaults used |

There's no global error boundary, but the export path itself is well contained.

### 4.8 Security

- **CSV formula injection** is guarded (text cells only; numeric cells are numbers).
- **Filename sanitising** covers characters that are illegal on Windows, macOS and Linux. **Gap:** Windows reserved device names (`CON`, `PRN`, `AUX`, `NUL`, `COM1`…) aren't rejected. Browsers usually rewrite these, but it isn't guaranteed.
- **PDF:** all text goes through jsPDF's `text()`, with no HTML rendering, so there's no injection path inside the PDF.
- **Supply chain:** jsPDF 2.5.2 depends on a **vulnerable DOMPurify (≤3.4.16; ~19 XSS/bypass advisories)**. `npm audit` goes from 2 to **5** production vulnerabilities (3 high, 2 critical, counting Next's). DOMPurify is only used by jsPDF's `html()` method, which v2 **never calls**, so the vulnerable code isn't reachable in practice. It still ships in the dependency tree and will fail audits. The fix is jsPDF 4.x + jspdf-autotable 5.x (breaking API changes).
- Data never leaves the device.

### 4.9 Performance

- **Lazy PDF engine:** good. The PDF chunk is fetched only on the first PDF export.
- **Main-thread PDF layout:** `buildPDF` is synchronous apart from the import. A 50 ms `setTimeout` lets the spinner paint first. A 10k-row PDF would block the UI for a noticeable moment; a Web Worker would fix that.
- **Size estimate recomputes on every render (bug).** `useExportForm` builds `options` as a fresh object literal on each render (`useExportForm.ts:129`). The drawer's `estimate` memo lists `options` as a dependency (`ExportDrawer.tsx:39`), so the memo never hits, and it **re-serialises the whole dataset to CSV or JSON on every render**, including every keystroke in the filename box and every phase change. It's capped at 20,000 rows, and it's cheap for personal-scale data, but it's an O(n) hot path that should be memoised.
- `rows` is memoised on the whole `state` object, so typing in the filename also re-filters and re-sorts. That's minor at personal scale, but the dependencies should be narrowed to `from`, `to`, `categories` and `sort`.
- The preview renders at most 100 rows, so DOM size stays bounded.

### 4.10 Extensibility and maintainability

- **High.** The format plug-in contract is explicit and typed; pure functions are trivially testable; UI and domain are decoupled.
- **Duplication:** `ExportDrawer` re-implements the focus trap, scroll lock and focus restore that `components/Modal.tsx` already has. That logic should become a shared `useDialogA11y()` hook.
- **Type hygiene:** several `as unknown as [number, number, number]` casts in `pdf.ts` work around jspdf-autotable's colour types. They're harmless, but they're a smell.
- **Seeding gap:** opening the drawer from the Expenses page carries over the **date and category filters but not the search text**. If the user searched "groceries", the export silently includes everything in range. Either carry `search` into the export options or label the drawer accordingly.
- **PDF i18n limit:** jsPDF's built-in fonts are WinAnsi only. € £ ¥ and Latin accents work (verified in the raw PDF stream), but **CJK, Cyrillic, Greek or emoji in descriptions will render as garbage**. Supporting them means embedding a TTF font (adding hundreds of kB).

### 4.11 Technical deep dive

| Question | Answer |
|---|---|
| How does export work? | `openExport(seed)` mounts the drawer → `useExportForm` derives `rows` and `summary` on each change → the preview updates live → Export: `runExport(ctx)` → `EXPORTERS[format].build(ctx)` returns a `Blob` → `downloadBlob` (object URL + `<a download>`, revoked after 2 s) → success state, toast, auto-close after 1.1 s |
| File generation | **CSV:** string build, BOM, `\r\n`, quoting, formula guard, canonical column order whatever the toggle order. **JSON:** `JSON.stringify` of `{ $schema, generatedAt, currency, filters, summary, expenses[] }`, with amounts kept as numbers. **PDF:** jsPDF A4 in points; vector header band; 4 KPI tiles; autotable category table with colour dots drawn in `didDrawCell`; striped transactions table with a totals footer on the last page; per-page footer loop; `doc.output("blob")` |
| User interaction | Drawer with 5 numbered sections, presets (All time, This month, Last month, Last 3 months, YTD, Last year), category chips with live counts, column toggles, sort, filename with an extension suffix and "Will be saved as…" hint. Esc closes; Ctrl/Cmd+Enter exports; focus trap; mobile tabs |
| State management | Local `useReducer` per drawer instance; derived `useMemo`; preferences in `localStorage`; drawer open state and seed in a small context |
| Edge cases | Invalid range, empty selection, empty filename, zero rows, oversize estimate (skipped above 20k rows), locale space characters in PDF (` `, ` ` → space), filename collisions (left to the browser) |

---

## 5. Version 3: cloud-style Share & Export hub

### 5.1 Files

**Domain (`src/lib/cloud/`):**

| File | Lines | Responsibility |
|---|---|---|
| `period.ts` | 46 | Relative periods (this month, last month, last 3 months, this year, last year, all) + the matching previous period for comparisons |
| `templates.ts` | 200 | 4 templates (Tax Report, Monthly Summary, Category Analysis, Full Backup) → `Artifact { content, table, filename, mimeType, bytes }`; CSV/TSV serialisers; `downloadArtifact` |
| `insights.ts` | 51 | Natural-language headlines (total, change vs. previous period, top category, largest expense, busiest weekday) |
| `services.ts` | 140 | Catalogue of 9 destinations with flags (`simulated`, `requiresConnection`, `schedulable`), progress step labels and OAuth scopes |
| `schedule.ts` | 73 | `computeNextRun` (daily, weekly, monthly), `describeSchedule`, `relativeTime` (Intl) |
| `share.ts` | 119 | Share-link codec: deflate-raw → optional AES-256-GCM (PBKDF2-SHA256) → base64url in the URL fragment; typed `ShareLinkError` |

**State:** `src/hooks/useCloud.tsx` (440 lines: connections, jobs, worker, scheduler, live sync, history, shares, persistence) and `src/hooks/useExportFlow.tsx` (31 lines: wizard host + activity tray).

**UI (`src/components/cloud/`):** `ExportFlow.tsx` (wizard, 229), `DestinationConfigs.tsx` (local, email, Sheets, storage and Slack configs, 409), `ShareConfig.tsx` (276), `ConnectPanel.tsx` (simulated OAuth, 127), `ScheduleDialog.tsx` (249), `ActivityTray.tsx` (87), `SyncStatus.tsx` (56), `SheetPreview.tsx` (61), `ServiceIcon.tsx` (24), `hub/OverviewTab.tsx` (141), `hub/IntegrationsTab.tsx` (158), `hub/ActivityTabs.tsx` (history, schedules and shared links, 359).

**Routes:** `src/app/exports/page.tsx` (tabbed hub, `?tab=` deep links, `Suspense` for `useSearchParams`), `src/app/share/page.tsx` (public read-only viewer, 213).

**Modified:** `Navbar.tsx` (new nav item, sync pill, minimal header on `/share`, 4-column mobile nav), `Modal.tsx` (`lg` size), `providers.tsx`, `page.tsx`, `expenses/page.tsx`, `globals.css` (`.scrollbar-none`), `README.md`, `package.json`. **Deleted:** `src/lib/csv.ts`.

### 5.2 Architecture overview

```
providers.tsx
 Toast → Expenses → CloudProvider (useCloud) → ExpenseDialog → ExportFlowProvider
                         │                                        ├─ <ExportFlow/> (wizard modal)
                         │                                        └─ <ActivityTray/> (global)
                         ├─ persisted: connections · history · schedules · shares  (1 localStorage key)
                         ├─ in-memory: jobs[] · online · syncing
                         ├─ worker:    setInterval(280 ms) advances simulated jobs; pauses offline
                         ├─ scheduler: setInterval(30 s) runs due schedules (once per occurrence)
                         └─ live sync: effect on `expenses` → "syncing" → lastSyncAt

/exports (tabs) ── Overview · Integrations · Schedules · History · Shared links
/share#v1.<flags>.<payload> ── decodeSnapshot() in the browser → read-only report
```

The domain layer (`lib/cloud/*`) is framework-free and well factored. The state layer is concentrated in **one provider that does six jobs**.

### 5.3 Key components and responsibilities

| Unit | Responsibility |
|---|---|
| `buildArtifact(template, expenses, period, currency)` | Single entry point that produces the file content *and* a 2-D `table` used for spreadsheet previews, TSV clipboard and Sheets mock-ups |
| `encodeSnapshot` / `decodeSnapshot` | Versioned token `v1.<flags>.<data>`; flags `z` (compressed) and `e` (encrypted); salt (16 B) + IV (12 B) + ciphertext |
| `CloudProvider.startJob` | Local destinations run **immediately** (to keep the user-gesture activation needed by the Clipboard API); cloud destinations are queued for the simulated worker |
| Worker effect | Advances progress by random increments, maps progress onto the service's step labels, sets `waiting` while `navigator.onLine` is false, writes a history entry on completion, and updates `lastSyncAt` |
| Scheduler effect | Finds `enabled && nextRunAt <= now`, runs it, advances `nextRunAt`. A `ranOccurrences` set guards against StrictMode double effects; manual "Run now" bypasses the guard and keeps the regular cadence |
| `ExportFlow` | 3-step wizard (`what → where → [connect] → configure`) with an inline `ConnectPanel` (avoids nested modals) and per-destination config components sharing a `ConfigProps` contract |
| `/share` viewer | Fragment parsing, password gate, expiry check, report rendering (reuses `CategoryBreakdown`), CSV re-download for the recipient |

### 5.4 Libraries

| Package | Use | Loading |
|---|---|---|
| `qrcode` 1.5.4 (+ `@types/qrcode`) | QR as a PNG data URL | Dynamic `import()` only when a QR is shown |
| *Web platform* | `CompressionStream("deflate-raw")`, `crypto.subtle` (PBKDF2, AES-GCM), `crypto.getRandomValues`, `Intl.RelativeTimeFormat`, `navigator.clipboard`, `navigator.onLine` + `online`/`offline` events, `TextEncoder` | Native |

No audit regressions compared with `master`.

**Measured bundle impact:** `/` first load went from 110 kB to **130 kB** (+18 %), `/expenses` to 120 kB, `/exports` is 126 kB and `/share` 113 kB. Because `CloudProvider` and `ExportFlowProvider` (with the wizard and tray) live in the **root layout**, every page pays for the export system even if it's never opened.

### 5.5 Patterns

- **Catalogue-driven UI:** destinations are data (`SERVICES`), so the tiles, scheduling eligibility, step labels and Demo badges all come from one table.
- **Artifact pattern:** generate once, deliver anywhere (file, TSV, preview grid, simulated upload).
- **Job queue + worker loop:** a simulated background-processing model with offline pause/resume.
- **Capability-based honesty:** a `simulated` flag on each service drives the "Demo" badges, and a page-level disclosure says exactly what's real.
- **URL-addressable tabs** (`/exports?tab=history`) via `router.replace`.
- **Serverless sharing:** the URL fragment acts as a storage medium; the fragment is never sent to the server in HTTP requests.

### 5.6 Complexity

High. +3,644 lines across 31 files; 62 `useState`, 13 `useEffect`, 25 memo/callback hooks, 9 timers, 26 exported components. Concurrency is the hardest part: two intervals, a timeout chain, `online` listeners, StrictMode guards, and ref-latched snapshots (`dataRef`, `jobsRef`, `expensesRef`) to avoid stale closures. `useCloud.tsx` alone is 440 lines with 18 callbacks in one context value.

### 5.7 Error handling

| Case | Behaviour |
|---|---|
| Clipboard or download blocked | `startJob` catches it, marks the job `failed`, records a failed history entry, shows an error toast |
| Offline | Simulated cloud jobs go to `waiting` ("Waiting for connection…"); live sync defers until `online` |
| Share-link creation fails (no `crypto.subtle` or `CompressionStream`) | `try/catch` + toast. **No compression?** It falls back to an uncompressed token (flag `-`). The decoder reports "browser too old" if it can't decompress |
| Share link: wrong password / tampered | AES-GCM authentication fails → `ShareLinkError("password")`. Tampering and a wrong password look the same to the user (acceptable) |
| Share link: malformed / truncated | `ShareLinkError("malformed")` → friendly error card |
| Share link: expired | Checked after decoding → "This link has expired" card |
| Form validation | Email chips (per-address), schedule name and target, recipients, connection prerequisites, password ≥ 6 chars, connect-panel email format |
| Disconnecting a service | Pauses (doesn't delete) dependent schedules; re-enabling them is blocked until you reconnect |
| `localStorage` corrupt or full | Load falls back to empty state; save errors are swallowed (non-critical) |

**Gaps:**
- the `/share` viewer barely validates decoded content (see §7, H-1)
- no cross-tab coordination (H-2)
- schedules don't check the connection at run time (only at toggle and disconnect)

### 5.8 Security

**Strong points:**
- Fragment-only transport: `#…` is never sent to the server, so the hosting server never sees report data.
- AES-256-GCM with a random 96-bit IV and 128-bit salt per link; authenticated encryption detects tampering.
- React escapes all decoded strings; no `dangerouslySetInnerHTML` (QR codes are `<img src="data:…">`).
- `mailto:` parameters go through `encodeURIComponent`; external links use `noopener noreferrer`.
- The recipient's CSV re-download has the same formula-injection guard.

**Weak points, documented honestly:**
- **Unprotected links are bearer tokens.** Anyone holding the URL can read the data, and URLs leak through browser history, sync, chat-app previews and screenshots of the QR.
- **Expiry is advisory.** It's enforced by the viewer only. For unencrypted links, anyone can decode the payload by hand and ignore `expiresAt`. For encrypted links, anyone with the password can do the same.
- **No revocation.** "Remove" only hides the link locally; the UI says this explicitly.
- **Offline brute force.** The ciphertext lives in the URL, so an attacker can guess passwords offline. **PBKDF2 at 150,000 iterations** is below OWASP's current guidance for PBKDF2-HMAC-SHA256 (600,000), and the **6-character minimum** is weak against offline attack. Raise both, or derive with Argon2id via WASM.
- **Simulated OAuth collects an email address** and stores it in `localStorage`. It isn't sent anywhere, but in a real build this would be replaced by provider tokens, which must never sit in `localStorage`.

### 5.9 Performance

- **Context churn:** the `CloudProvider` value includes `jobs` and changes **every 280 ms while a job runs**. Every `useCloud()` consumer re-renders on each tick: navbar `SyncStatus`, the hub page and its active tab, the tray, and the wizard if open. That's acceptable at this size but scales poorly. Split it into `CloudDataContext` (rarely changes) and `JobsContext` (high frequency), or use a store with selectors (Zustand or `useSyncExternalStore`).
- **Persistence writes** the whole cloud state to `localStorage` on every change. `history` is capped at 60, but **`shares` is unbounded and stores full URLs** (~1.5 kB for 80 rows, much more for "All time"). Repeated sharing grows storage without limit.
- **Share-link size** grows linearly with rows. Measured: 80 expenses → 3.5 kB JSON → **1,216 chars** (plain) / **1,276** (encrypted). Long periods can exceed QR capacity (handled with a message) and practical URL limits in some chat apps (not handled).
- PBKDF2 at 150k iterations takes ~50–150 ms on mid-range devices. That's acceptable and shown as "Encrypting…".
- The root-layout providers add ~20 kB to every page (see §5.4).

### 5.10 Extensibility and maintainability

- **Pros:** the domain modules are clean and testable; new templates are one entry in `TEMPLATES` plus a `buildTable` case; new destinations are one `SERVICES` entry plus one config component; the share token is versioned (`v1.`), so the format can change later.
- **Cons:**
  - `useCloud` is a **god object**. Connections, the job queue, the worker, the scheduler, live sync, history and shares should be separate hooks or stores.
  - About 60 % of the feature is **simulation**. Making it real needs OAuth, provider SDKs, a server for email, durable job execution and token storage, and the UI contract will likely change once real APIs (rate limits, partial failures, consent revocation) are involved.
  - The second-highest maintenance cost after the provider is `DestinationConfigs.tsx` (409 lines, 5 components).
  - The end-to-end test harness used during development lives outside the repo, so **no automated tests are committed** on any branch.

### 5.11 Technical deep dive

| Question | Answer |
|---|---|
| How does export work? | Wizard: template + period → `buildArtifact()` (memoised) → destination tile (inline connect if needed) → destination config → `startJob()`. Local destinations run synchronously in the click (download / clipboard). Cloud destinations become `Job`s the worker advances through labelled steps; on completion they're written to history and the tray shows done |
| File generation | **Tax Report:** rows grouped by category with subtotal rows and a grand-total row. **Monthly Summary:** month × category pivot with totals and counts. **Category Analysis:** count, total, share %, average, largest item, last purchase. **Full Backup:** schema-versioned JSON of raw records. All are produced as `string[][]`, then serialised to CSV (BOM, formula guard that exempts numeric strings) or TSV (tabs and newlines stripped from cells). **Share link:** `JSON → deflate-raw → [AES-GCM] → base64url` |
| User interaction | Hub page with stats hero, templates, quick destinations and recent activity; 3-step stepper modal; simulated OAuth (sign-in → consent → connecting); per-destination configs (email chips, Sheets new/existing + tab + live sync + grid preview, storage folder + versioning, Slack channel + message preview, share options + QR); bottom-left activity tray; navbar sync pill; schedule editor with "next 3 runs" preview |
| State management | Global context for cloud state (persisted, one key) + in-memory jobs; local `useState` per dialog; refs to read the latest state inside intervals; URL search param for the active tab |
| Edge cases | Offline pause/resume; schedule catch-up (one run, not a burst); month-end scheduling limited to day 1–28 (sidesteps Feb 30); year rollover; StrictMode double effects; zero-row periods (warning in step 1); QR overflow; wrong password; truncated or garbage links; expired links; disconnected integrations pausing schedules. **Not handled:** multiple open tabs (duplicate schedule runs, last-writer-wins on cloud state); malformed-but-decodable share payloads; URL-length limits of messaging apps |

---

## 6. Side-by-side comparison

### 6.1 Feature matrix

| Capability | v1 | v2 | v3 |
|---|:-:|:-:|:-:|
| One-click export | ✅ | — (≥2 clicks) | — (≥3 clicks) |
| CSV | ✅ | ✅ | ✅ (4 templates) |
| JSON | — | ✅ | ✅ (backup only) |
| PDF | — | ✅ | — |
| Clipboard (paste into spreadsheet) | — | — | ✅ |
| Arbitrary date range | — | ✅ | — (presets only) |
| Category multi-select | — | ✅ | — |
| Column selection / sort | — | ✅ | — (fixed per template) |
| Live preview / record count | — | ✅ | ✅ (counts; grid preview for some destinations) |
| Custom filename | — | ✅ | — (auto) |
| Loading / success / error states | — | ✅ | ✅ |
| Share with others | — | — | ✅ link + QR + password + expiry (real); email (simulated) |
| Integrations | — | — | 🟡 simulated |
| Scheduling | — | — | 🟡 UI real, delivery simulated, runs only while the app is open |
| Export history | — | — | ✅ |
| Keyboard shortcuts / focus trap | — | ✅ | ✅ (via shared `Modal`) |
| Mobile-specific layout | n/a | ✅ tabs | ✅ full-width wizard |

### 6.2 Engineering quality (1 = weak, 5 = strong)

| Dimension | v1 | v2 | v3 | Notes |
|---|:-:|:-:|:-:|---|
| Simplicity | 5 | 3 | 1 | |
| Separation of concerns | 3 | **5** | 3 | v3's domain layer is a 5, its state layer a 2 |
| Testability | 3 | **5** | 3 | v3's provider is hard to unit-test (timers, globals) |
| Error handling | 1 | 4 | 4 | |
| Security posture | 4 | 3 | 3 | v2: supply-chain flag. v3: bearer links, weak KDF settings |
| Performance at scale | 4 | 3 | 3 | v2: estimate recompute. v3: context churn, root bundle |
| Extensibility | 1 | **5** | 4 | |
| Production-readiness as-is | 4 | **4** | 2 | v3 needs a backend to deliver on its promises |

---

## 7. Issues found, by severity

| ID | Sev. | Version | Issue | Where | Suggested fix |
|---|---|---|---|---|---|
| H-1 | **High** | v3 | `/share` viewer only checks `v === 1` and `Array.isArray(rows)`. A crafted link with an unknown category **crashes the viewer page** on render (`totalsByCategory` dereferences `map.get(category)!`). A non-numeric amount gives `NaN` totals and makes the recipient's CSV download throw (`amount.toFixed`). It's a crash only (React escapes text, so no XSS), but it's unhandled on an untrusted-input route | `lib/cloud/share.ts:111`, `lib/analytics.ts:42` | Validate each row with a schema (category ∈ `CATEGORIES`, finite amount, ISO date, bounded strings); add an error boundary on `/share` |
| H-2 | **High** | v3 | No cross-tab coordination: two open tabs **both run due schedules** (duplicate deliveries) and **overwrite each other's cloud state** (`useCloud` has no `storage` listener, unlike `ExpensesProvider`) | `hooks/useCloud.tsx` | Leader election via `BroadcastChannel` / Web Locks API for the scheduler; a `storage` listener to merge state |
| M-1 | Medium | v2 | jsPDF 2.5.2 brings vulnerable DOMPurify (audit 2 → 5). Not reachable (no `html()` calls), but it ships and fails audits | `package.json` | Upgrade to jsPDF 4.x + jspdf-autotable 5.x, or generate PDFs server-side |
| M-2 | Medium | v3 | Share-link KDF weaker than current guidance (PBKDF2 150k, 6-char minimum) while ciphertext is publicly exposed in URLs | `lib/cloud/share.ts:25` | ≥600k iterations (bump the token version), ≥10-char minimum or a strength meter, consider Argon2id |
| M-3 | Medium | v3 | `CloudProvider` value changes every 280 ms during jobs, re-rendering all consumers | `hooks/useCloud.tsx:430` | Split contexts, or use a selector-based store |
| M-4 | Medium | v2 | File-size estimate memo never hits (`options` is a fresh object each render), so the full dataset is re-serialised on every render and keystroke | `useExportForm.ts:129`, `ExportDrawer.tsx:39` | `useMemo` the `options` object; narrow `rows` deps |
| M-5 | Medium | v2 | Expenses-page seeding drops the search filter: the export can include more than the user was looking at | `app/expenses/page.tsx:41` | Add `search` to `ExportOptions` / `selectRows` |
| L-1 | Low | v1 | No `try/catch` and no feedback on the dashboard export (master's own Expenses-page export has both) | `app/page.tsx:36` | Wrap it and toast |
| L-2 | Low | v1 | Changing the shared serialiser's column order silently changes another feature's output | `lib/csv.ts` | Pin with a unit test; pass columns explicitly |
| L-3 | Low | v2 | PDF can't render non-Latin-1 text (WinAnsi fonts) | `lib/export/formats/pdf.ts` | Embed a Unicode TTF subset |
| L-4 | Low | v2 | Focus trap / scroll lock duplicated from `Modal` | `ExportDrawer.tsx` | Extract `useDialogA11y()` |
| L-5 | Low | v3 | `shares` list unbounded in `localStorage` and stores full URLs | `hooks/useCloud.tsx:402` | Cap it, or store the token only for N recent links |
| L-6 | Low | v3 | Export system mounted in the root layout: +20 kB on every route | `app/providers.tsx` | Lazy-mount the wizard and tray on first use |
| L-7 | Low | v2, v3 | Windows reserved filenames (`CON`, `NUL`…) not rejected | `sanitizeFilename` | Add a reserved-name check |
| L-8 | Low | all | No committed automated tests (logic and E2E checks were run during development but kept outside the repo) | — | Commit a Vitest suite for `lib/export` and `lib/cloud`, plus Playwright flows |

---

## 8. Recommendation: what to adopt and how to combine

**Adopt v2's architecture as the foundation.** It has the best separation of concerns, a typed format plug-in contract, pure and testable selection logic, and a complete lifecycle UI. All of it is real and works offline.

**Then layer on:**

1. **From v1: a one-click "Quick export (CSV)"** that calls `EXPORTERS.csv.build()` with default options. Its value is the zero-friction path, not its code. Keep the drawer for everything else (e.g. a split button: *Export CSV ▾ → More options…*).
2. **From v3, the parts that genuinely work:**
   - **Copy as table (TSV):** a tiny, high-value "Sheets integration" with no OAuth. Add it as an `Exporter`-like destination.
   - **Serverless share links:** bring over `share.ts` and the `/share` viewer **after fixing H-1 and M-2**, with the honest UI copy about bearer links and advisory expiry.
   - **Report templates** (Tax Report, Monthly Summary, Category Analysis) re-expressed as **presets** of v2's `ExportOptions` plus a `layout` field. That unifies v2's "options" and v3's "templates" into one model instead of two parallel engines (`lib/export` vs. `lib/cloud/templates`).
   - **Insights headlines:** cheap, and they make PDF covers, emails and shared reports more useful.
   - **Export history:** only if users ask for it. It's simple once the state layer is split.
3. **Defer v3's simulated integrations, scheduling and email** until there's a backend (OAuth token custody, server-side job runner, email provider). Shipping simulations to real users would mislead them. Keep the UI designs as a product reference.
4. **Resolve before shipping anything:** M-1 (jsPDF upgrade or a server-side PDF), M-4 and M-5 (v2 bugs), L-8 (commit tests). Separately, `master` itself carries the Next.js 14 audit findings (critical/high), which apply to every branch.

**Suggested target layout:**

```
src/lib/export/
  types.ts            ExportOptions (+ search, + layout), Exporter, ExportContext
  prepare.ts          selectRows · summarize · sanitizeFilename (from v2)
  presets.ts          Tax / Monthly / Category templates as option presets (from v3)
  insights.ts         (from v3)
  formats/csv.ts json.ts pdf.ts tsv.ts
  share/codec.ts      (from v3, hardened)
src/components/export/
  ExportDrawer…       (from v2) + "Share link" and "Copy" actions
  QuickExportButton   (from v1 idea)
src/app/share/page.tsx (from v3, with schema validation + error boundary)
```

---

## 9. Method

- Checked out each branch in turn (`git checkout feature-data-export-v{1,2,3}`) and diffed it against `master` (`git diff --stat master`, excluding `package-lock.json`) to list changed files and line counts.
- Read every added or modified source file. Specific findings were confirmed by grepping the exact lines on each branch (`git show <branch>:<path> | grep -n …`); line numbers in §7 refer to those branches.
- Counted hooks, timers, `try` blocks and exported components across each branch's added or modified `.ts`/`.tsx` files. Counts include pre-existing code in modified files, so treat them as rough indicators.
- Dependency risk: `npm audit --package-lock-only --omit=dev` on each branch's lockfile.
- Bundle sizes: from `next build` output recorded when each branch was built (production build, First Load JS).
- Runtime behaviour referenced here (PDF character encoding, share-link sizes, the end-to-end flows on v3) comes from verification runs done while the branches were built. Those scripts weren't committed (see L-8).
