"use client";

import { AlertTriangle, CalendarClock } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { useCloud } from "@/hooks/useCloud";
import { useToast } from "@/hooks/useToast";
import { PERIODS, type PeriodId } from "@/lib/cloud/period";
import { computeNextRun, describeSchedule, WEEKDAY_NAMES, type Frequency, type Schedule } from "@/lib/cloud/schedule";
import { SERVICES, type DestinationId } from "@/lib/cloud/services";
import { TEMPLATES, type TemplateId } from "@/lib/cloud/templates";
import { ConnectPanel } from "./ConnectPanel";
import { ServiceIcon } from "./ServiceIcon";

export type ScheduleDraft = Partial<Omit<Schedule, "createdAt" | "lastRunAt" | "nextRunAt">>;

const SCHEDULABLE = (Object.keys(SERVICES) as DestinationId[]).filter((id) => SERVICES[id].schedulable);

const TARGET_LABEL: Partial<Record<DestinationId, { label: string; placeholder: string; fallback: string }>> = {
  email: { label: "Recipients", placeholder: "me@example.com, accountant@example.com", fallback: "" },
  gsheets: { label: "Spreadsheet", placeholder: "Spendwise · Backups", fallback: "Spendwise · Backups" },
  slack: { label: "Channel", placeholder: "#finance", fallback: "#finance" },
  gdrive: { label: "Folder", placeholder: "/Apps/Spendwise/Backups", fallback: "/Apps/Spendwise/Backups" },
  dropbox: { label: "Folder", placeholder: "/Apps/Spendwise/Backups", fallback: "/Apps/Spendwise/Backups" },
  onedrive: { label: "Folder", placeholder: "/Apps/Spendwise/Backups", fallback: "/Apps/Spendwise/Backups" },
};

