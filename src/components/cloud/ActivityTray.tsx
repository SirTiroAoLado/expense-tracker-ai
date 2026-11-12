"use client";

import { AlertCircle, CheckCircle2, ChevronDown, CloudOff, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useCloud, type Job } from "@/hooks/useCloud";
import { formatBytes } from "@/lib/cloud/templates";
import { ServiceIcon } from "./ServiceIcon";

/** Drive-style background activity panel (bottom-right). */
export function ActivityTray() {
  const { jobs, dismissJob, clearFinishedJobs } = useCloud();
  const [collapsed, setCollapsed] = useState(false);
  const active = jobs.filter((j) => j.status === "running" || j.status === "waiting");

  // Re-expand whenever a new job starts.
  const newest = jobs[0]?.id;
  useEffect(() => {
    if (newest) setCollapsed(false);
  }, [newest]);

  if (jobs.length === 0) return null;

  return (
    <div
      className="fixed bottom-20 right-4 z-40 w-[calc(100%-2rem)] max-w-sm animate-slide-up overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 md:bottom-4 md:left-4 md:right-auto"
      role="region"
      aria-label="Export activity"
    >
      <div className="flex items-center justify-between bg-slate-900 px-4 py-2.5 text-white">
        <p className="text-sm font-medium" aria-live="polite">
          {active.length > 0 ? `${active.length} export${active.length === 1 ? "" : "s"} in progress` : `${jobs.length} export${jobs.length === 1 ? "" : "s"} complete`}
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => setCollapsed((c) => !c)} className="rounded p-1 hover:bg-white/10" aria-label={collapsed ? "Expand" : "Collapse"}>
            <ChevronDown className={`h-4 w-4 transition ${collapsed ? "rotate-180" : ""}`} />
          </button>
          {active.length === 0 && (
            <button onClick={clearFinishedJobs} className="rounded p-1 hover:bg-white/10" aria-label="Close activity panel">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {!collapsed && (
        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
          {jobs.map((j) => (
            <JobRow key={j.id} job={j} onDismiss={() => dismissJob(j.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

function JobRow({ job, onDismiss }: { job: Job; onDismiss: () => void }) {
  const running = job.status === "running";
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <ServiceIcon id={job.destination} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{job.title}</p>
        <p className="flex items-center gap-1 truncate text-xs text-slate-500">
          {job.status === "waiting" && <CloudOff className="h-3 w-3 text-amber-600" aria-hidden />}
          {job.step}
          {job.status === "done" && ` · ${job.artifact.records} rows · ${formatBytes(job.artifact.bytes)}`}
          {job.trigger === "scheduled" && " · scheduled"}
        </p>
        {(running || job.status === "waiting") && (
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${job.status === "waiting" ? "bg-amber-400" : "bg-brand-500"}`}
              style={{ width: `${job.progress}%` }}
            />
          </div>
        )}
      </div>
      {running && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-600" aria-label="In progress" />}
      {job.status === "done" && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="Done" />}
      {job.status === "failed" && <AlertCircle className="h-5 w-5 shrink-0 text-red-600" aria-label="Failed" />}
      {!running && job.status !== "waiting" && (
        <button onClick={onDismiss} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Dismiss">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </li>
  );
}
