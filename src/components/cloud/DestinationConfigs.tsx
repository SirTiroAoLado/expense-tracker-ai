"use client";

import { ClipboardCopy, Download, Folder, Hash, Paperclip, RefreshCw, Send, Sparkles, X } from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { useCloud } from "@/hooks/useCloud";
import { useToast } from "@/hooks/useToast";
import type { Insights } from "@/lib/cloud/insights";
import type { PeriodId } from "@/lib/cloud/period";
import { SERVICES, type DestinationId } from "@/lib/cloud/services";
import { formatBytes, type Artifact } from "@/lib/cloud/templates";
import { DemoBadge } from "./ServiceIcon";
import { SheetPreview } from "./SheetPreview";

export interface ConfigProps {
  destination: DestinationId;
  artifact: Artifact;
  insights: Insights;
  periodId: PeriodId;
  onBack: () => void;
  onClose: () => void;
}

const input =
  "block w-full rounded-lg border-0 px-3 py-2 text-sm shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-500";

function Footer({ onBack, children, note }: { onBack: () => void; children: ReactNode; note?: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-xs text-slate-500">{note}</div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <button onClick={onBack} className="btn-secondary">
          Back
        </button>
        {children}
      </div>
    </div>
  );
}

function FileChip({ artifact }: { artifact: Artifact }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-inset ring-slate-200">
      <Paperclip className="h-4 w-4 text-slate-400" aria-hidden />
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-700">{artifact.filename}</span>
      <span className="shrink-0 text-xs text-slate-500">
        {artifact.records} rows · {formatBytes(artifact.bytes)}
      </span>
    </div>
  );
}

/** Kick off a (simulated) background job and close the flow; progress continues in the tray. */
function useLaunch(p: ConfigProps) {
  const { startJob } = useCloud();
  const { toast } = useToast();
  return async (target: string, title?: string) => {
    const job = await startJob({ templateId: p.artifact.template.id, periodId: p.periodId, destination: p.destination, target, title });
    if (job.status === "failed") toast(job.error ?? "Export failed", { kind: "error" });
    else if (p.destination === "clipboard") toast(`Copied ${p.artifact.table.length - 1} rows — paste into any spreadsheet`);
    else if (p.destination !== "download") toast("Export started — track it in the activity panel", { kind: "info" });
    p.onClose();
  };
}

/* ---------------- Download & clipboard (real) ---------------- */

