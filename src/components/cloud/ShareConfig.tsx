"use client";

import { Check, Copy, ExternalLink, Eye, EyeOff, Loader2, Lock, QrCode, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useCloud } from "@/hooks/useCloud";
import { useExpenses } from "@/hooks/useExpenses";
import { useToast } from "@/hooks/useToast";
import { inRange, resolvePeriod, type PeriodId } from "@/lib/cloud/period";
import { encodeSnapshot, QR_MAX_URL_LENGTH, type SharedSnapshot } from "@/lib/cloud/share";
import type { Artifact } from "@/lib/cloud/templates";

const EXPIRY = [
  { id: "1d", label: "24 hours", ms: 86_400_000 },
  { id: "7d", label: "7 days", ms: 7 * 86_400_000 },
  { id: "30d", label: "30 days", ms: 30 * 86_400_000 },
  { id: "never", label: "Never", ms: 0 },
] as const;

export function ShareConfig({ artifact, periodId, onBack, onClose }: { artifact: Artifact; periodId: PeriodId; onBack: () => void; onClose: () => void }) {
  const { expenses, currency } = useExpenses();
  const { addShare, recordHistory } = useCloud();
  const { toast } = useToast();
  const [title, setTitle] = useState(`${artifact.template.name} · ${artifact.periodLabel}`);
  const [note, setNote] = useState("");
  const [expiry, setExpiry] = useState<(typeof EXPIRY)[number]["id"]>("7d");
  const [includeDescriptions, setIncludeDescriptions] = useState(true);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const pwError = usePassword && password.length > 0 && password.length < 6 ? "Use at least 6 characters." : null;
  const canCreate = title.trim().length > 0 && (!usePassword || password.length >= 6) && !busy;

  const create = async () => {
    if (!canCreate) return;
    setBusy(true);
    try {
      const period = resolvePeriod(periodId);
      const ms = EXPIRY.find((e) => e.id === expiry)!.ms;
      const snap: SharedSnapshot = {
        v: 1,
        title: title.trim(),
        note: note.trim() || undefined,
        periodLabel: period.label,
        currency,
        createdAt: new Date().toISOString(),
        expiresAt: ms ? new Date(Date.now() + ms).toISOString() : null,
        rows: expenses
          .filter((e) => inRange(e.date, period.from, period.to))
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((e) => [e.date, e.category, e.amount, includeDescriptions ? e.description : ""]),
      };
      const token = await encodeSnapshot(snap, usePassword ? password : undefined);
      const link = `${window.location.origin}/share#${token}`;
      setUrl(link);
      addShare({ title: snap.title, url: link, expiresAt: snap.expiresAt, protected: usePassword, records: snap.rows.length, periodLabel: period.label });
      recordHistory({
        templateId: artifact.template.id,
        templateName: artifact.template.name,
        periodId,
        periodLabel: period.label,
        destination: "share",
        target: usePassword ? "Password-protected link" : "Public link",
        filename: snap.title,
        records: snap.rows.length,
        bytes: link.length,
        status: "delivered",
        trigger: "manual",
        shareUrl: link,
      });
    } catch (err) {
      console.error(err);
      toast("Couldn't create the link in this browser", { kind: "error" });
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!url || url.length > QR_MAX_URL_LENGTH) return;
    let alive = true;
    import("qrcode").then((QR) =>
      QR.toDataURL(url, { errorCorrectionLevel: "L", margin: 1, width: 220, color: { dark: "#0f172a", light: "#ffffff" } }).then(
        (d) => alive && setQr(d),
        () => alive && setQr(null),
      ),
    );
    return () => {
      alive = false;
    };
  }, [url]);

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast("Copy failed — select the link and copy it manually", { kind: "error" });
    }
  };

  if (url) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-4 ring-1 ring-inset ring-emerald-600/20">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden />
          <div className="text-sm text-emerald-900">
            <p className="font-semibold">Your link is ready</p>
            <p className="mt-0.5 text-emerald-800">
              The report is packed <em>inside</em> the link — no server stores it.{" "}
              {usePassword ? "It's encrypted with AES-256, so share the password separately." : "Anyone with the link can view it."}{" "}
              {expiry !== "never" ? `The link expires in ${EXPIRY.find((e) => e.id === expiry)!.label}.` : "The link never expires."}
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
          <div className="min-w-0 space-y-3">
            <label htmlFor="share-url" className="block text-sm font-medium text-slate-700">
              Share link
            </label>
            <div className="flex gap-2">
              <input
                id="share-url"
                readOnly
                value={url}
                onFocus={(e) => e.currentTarget.select()}
                className="min-w-0 flex-1 rounded-lg border-0 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 ring-1 ring-inset ring-slate-200"
              />
              <button onClick={copy} className="btn-primary shrink-0 !px-3">
                {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {url.length.toLocaleString()} characters · {usePassword ? "encrypted" : "compressed"} · read-only
            </p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700">
              <ExternalLink className="h-4 w-4" aria-hidden /> Open the shared view
            </a>
          </div>
          <div className="flex flex-col items-center">
            {qr ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qr} alt="QR code for the share link" width={150} height={150} className="rounded-lg ring-1 ring-slate-200" />
                <p className="mt-1.5 text-xs text-slate-500">Scan to open on a phone</p>
              </>
            ) : (
              <div className="flex h-[150px] w-[150px] flex-col items-center justify-center rounded-lg bg-slate-50 p-3 text-center ring-1 ring-slate-200">
                <QrCode className="mb-1 h-6 w-6 text-slate-300" aria-hidden />
                <p className="text-[11px] leading-snug text-slate-500">
                  {url.length > QR_MAX_URL_LENGTH ? "Too much data for a QR code — pick a shorter period." : "Generating…"}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button onClick={onClose} className="btn-secondary">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="share-title" className="mb-1.5 block text-sm font-medium text-slate-700">
          Title
        </label>
        <input
          id="share-title"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          className="block w-full rounded-lg border-0 px-3 py-2 text-sm shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div>
        <label htmlFor="share-note" className="mb-1.5 block text-sm font-medium text-slate-700">
          Note for viewers <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id="share-note"
          rows={2}
          maxLength={280}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Here's our shared household spending for October."
          className="block w-full rounded-lg border-0 px-3 py-2 text-sm shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-slate-700">Link expires</legend>
          <div className="grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1">
            {EXPIRY.map((e) => (
              <label
                key={e.id}
                className={`cursor-pointer rounded-md py-1.5 text-center text-xs font-medium transition focus-within:ring-2 focus-within:ring-brand-500 ${
                  expiry === e.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                <input type="radio" name="expiry" className="sr-only" checked={expiry === e.id} onChange={() => setExpiry(e.id)} />
                {e.label}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-slate-700">Privacy</legend>
          <label className="flex items-center gap-2 py-1.5 text-sm text-slate-700">
            <input type="checkbox" checked={includeDescriptions} onChange={(e) => setIncludeDescriptions(e.target.checked)} className="h-4 w-4 accent-brand-600" />
            Include descriptions
          </label>
        </fieldset>
      </div>

      <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <input type="checkbox" checked={usePassword} onChange={(e) => setUsePassword(e.target.checked)} className="h-4 w-4 accent-brand-600" />
          <Lock className="h-4 w-4 text-slate-500" aria-hidden />
          Protect with a password
        </label>
        <p className="ml-6 mt-0.5 text-xs text-slate-500">End-to-end encrypted (AES-256-GCM). Without the password the link is unreadable.</p>
        {usePassword && (
          <div className="ml-6 mt-3">
            <label htmlFor="share-pw" className="sr-only">
              Password
            </label>
            <div className="flex rounded-lg bg-white shadow-sm ring-1 ring-inset ring-slate-300 focus-within:ring-2 focus-within:ring-brand-500">
              <input
                id="share-pw"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className="min-w-0 flex-1 rounded-l-lg border-0 bg-transparent px-3 py-2 text-sm focus:ring-0"
              />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="px-3 text-slate-400 hover:text-slate-600" aria-label={showPw ? "Hide password" : "Show password"}>
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwError && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {pwError}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
        <button onClick={onBack} className="btn-secondary">
          Back
        </button>
        <button onClick={() => void create()} disabled={!canCreate} className="btn-primary">
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {busy ? (usePassword ? "Encrypting…" : "Creating…") : "Create link"}
        </button>
      </div>
    </div>
  );
}
