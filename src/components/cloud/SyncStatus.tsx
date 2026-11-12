"use client";

import { Cloud, CloudOff, HardDrive, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCloud } from "@/hooks/useCloud";
import { relativeTime } from "@/lib/cloud/schedule";

/** Compact navbar indicator: local-only / syncing / synced Xm ago / offline. */
export function SyncStatus() {
  const { connections, syncing, online, jobs, ready } = useCloud();
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  if (!ready) return null;
  const conns = Object.values(connections);
  const active = jobs.filter((j) => j.status === "running" || j.status === "waiting").length;
  const last = conns.map((c) => c!.lastSyncAt).filter(Boolean).sort().pop();

  let icon = <HardDrive className="h-3.5 w-3.5" aria-hidden />;
  let label = "Local only";
  let tone = "text-slate-500 ring-slate-200";
  if (!online) {
    icon = <CloudOff className="h-3.5 w-3.5" aria-hidden />;
    label = "Offline · changes queued";
    tone = "text-amber-700 ring-amber-200 bg-amber-50";
  } else if (syncing || active > 0) {
    icon = <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />;
    label = active > 0 ? `${active} export${active === 1 ? "" : "s"} running` : "Syncing…";
    tone = "text-brand-700 ring-brand-200 bg-brand-50";
  } else if (conns.length > 0) {
    icon = (
      <span className="relative">
        <Cloud className="h-3.5 w-3.5" aria-hidden />
        <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-white" />
      </span>
    );
    label = last ? `Synced ${relativeTime(last)}` : `${conns.length} connected`;
    tone = "text-slate-600 ring-slate-200";
  }

  return (
    <Link
      href="/exports?tab=integrations"
      className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition hover:bg-slate-50 lg:inline-flex ${tone}`}
      title="Cloud & sync status"
      aria-live="polite"
    >
      {icon}
      {label}
    </Link>
  );
}