export function LocalConfig(p: ConfigProps) {
  const launch = useLaunch(p);
  const isClip = p.destination === "clipboard";
  return (
    <div className="space-y-4">
      <FileChip artifact={p.artifact} />
      {isClip && (
        <p className="text-sm text-slate-600">
          Copies the table as tab-separated text. Paste with <kbd className="rounded border px-1 text-xs">Ctrl</kbd>+
          <kbd className="rounded border px-1 text-xs">V</kbd> into Google Sheets, Excel, Numbers, Airtable or a Notion table — columns
          land in the right cells.
        </p>
      )}
      <SheetPreview table={p.artifact.table} title={isClip ? "Clipboard preview" : p.artifact.filename} tabs={[p.artifact.template.name]} maxRows={8} />
      <Footer onBack={p.onBack} note={p.artifact.records === 0 ? "No expenses in this period — the file will only contain headers." : null}>
        <button onClick={() => void launch(isClip ? "Clipboard" : "This device")} className="btn-primary">
          {isClip ? <ClipboardCopy className="h-4 w-4" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
          {isClip ? `Copy ${p.artifact.table.length - 1} rows` : `Download .${p.artifact.template.format}`}
        </button>
      </Footer>
    </div>
  );
}

/* ---------------- Email (simulated send, real mailto draft) ---------------- */

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

export function EmailConfig(p: ConfigProps) {
  const launch = useLaunch(p);
  const [recipients, setRecipients] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [subject, setSubject] = useState(`Spendwise · ${p.artifact.template.name} · ${p.artifact.periodLabel}`);
  const [message, setMessage] = useState(`Hi,\n\nHere's my ${p.artifact.template.name.toLowerCase()}.\n\n${p.insights.headlines.map((h) => `• ${h}`).join("\n")}\n\nSent from Spendwise`);
  const [error, setError] = useState<string | null>(null);

  const commit = (raw: string) => {
    const parts = raw.split(/[\s,;]+/).filter(Boolean);
    const bad = parts.filter((x) => !EMAIL_RE.test(x));
    const good = parts.filter((x) => EMAIL_RE.test(x) && !recipients.includes(x));
    if (good.length) setRecipients((r) => [...r, ...good].slice(0, 10));
    setDraft(bad.join(" "));
    setError(bad.length ? `“${bad[0]}” isn't a valid email address.` : null);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (["Enter", ",", " ", ";", "Tab"].includes(e.key) && draft.trim()) {
      if (e.key !== "Tab") e.preventDefault();
      commit(draft);
    } else if (e.key === "Backspace" && !draft && recipients.length) {
      setRecipients((r) => r.slice(0, -1));
    }
  };

  const send = () => {
    const all = draft.trim() ? [...recipients, ...draft.split(/[\s,;]+/).filter((x) => EMAIL_RE.test(x))] : recipients;
    if (!all.length) {
      setError("Add at least one recipient.");
      return;
    }
    void launch(all.join(", "), `Email to ${all.length === 1 ? all[0] : `${all.length} recipients`}`);
  };

  const mailto = `mailto:${recipients.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="email-to" className="mb-1.5 block text-sm font-medium text-slate-700">
          To
        </label>
        <div
          className={`flex flex-wrap items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 shadow-sm ring-1 ring-inset focus-within:ring-2 focus-within:ring-brand-500 ${
            error ? "ring-red-300" : "ring-slate-300"
          }`}
        >
          {recipients.map((r) => (
            <span key={r} className="inline-flex items-center gap-1 rounded-full bg-brand-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-brand-800">
              {r}
              <button onClick={() => setRecipients((x) => x.filter((y) => y !== r))} className="rounded-full p-0.5 hover:bg-brand-100" aria-label={`Remove ${r}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            id="email-to"
            data-autofocus
            type="email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            onBlur={() => draft.trim() && commit(draft)}
            placeholder={recipients.length ? "" : "accountant@example.com, partner@example.com"}
            className="min-w-[160px] flex-1 border-0 px-1 py-1 text-sm focus:ring-0"
          />
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="email-subject" className="mb-1.5 block text-sm font-medium text-slate-700">
          Subject
        </label>
        <input id="email-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={input} />
      </div>
      <div>
        <label htmlFor="email-body" className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
          Message
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
            <Sparkles className="h-3 w-3" aria-hidden /> Auto-written insights
          </span>
        </label>
        <textarea id="email-body" rows={7} value={message} onChange={(e) => setMessage(e.target.value)} className={`${input} font-[inherit]`} />
      </div>
      <FileChip artifact={p.artifact} />
      <Footer
        onBack={p.onBack}
        note={
          <span className="flex items-center gap-2">
            <DemoBadge /> Sending is simulated.{" "}
            <a href={mailto} className="font-medium text-brand-600 hover:underline">
              Open as draft in my email app
            </a>
          </span>
        }
      >
        <button onClick={send} className="btn-primary">
          <Send className="h-4 w-4" aria-hidden /> Send report
        </button>
      </Footer>
    </div>
  );
}

/* ---------------- Google Sheets (simulated) ---------------- */

const EXISTING_SHEETS = ["Spendwise — Expenses", "Household budget 2026", "Tax documents"];

