"use client";

import { AlertCircle, CalendarClock, Check, Copy, ExternalLink, History, Link2, Lock, Pencil, Play, QrCode, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { useCloud, type HistoryEntry, type ShareRecord } from "@/hooks/useCloud";
import { useToast } from "@/hooks/useToast";
import { describeSchedule, relativeTime } from "@/lib/cloud/schedule";
import { SERVICES } from "@/lib/cloud/services";
import { QR_MAX_URL_LENGTH } from "@/lib/cloud/share";
import { formatBytes, getTemplate } from "@/lib/cloud/templates";
import { ScheduleDialog, type ScheduleDraft } from "../ScheduleDialog";
import { ServiceIcon } from "../ServiceIcon";
import { Switch } from "./IntegrationsTab";

function Empty({ icon: Icon, title, children }: { icon: typeof History; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <div className="mt-1 max-w-sm text-sm text-slate-500">{children}</div>
    </div>
  );
}

/* ---------------- History ---------------- */

export function HistoryList({ entries }: { entries: HistoryEntry[] }) {
  const { startJob } = useCloud();
  const { toast } = useToast();
  if (!entries.length)
    return (
      <Empty icon={History} title="No exports yet">
        Every download, upload, email and share link you create will be logged here.
      </Empty>
    );

  const rerun = async (h: HistoryEntry) => {
    if (h.destination === "share" && h.shareUrl) {
      window.open(h.shareUrl, "_blank", "noopener");
      return;
    }
    await startJob({ templateId: h.templateId, periodId: h.periodId, destination: h.destination, target: h.target });
    toast(h.destination === "download" ? "Downloaded again with current data" : "Export re-run started", { kind: "info" });
  };

  return (
    <ul className="divide-y divide-slate-100">
      {entries.map((h) => (
        <li key={h.id} className="flex items-center gap-3 px-5 py-3">
          <ServiceIcon id={h.destination} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium text-slate-900">
              {h.templateName}
              <span className="font-normal text-slate-400">→</span>
              <span className="font-normal text-slate-600">{SERVICES[h.destination].name}</span>
              {h.trigger === "scheduled" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                  <CalendarClock className="h-3 w-3" aria-hidden /> Scheduled
                </span>
              )}
              {h.status === "failed" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                  <AlertCircle className="h-3 w-3" aria-hidden /> Failed
                </span>
              )}
            </p>
            <p className="truncate text-xs text-slate-500" title={h.target}>
              {h.periodLabel} · {h.records} records{h.destination !== "share" ? ` · ${formatBytes(h.bytes)}` : ""}
              {h.target ? ` · ${h.target}` : ""}
            </p>
          </div>
          <time dateTime={h.createdAt} title={new Date(h.createdAt).toLocaleString()} className="hidden shrink-0 text-xs text-slate-400 sm:block">
            {relativeTime(h.createdAt)}
          </time>
          <button
            onClick={() => void rerun(h)}
            className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            title={h.destination === "share" ? "Open link" : "Run again with current data"}
            aria-label={h.destination === "share" ? "Open shared link" : `Re-run ${h.templateName} export`}
          >
            {h.destination === "share" ? <ExternalLink className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function HistoryTab() {
  const { history, clearHistory } = useCloud();
  const [filter, setFilter] = useState<"all" | "manual" | "scheduled">("all");
  const shown = history.filter((h) => filter === "all" || h.trigger === filter);
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm" role="group" aria-label="Filter history">
          {(["all", "manual", "scheduled"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded-md px-3 py-1 font-medium capitalize ${filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
            >
              {f}
            </button>
          ))}
        </div>
        {history.length > 0 && (
          <button onClick={clearHistory} className="text-sm font-medium text-slate-500 hover:text-red-600">
            Clear history
          </button>
        )}
      </div>
      <HistoryList entries={shown} />
    </section>
  );
}

/* ---------------- Schedules ---------------- */

const SUGGESTIONS: (ScheduleDraft & { blurb: string })[] = [
  { name: "Weekly full backup", templateId: "full-backup", periodId: "all", destination: "dropbox", frequency: "weekly", weekday: 0, time: "21:00", blurb: "Every Sunday night, a JSON backup to Dropbox" },
  { name: "Monthly summary to me", templateId: "monthly-summary", periodId: "last-month", destination: "email", frequency: "monthly", monthDay: 1, time: "08:00", blurb: "1st of the month, last month's digest by email" },
  { name: "Tax CSV to Drive", templateId: "tax-report", periodId: "this-year", destination: "gdrive", frequency: "monthly", monthDay: 28, time: "18:00", blurb: "Keep a year-to-date tax file in Google Drive" },
];

export function SchedulesTab() {
  const { schedules, toggleSchedule, deleteSchedule, runScheduleNow, connections } = useCloud();
  const { toast } = useToast();
  const [draft, setDraft] = useState<ScheduleDraft | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Automatic backups</h2>
          <p className="text-sm text-slate-500">Recurring exports that run in the background. Missed runs catch up when you next open Spendwise.</p>
        </div>
        <button onClick={() => setDraft({})} className="btn-primary">
          <CalendarClock className="h-4 w-4" aria-hidden /> New schedule
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="card">
          <Empty icon={CalendarClock} title="No schedules yet">
            Set it and forget it — try one of these:
          </Empty>
          <div className="grid gap-3 px-5 pb-6 sm:grid-cols-3">
            {SUGGESTIONS.map(({ blurb, ...s }) => (
              <button key={s.name} onClick={() => setDraft(s)} className="flex items-start gap-3 rounded-xl p-3 text-left ring-1 ring-inset ring-slate-200 hover:bg-slate-50">
                <ServiceIcon id={s.destination!} size="sm" />
                <span>
                  <span className="block text-sm font-medium text-slate-900">{s.name}</span>
                  <span className="block text-xs text-slate-500">{blurb}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {schedules.map((s) => {
            const paused = !s.enabled;
            const missingConn = SERVICES[s.destination].requiresConnection && !connections[s.destination];
            return (
              <li key={s.id} className={`card p-5 ${paused ? "opacity-70" : ""}`}>
                <div className="flex items-start gap-3">
                  <ServiceIcon id={s.destination} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{s.name}</p>
                    <p className="text-sm text-slate-500">{describeSchedule(s)}</p>
                  </div>
                  <Switch
                    checked={s.enabled}
                    label={`${s.enabled ? "Pause" : "Resume"} ${s.name}`}
                    onChange={() => {
                      if (!s.enabled && missingConn) {
                        toast(`Connect ${SERVICES[s.destination].name} first`, { kind: "error" });
                        return;
                      }
                      toggleSchedule(s.id);
                    }}
                  />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <dt className="text-slate-400">Exports</dt>
                    <dd className="font-medium text-slate-700">
                      {getTemplate(s.templateId).name} · {s.periodId.replace(/-/g, " ")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">To</dt>
                    <dd className="truncate font-medium text-slate-700" title={s.target}>
                      {s.target}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Next run</dt>
                    <dd className="font-medium text-slate-700">{paused ? "Paused" : relativeTime(s.nextRunAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Last run</dt>
                    <dd className="font-medium text-slate-700">{s.lastRunAt ? relativeTime(s.lastRunAt) : "Never"}</dd>
                  </div>
                </dl>
                {missingConn && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-700">
                    <AlertCircle className="h-3.5 w-3.5" aria-hidden /> {SERVICES[s.destination].name} is disconnected — schedule paused.
                  </p>
                )}
                <div className="mt-4 flex gap-1 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => {
                      runScheduleNow(s.id);
                      toast(`Running “${s.name}” now`, { kind: "info" });
                    }}
                    disabled={missingConn}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <Play className="h-3.5 w-3.5" aria-hidden /> Run now
                  </button>
                  <button onClick={() => setDraft(s)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">
                    <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                  </button>
                  <button
                    onClick={() => {
                      deleteSchedule(s.id);
                      toast("Schedule deleted", { kind: "info" });
                    }}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden /> Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {draft && <ScheduleDialog draft={draft} onClose={() => setDraft(null)} />}
    </div>
  );
}

/* ---------------- Shared links ---------------- */

export function SharedTab() {
  const { shares, removeShare } = useCloud();
  const { toast } = useToast();
  const [qrFor, setQrFor] = useState<ShareRecord | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const now = Date.now();

  const copy = async (s: ShareRecord) => {
    try {
      await navigator.clipboard.writeText(s.url);
      setCopied(s.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      toast("Couldn't copy the link", { kind: "error" });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Shared links</h2>
        <p className="text-sm text-slate-500">
          Links carry their data inside the URL — nothing is stored on a server. Removing a link here only hides it from this list; anyone who already has it can
          open it until it expires.
        </p>
      </div>
      <section className="card overflow-hidden">
        {shares.length === 0 ? (
          <Empty icon={Link2} title="No shared links yet">
            Choose <span className="font-medium">Share link</span> as a destination to create a private, optionally password-protected link with a QR code.
          </Empty>
        ) : (
          <ul className="divide-y divide-slate-100">
            {shares.map((s) => {
              const expired = !!s.expiresAt && new Date(s.expiresAt).getTime() <= now;
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3 sm:flex-nowrap">
                  <ServiceIcon id="share" size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-900">
                      {s.protected && <Lock className="h-3.5 w-3.5 text-slate-400" aria-label="Password protected" />}
                      {s.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {s.records} records · created {relativeTime(s.createdAt)} ·{" "}
                      <span className={expired ? "font-medium text-red-600" : "font-medium text-emerald-700"}>
                        {expired ? "Expired" : s.expiresAt ? `Expires ${relativeTime(s.expiresAt)}` : "Never expires"}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <IconBtn label="Copy link" onClick={() => void copy(s)}>
                      {copied === s.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </IconBtn>
                    <IconBtn label="Show QR code" onClick={() => setQrFor(s)} disabled={s.url.length > QR_MAX_URL_LENGTH}>
                      <QrCode className="h-4 w-4" />
                    </IconBtn>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Open link" title="Open">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    <IconBtn label="Remove from list" onClick={() => removeShare(s.id)} danger>
                      <Trash2 className="h-4 w-4" />
                    </IconBtn>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {qrFor && <QrModal share={qrFor} onClose={() => setQrFor(null)} />}
    </div>
  );
}

function IconBtn({ label, onClick, children, disabled, danger }: { label: string; onClick: () => void; children: React.ReactNode; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded-lg p-2 text-slate-400 disabled:opacity-30 ${danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-slate-100 hover:text-slate-700"}`}
    >
      {children}
    </button>
  );
}

function QrModal({ share, onClose }: { share: ShareRecord; onClose: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    import("qrcode").then((QR) => QR.toDataURL(share.url, { errorCorrectionLevel: "L", margin: 1, width: 280 }).then((d) => alive && setSrc(d)));
    return () => {
      alive = false;
    };
  }, [share.url]);
  return (
    <Modal title={share.title} description="Scan with a phone camera to open the shared report." size="sm" onClose={onClose}>
      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt="QR code for the shared link" width={240} height={240} className="rounded-xl ring-1 ring-slate-200" /> : <div className="h-60 w-60 animate-pulse rounded-xl bg-slate-100" />}
      </div>
    </Modal>
  );
}
