"use client";

import { Clock, Download, Eye, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { CategoryBreakdown } from "@/components/charts/CategoryBreakdown";
import { CategoryIcon } from "@/components/CategoryBadge";
import { Skeleton } from "@/components/States";
import { sum, totalsByCategory } from "@/lib/analytics";
import { decodeSnapshot, isEncrypted, ShareLinkError, type SharedSnapshot } from "@/lib/cloud/share";
import { tableToCSV } from "@/lib/cloud/templates";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Expense } from "@/lib/types";

type State =
  | { kind: "loading" }
  | { kind: "password"; token: string; error?: string; busy?: boolean }
  | { kind: "error"; title: string; message: string }
  | { kind: "ready"; snap: SharedSnapshot };

export default function SharedReportPage() {
  const [state, setState] = useState<State>({ kind: "loading" });

  const open = useCallback(async (token: string, password?: string) => {
    try {
      const snap = await decodeSnapshot(token, password);
      if (snap.expiresAt && new Date(snap.expiresAt).getTime() < Date.now()) {
        setState({ kind: "error", title: "This link has expired", message: `It expired on ${new Date(snap.expiresAt).toLocaleString()}. Ask the sender for a new one.` });
        return;
      }
      setState({ kind: "ready", snap });
    } catch (err) {
      if (err instanceof ShareLinkError && err.code === "password") {
        setState({ kind: "password", token, error: password ? err.message : undefined });
      } else {
        setState({ kind: "error", title: "This link can't be opened", message: err instanceof Error ? err.message : "Unknown error." });
      }
    }
  }, []);

  useEffect(() => {
    const load = () => {
      const token = window.location.hash.slice(1);
      if (!token) {
        setState({ kind: "error", title: "No report in this link", message: "Shared links look like /share#v1… — make sure you copied the whole link." });
        return;
      }
      if (isEncrypted(token)) setState({ kind: "password", token });
      else void open(token);
    };
    load();
    window.addEventListener("hashchange", load);
    return () => window.removeEventListener("hashchange", load);
  }, [open]);

  if (state.kind === "loading")
    return (
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-64" />
      </div>
    );

  if (state.kind === "password") return <PasswordGate state={state} onSubmit={(pw) => { setState({ ...state, busy: true }); void open(state.token, pw); }} />;

  if (state.kind === "error")
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-amber-500" aria-hidden />
        <h1 className="text-lg font-semibold text-slate-900">{state.title}</h1>
        <p className="mt-1 text-sm text-slate-500">{state.message}</p>
        <Link href="/" className="btn-secondary mt-6">
          Go to Spendwise
        </Link>
      </div>
    );

  return <Report snap={state.snap} />;
}

function PasswordGate({ state, onSubmit }: { state: Extract<State, { kind: "password" }>; onSubmit: (pw: string) => void }) {
  const [pw, setPw] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (pw) onSubmit(pw);
  };
  return (
    <form onSubmit={submit} className="card mx-auto max-w-sm p-8 text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Lock className="h-6 w-6" aria-hidden />
      </span>
      <h1 className="text-lg font-semibold text-slate-900">This report is protected</h1>
      <p className="mt-1 text-sm text-slate-500">Enter the password the sender gave you. It&apos;s decrypted on your device.</p>
      <label htmlFor="share-password" className="sr-only">
        Password
      </label>
      <input
        id="share-password"
        type="password"
        autoFocus
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        aria-invalid={!!state.error}
        className={`mt-5 block w-full rounded-lg border-0 px-3 py-2.5 text-center text-sm shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-brand-500 ${state.error ? "ring-red-300" : "ring-slate-300"}`}
      />
      {state.error && (
        <p className="mt-1.5 text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={!pw || state.busy} className="btn-primary mt-4 w-full">
        {state.busy ? "Decrypting…" : "Unlock report"}
      </button>
    </form>
  );
}

function Report({ snap }: { snap: SharedSnapshot }) {
  const expenses: Expense[] = useMemo(
    () => snap.rows.map(([date, category, amount, description], i) => ({ id: String(i), date, category, amount, description: description || "—", createdAt: "", updatedAt: "" })),
    [snap],
  );
  const total = sum(expenses);
  const top = totalsByCategory(expenses).sort((a, b) => b.total - a.total)[0];
  const money = (n: number) => formatCurrency(n, snap.currency);

  const downloadCSV = () => {
    const table = [["Date", "Category", "Amount", "Description"], ...snap.rows.map(([d, c, a, desc]) => [d, c, a.toFixed(2), desc])];
    const url = URL.createObjectURL(new Blob(["﻿" + tableToCSV(table)], { type: "text/csv;charset=utf-8" }));
    Object.assign(document.createElement("a"), { href: url, download: `${snap.title.replace(/[^\w-]+/g, "-").toLowerCase()}.csv` }).click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-brand-50 px-4 py-2.5 text-xs text-brand-900 ring-1 ring-inset ring-brand-600/15">
        <Eye className="h-3.5 w-3.5" aria-hidden />
        <span className="font-semibold">Shared report · read-only</span>
        <span className="text-brand-700">· Shared {formatDate(snap.createdAt.slice(0, 10))}</span>
        {snap.expiresAt && (
          <span className="inline-flex items-center gap-1 text-brand-700">
            · <Clock className="h-3 w-3" aria-hidden /> Expires {new Date(snap.expiresAt).toLocaleDateString()}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1 text-brand-700">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Decoded on your device — no server involved
        </span>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{snap.title}</h1>
          {!snap.title.includes(snap.periodLabel) && <p className="mt-1 text-sm text-slate-500">{snap.periodLabel}</p>}
          {snap.note && <p className="mt-3 max-w-2xl rounded-xl bg-white px-4 py-3 text-sm italic text-slate-700 ring-1 ring-slate-200">“{snap.note}”</p>}
        </div>
        <button onClick={downloadCSV} className="btn-secondary">
          <Download className="h-4 w-4" aria-hidden /> Download CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ["Total spent", money(total)],
          ["Expenses", String(expenses.length)],
          ["Average", money(expenses.length ? total / expenses.length : 0)],
          ["Top category", top && top.total > 0 ? top.category : "—"],
        ].map(([l, v]) => (
          <div key={l} className="card p-4">
            <p className="text-xs font-medium text-slate-500">{l}</p>
            <p className="mt-1 truncate text-xl font-semibold text-slate-900">{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <CategoryBreakdown expenses={expenses} currency={snap.currency} />
        </div>
        <section className="card overflow-hidden lg:col-span-3" aria-labelledby="tx-title">
          <h2 id="tx-title" className="border-b border-slate-100 px-5 py-4 text-base font-semibold text-slate-900">
            Transactions
          </h2>
          {expenses.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500">No expenses in this period.</p>
          ) : (
            <ul className="max-h-[480px] divide-y divide-slate-100 overflow-y-auto">
              {expenses.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-5 py-2.5">
                  <CategoryIcon category={e.category} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{e.description}</p>
                    <p className="text-xs text-slate-500">
                      {formatDate(e.date)} · {e.category}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-slate-900">{money(e.amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="text-center text-xs text-slate-400">
        Made with{" "}
        <Link href="/" className="font-medium text-brand-600 hover:underline">
          Spendwise
        </Link>{" "}
        — track your own spending for free.
      </p>
    </div>
  );
}