export function ScheduleDialog({ draft, onClose }: { draft: ScheduleDraft; onClose: () => void }) {
  const { saveSchedule, connections } = useCloud();
  const { toast } = useToast();
  const [name, setName] = useState(draft.name ?? "Weekly full backup");
  const [templateId, setTemplateId] = useState<TemplateId>(draft.templateId ?? "full-backup");
  const [periodId, setPeriodId] = useState<PeriodId>(draft.periodId ?? "all");
  const [destination, setDestination] = useState<DestinationId>(draft.destination ?? "dropbox");
  const [target, setTarget] = useState(draft.target ?? TARGET_LABEL[draft.destination ?? "dropbox"]!.fallback);
  const [frequency, setFrequency] = useState<Frequency>(draft.frequency ?? "weekly");
  const [weekday, setWeekday] = useState(draft.weekday ?? 1);
  const [monthDay, setMonthDay] = useState(draft.monthDay ?? 1);
  const [time, setTime] = useState(draft.time ?? "09:00");
  const [connecting, setConnecting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const service = SERVICES[destination];
  const needsConnection = service.requiresConnection && !connections[destination];
  const meta = TARGET_LABEL[destination]!;
  const emailsOk = destination !== "email" || target.split(/[\s,;]+/).filter(Boolean).every((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
  const errors = {
    name: !name.trim() ? "Give this schedule a name." : null,
    target: !target.trim() ? `${meta.label} is required.` : !emailsOk ? "Check the email addresses." : null,
    connection: needsConnection ? `Connect ${service.name} to use it as a destination.` : null,
  };

  const upcoming = useMemo(() => {
    const out: Date[] = [];
    let from = new Date();
    for (let i = 0; i < 3; i++) {
      const d = computeNextRun({ frequency, weekday, monthDay, time }, from);
      out.push(d);
      from = d;
    }
    return out;
  }, [frequency, weekday, monthDay, time]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    saveSchedule({ id: draft.id, name: name.trim(), templateId, periodId, destination, target: target.trim(), frequency, weekday, monthDay, time, enabled: draft.enabled ?? true });
    toast(draft.id ? "Schedule updated" : `Scheduled · ${describeSchedule({ frequency, weekday, monthDay, time })}`);
    onClose();
  };

  const field = "block w-full rounded-lg border-0 px-3 py-2 text-sm shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-500";

  return (
    <Modal title={draft.id ? "Edit schedule" : "New scheduled export"} description="Recurring exports run automatically in the background." onClose={onClose} size="lg">
      {connecting ? (
        <ConnectPanel id={destination} onDone={() => setConnecting(false)} onCancel={() => setConnecting(false)} />
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5">
          <div>
            <label htmlFor="sch-name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input id="sch-name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
            {submitted && errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sch-template" className="mb-1.5 block text-sm font-medium text-slate-700">
                Template
              </label>
              <select
                id="sch-template"
                value={templateId}
                onChange={(e) => {
                  const t = TEMPLATES.find((x) => x.id === e.target.value)!;
                  setTemplateId(t.id);
                  setPeriodId(t.defaultPeriod);
                }}
                className={`${field} pr-8`}
              >
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.format.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sch-period" className="mb-1.5 block text-sm font-medium text-slate-700">
                Data period <span className="font-normal text-slate-400">(relative to each run)</span>
              </label>
              <select id="sch-period" value={periodId} onChange={(e) => setPeriodId(e.target.value as PeriodId)} className={`${field} pr-8`}>
                {PERIODS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-slate-700">Destination</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {SCHEDULABLE.map((id) => (
                <label
                  key={id}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl p-2 text-center ring-1 ring-inset focus-within:ring-2 focus-within:ring-brand-500 ${
                    destination === id ? "bg-brand-50 ring-2 ring-brand-500" : "ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="sch-dest"
                    className="sr-only"
                    checked={destination === id}
                    onChange={() => {
                      setDestination(id);
                      setTarget(TARGET_LABEL[id]!.fallback);
                    }}
                  />
                  <ServiceIcon id={id} size="sm" />
                  <span className="text-[11px] font-medium leading-tight text-slate-700">{SERVICES[id].name}</span>
                </label>
              ))}
            </div>
            {needsConnection && (
              <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-600/20">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> {service.name} isn&apos;t connected yet.
                </span>
                <button type="button" onClick={() => setConnecting(true)} className="font-semibold text-amber-900 hover:underline">
                  Connect now
                </button>
              </div>
            )}
          </fieldset>

          <div>
            <label htmlFor="sch-target" className="mb-1.5 block text-sm font-medium text-slate-700">
              {meta.label}
            </label>
            <input id="sch-target" value={target} placeholder={meta.placeholder} onChange={(e) => setTarget(e.target.value)} className={field} />
            {submitted && errors.target && <p className="mt-1 text-xs text-red-600">{errors.target}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-slate-700">Repeat</legend>
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
                {(["daily", "weekly", "monthly"] as const).map((f) => (
                  <label key={f} className={`cursor-pointer rounded-md py-1.5 text-center text-xs font-medium capitalize focus-within:ring-2 focus-within:ring-brand-500 ${frequency === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
                    <input type="radio" name="sch-freq" className="sr-only" checked={frequency === f} onChange={() => setFrequency(f)} />
                    {f}
                  </label>
                ))}
              </div>
            </fieldset>
            {frequency === "weekly" ? (
              <div>
                <label htmlFor="sch-weekday" className="mb-1.5 block text-sm font-medium text-slate-700">
                  On
                </label>
                <select id="sch-weekday" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className={`${field} pr-8`}>
                  {WEEKDAY_NAMES.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            ) : frequency === "monthly" ? (
              <div>
                <label htmlFor="sch-monthday" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Day of month
                </label>
                <select id="sch-monthday" value={monthDay} onChange={(e) => setMonthDay(Number(e.target.value))} className={`${field} pr-8`}>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div />
            )}
            <div>
              <label htmlFor="sch-time" className="mb-1.5 block text-sm font-medium text-slate-700">
                At
              </label>
              <input id="sch-time" type="time" value={time} onChange={(e) => e.target.value && setTime(e.target.value)} className={field} />
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
            <p className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
              <CalendarClock className="h-4 w-4 text-brand-600" aria-hidden />
              {describeSchedule({ frequency, weekday, monthDay, time })}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Next runs:{" "}
              {upcoming.map((d) => d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })).join(" · ")}
            </p>
            <p className="mt-1 text-xs text-slate-400">Runs while Spendwise is open in a tab; anything missed catches up the next time you open it.</p>
          </div>

          {submitted && errors.connection && (
            <p className="text-sm text-red-600" role="alert">
              {errors.connection}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {draft.id ? "Save changes" : "Create schedule"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
