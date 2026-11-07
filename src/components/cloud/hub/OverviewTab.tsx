"use client";

import { ArrowRight, CalendarClock, Info, Link2, Plug, Plus, Send } from "lucide-react";
import { useCloud } from "@/hooks/useCloud";
import { useExportFlow } from "@/hooks/useExportFlow";
import { SERVICES, type DestinationId } from "@/lib/cloud/services";
import { TEMPLATES } from "@/lib/cloud/templates";
import { ServiceIcon } from "../ServiceIcon";
import { HistoryList } from "./ActivityTabs";

const QUICK: DestinationId[] = ["download", "clipboard", "share", "email", "gsheets", "gdrive", "dropbox", "onedrive", "slack"];

export function OverviewTab({ goTo }: { goTo: (tab: string) => void }) {
  const { openFlow } = useExportFlow();
  const { history, connections, schedules, shares } = useCloud();
  const now = Date.now();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const stats = [
    { label: "Exports this month", value: history.filter((h) => new Date(h.createdAt).getTime() >= monthStart).length, icon: Send, tab: "history" },
    { label: "Connected apps", value: Object.keys(connections).length, icon: Plug, tab: "integrations" },
    { label: "Active schedules", value: schedules.filter((s) => s.enabled).length, icon: CalendarClock, tab: "schedules" },
    { label: "Live share links", value: shares.filter((s) => !s.expiresAt || new Date(s.expiresAt).getTime() > now).length, icon: Link2, tab: "shared" },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-brand-900 p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-200">Share & Export</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Your spending data, wherever you need it.</h2>
            <p className="mt-2 text-sm text-slate-300">Send reports to your accountant, sync to spreadsheets, back up to the cloud on a schedule, or share a private link.</p>
          </div>
          <button onClick={() => openFlow()} className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-brand-50 active:scale-[0.98] lg:self-auto">
            <Plus className="h-4 w-4" aria-hidden /> New export
          </button>
        </div>
        <dl className="relative mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon, tab }) => (
            <button key={label} onClick={() => goTo(tab)} className="rounded-2xl bg-white/5 p-4 text-left ring-1 ring-white/10 transition hover:bg-white/10">
              <dt className="flex items-center gap-1.5 text-xs text-slate-300">
                <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
            </button>
          ))}
        </dl>
      </section>

      <div className="flex gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-600/20">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>
          <span className="font-semibold">Demo mode:</span> third-party integrations (Google, Dropbox, OneDrive, Slack) and email sending are simulated — nothing
          leaves your browser. <span className="font-medium">Downloads, copy-as-table, email drafts and share links are fully functional.</span>
        </p>
      </div>

      {/* Templates */}
      <section aria-labelledby="tpl-title">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 id="tpl-title" className="text-base font-semibold text-slate-900">
              Start from a template
            </h2>
            <p className="text-sm text-slate-500">Purpose-built reports for the people you share with.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TEMPLATES.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => openFlow({ templateId: t.id })} className="card group flex flex-col p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg">
                <span className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${t.accent}`} aria-hidden>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="flex items-center gap-2 font-semibold text-slate-900">
                  {t.name}
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">{t.format}</span>
                </span>
                <span className="text-xs font-medium text-brand-700">{t.audience}</span>
                <ul className="mt-3 flex-1 space-y-1 text-xs text-slate-500">
                  {t.includes.map((i) => (
                    <li key={i} className="flex gap-1.5">
                      <span className="text-slate-300" aria-hidden>
                        •
                      </span>
                      {i}
                    </li>
                  ))}
                </ul>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600">
                  Use template <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden />
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Quick destinations */}
      <section aria-labelledby="dest-title">
        <h2 id="dest-title" className="mb-3 text-base font-semibold text-slate-900">
          Send to…
        </h2>
        <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
          {QUICK.map((id) => (
            <button
              key={id}
              onClick={() => openFlow({ destination: id })}
              className="flex w-24 shrink-0 flex-col items-center gap-2 rounded-2xl bg-white p-3 text-center ring-1 ring-slate-200 transition hover:ring-slate-300 hover:shadow-sm"
            >
              <span className="relative">
                <ServiceIcon id={id} />
                {connections[id] && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" aria-label="Connected" />}
              </span>
              <span className="text-xs font-medium leading-tight text-slate-700">{SERVICES[id].name}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Recent */}
      <section className="card overflow-hidden" aria-labelledby="recent-exports">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="recent-exports" className="text-base font-semibold text-slate-900">
            Recent activity
          </h2>
          {history.length > 5 && (
            <button onClick={() => goTo("history")} className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
              View all <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
        <HistoryList entries={history.slice(0, 5)} />
      </section>
    </div>
  );
}