export function SheetsConfig(p: ConfigProps) {
  const launch = useLaunch(p);
  const { connections, setLiveSync, startJob } = useCloud();
  const { toast } = useToast();
  const conn = connections.gsheets;
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [name, setName] = useState(`Spendwise · ${p.artifact.template.name}`);
  const [existing, setExisting] = useState(EXISTING_SHEETS[0]);
  const [tab, setTab] = useState(p.artifact.periodLabel);
  const sheetName = mode === "new" ? name : existing;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1" role="radiogroup" aria-label="Spreadsheet">
        {(["new", "existing"] as const).map((m) => (
          <label
            key={m}
            className={`cursor-pointer rounded-md py-1.5 text-center text-sm font-medium focus-within:ring-2 focus-within:ring-brand-500 ${
              mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            <input type="radio" name="sheet-mode" className="sr-only" checked={mode === m} onChange={() => setMode(m)} />
            {m === "new" ? "New spreadsheet" : "Add to existing"}
          </label>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {mode === "new" ? (
          <div>
            <label htmlFor="sheet-name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Spreadsheet name
            </label>
            <input id="sheet-name" value={name} onChange={(e) => setName(e.target.value)} className={input} />
          </div>
        ) : (
          <div>
            <label htmlFor="sheet-existing" className="mb-1.5 block text-sm font-medium text-slate-700">
              Spreadsheet
            </label>
            <select id="sheet-existing" value={existing} onChange={(e) => setExisting(e.target.value)} className={`${input} pr-8`}>
              {EXISTING_SHEETS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="sheet-tab" className="mb-1.5 block text-sm font-medium text-slate-700">
            Tab name
          </label>
          <input id="sheet-tab" value={tab} onChange={(e) => setTab(e.target.value)} className={input} />
        </div>
      </div>
      <label className="flex items-start gap-2 rounded-xl bg-green-50/60 p-3 ring-1 ring-inset ring-green-600/15">
        <input type="checkbox" checked={conn?.liveSync ?? false} onChange={(e) => setLiveSync("gsheets", e.target.checked)} className="mt-0.5 h-4 w-4 accent-green-600" />
        <span className="text-sm">
          <span className="flex items-center gap-1.5 font-medium text-slate-800">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Keep in sync
          </span>
          <span className="text-slate-600">Push new and edited expenses to this sheet automatically.</span>
        </span>
      </label>
      <SheetPreview table={p.artifact.table} title={sheetName || "Untitled spreadsheet"} tabs={[tab || "Sheet1", ...(mode === "existing" ? ["Budget", "Notes"] : [])]} />
      <Footer
        onBack={p.onBack}
        note={
          <span className="flex flex-wrap items-center gap-2">
            <DemoBadge /> Connected as {conn?.account}.
            <button
              className="font-medium text-brand-600 hover:underline"
              onClick={async () => {
                const job = await startJob({ templateId: p.artifact.template.id, periodId: p.periodId, destination: "clipboard", target: "Clipboard" });
                if (job.status === "done") toast("Copied — paste into any Google Sheet (works for real)");
                p.onClose();
              }}
            >
              Copy rows to paste manually
            </button>
          </span>
        }
      >
        <button onClick={() => void launch(`${sheetName} › ${tab}`, `${p.artifact.template.name} → ${sheetName}`)} disabled={!sheetName.trim()} className="btn-primary !bg-green-600 hover:!bg-green-700">
          {mode === "new" ? "Create spreadsheet" : "Write to sheet"}
        </button>
      </Footer>
    </div>
  );
}

/* ---------------- Cloud storage (simulated) ---------------- */

export function StorageConfig(p: ConfigProps) {
  const launch = useLaunch(p);
  const { connections } = useCloud();
  const service = SERVICES[p.destination];
  const [folder, setFolder] = useState("/Apps/Spendwise/Exports");
  const [versioning, setVersioning] = useState<"versions" | "overwrite">("versions");
  const fileName = versioning === "versions" ? p.artifact.filename : `spendwise-${p.artifact.template.id}-latest.${p.artifact.template.format}`;
  const cleanFolder = "/" + folder.split("/").map((s) => s.trim()).filter(Boolean).join("/");

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="storage-folder" className="mb-1.5 block text-sm font-medium text-slate-700">
          Folder in {service.name}
        </label>
        <div className="flex rounded-lg bg-white shadow-sm ring-1 ring-inset ring-slate-300 focus-within:ring-2 focus-within:ring-brand-500">
          <span className="flex items-center pl-3 text-slate-400">
            <Folder className="h-4 w-4" aria-hidden />
          </span>
          <input id="storage-folder" value={folder} onChange={(e) => setFolder(e.target.value)} className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 font-mono text-sm focus:ring-0" />
        </div>
        <nav aria-label="Folder path" className="mt-1.5 flex flex-wrap items-center gap-1 text-xs text-slate-500">
          <span className="font-medium text-slate-700">{service.name}</span>
          {cleanFolder.split("/").filter(Boolean).map((seg) => (
            <span key={seg} className="flex items-center gap-1">
              <span aria-hidden>›</span> {seg}
            </span>
          ))}
        </nav>
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">When a file already exists</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            { id: "versions" as const, title: "Keep every version", desc: "Date-stamped files — a full audit trail." },
            { id: "overwrite" as const, title: "Replace latest", desc: "One always-current file other tools can link to." },
          ].map((o) => (
            <label
              key={o.id}
              className={`cursor-pointer rounded-xl p-3 ring-1 ring-inset focus-within:ring-2 focus-within:ring-brand-500 ${
                versioning === o.id ? "bg-brand-50 ring-brand-500" : "ring-slate-200 hover:bg-slate-50"
              }`}
            >
              <input type="radio" name="versioning" className="sr-only" checked={versioning === o.id} onChange={() => setVersioning(o.id)} />
              <span className="block text-sm font-medium text-slate-900">{o.title}</span>
              <span className="block text-xs text-slate-500">{o.desc}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs text-slate-200">
        {cleanFolder}/{fileName}
      </div>
      <Footer onBack={p.onBack} note={<span className="flex items-center gap-2"><DemoBadge /> Connected as {connections[p.destination]?.account}</span>}>
        <button onClick={() => void launch(`${cleanFolder}/${fileName}`)} className="btn-primary">
          Upload to {service.name}
        </button>
      </Footer>
    </div>
  );
}

/* ---------------- Slack digest (simulated) ---------------- */

export function SlackConfig(p: ConfigProps) {
  const launch = useLaunch(p);
  const [channel, setChannel] = useState("finance");
  const clean = channel.replace(/^#/, "").trim().toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="slack-channel" className="mb-1.5 block text-sm font-medium text-slate-700">
          Channel
        </label>
        <div className="flex rounded-lg bg-white shadow-sm ring-1 ring-inset ring-slate-300 focus-within:ring-2 focus-within:ring-brand-500">
          <span className="flex items-center pl-3 text-slate-400">
            <Hash className="h-4 w-4" aria-hidden />
          </span>
          <input id="slack-channel" value={channel} onChange={(e) => setChannel(e.target.value)} className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm focus:ring-0" />
        </div>
      </div>
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <p className="mb-2 text-xs font-medium text-slate-400">Message preview · #{clean || "channel"}</p>
        <div className="flex gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">S</span>
          <div className="min-w-0 text-sm">
            <p>
              <span className="font-semibold text-slate-900">Spendwise</span>{" "}
              <span className="rounded bg-slate-100 px-1 text-[10px] font-semibold uppercase text-slate-500">app</span>
            </p>
            <p className="mt-0.5 font-semibold text-slate-800">
              📊 {p.artifact.template.name} — {p.artifact.periodLabel}
            </p>
            <ul className="mt-1 space-y-0.5 text-slate-700">
              {p.insights.headlines.map((h) => (
                <li key={h}>• {h}</li>
              ))}
            </ul>
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
              <Paperclip className="h-3 w-3" aria-hidden /> {p.artifact.filename}
            </p>
          </div>
        </div>
      </div>
      <Footer onBack={p.onBack} note={<span className="flex items-center gap-2"><DemoBadge /> Posting is simulated.</span>}>
        <button onClick={() => void launch(`#${clean}`, `Digest → #${clean}`)} disabled={!clean} className="btn-primary">
          Post to #{clean || "channel"}
        </button>
      </Footer>
    </div>
  );
}
