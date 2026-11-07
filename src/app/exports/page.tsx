"use client";

import { CalendarClock, History, LayoutGrid, Link2, Plug } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { HistoryTab, SchedulesTab, SharedTab } from "@/components/cloud/hub/ActivityTabs";
import { IntegrationsTab } from "@/components/cloud/hub/IntegrationsTab";
import { OverviewTab } from "@/components/cloud/hub/OverviewTab";
import { PageSkeleton } from "@/components/States";
import { useCloud } from "@/hooks/useCloud";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "integrations", label: "Integrations", icon: Plug },
  { id: "schedules", label: "Schedules", icon: CalendarClock },
  { id: "history", label: "History", icon: History },
  { id: "shared", label: "Shared links", icon: Link2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

function ExportsHub() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { ready, schedules, shares, connections } = useCloud();
  const raw = params.get("tab");
  const tab: TabId = TABS.some((t) => t.id === raw) ? (raw as TabId) : "overview";
  const goTo = (t: string) => router.replace(t === "overview" ? pathname : `${pathname}?tab=${t}`, { scroll: false });

  const counts: Partial<Record<TabId, number>> = {
    integrations: Object.keys(connections).length,
    schedules: schedules.length,
    shared: shares.length,
  };

  if (!ready) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Share & Export</h1>
        <p className="mt-1 text-sm text-slate-500">Reports, integrations, backups and sharing — all in one place.</p>
      </div>

      <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div role="tablist" aria-label="Share & Export sections" className="inline-flex min-w-full gap-1 border-b border-slate-200 sm:min-w-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => goTo(id)}
              className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                tab === id ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
              {!!counts[id] && <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600">{counts[id]}</span>}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel">
        {tab === "overview" && <OverviewTab goTo={goTo} />}
        {tab === "integrations" && <IntegrationsTab />}
        {tab === "schedules" && <SchedulesTab />}
        {tab === "history" && <HistoryTab />}
        {tab === "shared" && <SharedTab />}
      </div>
    </div>
  );
}

export default function ExportsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ExportsHub />
    </Suspense>
  );
}
