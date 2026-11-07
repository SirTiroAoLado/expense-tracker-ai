"use client";

import { CheckCircle2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Modal } from "@/components/Modal";
import { useCloud } from "@/hooks/useCloud";
import { useExportFlow } from "@/hooks/useExportFlow";
import { relativeTime } from "@/lib/cloud/schedule";
import { CONNECTABLE, SERVICES, type DestinationId } from "@/lib/cloud/services";
import { ConnectPanel } from "../ConnectPanel";
import { DemoBadge, ServiceIcon } from "../ServiceIcon";

const COMING_SOON = [
  { name: "Notion", desc: "Sync expenses into a Notion database" },
  { name: "Airtable", desc: "Two-way sync with an Airtable base" },
  { name: "QuickBooks", desc: "Send categorised expenses to your books" },
  { name: "Webhooks", desc: "POST every new expense to your own endpoint" },
];

export function IntegrationsTab() {
  const { connections, disconnect, setLiveSync, syncing, online } = useCloud();
  const { openFlow } = useExportFlow();
  const [connecting, setConnecting] = useState<DestinationId | null>(null);
  const [confirm, setConfirm] = useState<DestinationId | null>(null);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-base font-semibold text-slate-900">Connected services</h2>
        <p className="mb-4 text-sm text-slate-500">Connect once, then export, sync or schedule backups in one click.</p>
        <div className="grid gap-4 md:grid-cols-2">
          {CONNECTABLE.map((id) => {
            const s = SERVICES[id];
            const c = connections[id];
            return (
              <div key={id} className="card flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <ServiceIcon id={id} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-semibold text-slate-900">
                      {s.name} <DemoBadge />
                    </p>
                    <p className="text-sm text-slate-500">{s.tagline}</p>
                  </div>
                  {c ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Connected
                    </span>
                  ) : null}
                </div>

                {c ? (
                  <>
                    <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
                      <div>
                        <dt className="text-slate-400">Account</dt>
                        <dd className="truncate font-medium text-slate-700">{c.account}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-400">Last sync</dt>
                        <dd className="flex items-center gap-1 font-medium text-slate-700">
                          {c.liveSync && syncing && online ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" aria-hidden /> Syncing…
                            </>
                          ) : c.lastSyncAt ? (
                            relativeTime(c.lastSyncAt)
                          ) : (
                            "Never"
                          )}
                        </dd>
                      </div>
                    </dl>
                    {id === "gsheets" && (
                      <label className="mt-3 flex items-center justify-between gap-3 text-sm">
                        <span>
                          <span className="font-medium text-slate-800">Live sync</span>
                          <span className="block text-xs text-slate-500">Push every change to your spreadsheet</span>
                        </span>
                        <Switch checked={c.liveSync} onChange={(v) => setLiveSync(id, v)} label="Live sync" />
                      </label>
                    )}
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => openFlow({ destination: id })} className="btn-secondary flex-1 !py-2">
                        Export now
                      </button>
                      <button onClick={() => setConfirm(id)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600">
                        Disconnect
                      </button>
                    </div>
                  </>
                ) : (
                  <button onClick={() => setConnecting(id)} className="btn-primary mt-4">
                    Connect {s.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-base font-semibold text-slate-900">Coming soon</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {COMING_SOON.map((x) => (
            <div key={x.name} className="rounded-2xl border border-dashed border-slate-300 p-4">
              <p className="text-sm font-semibold text-slate-700">{x.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{x.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {connecting && (
        <Modal title="Connect a service" onClose={() => setConnecting(null)}>
          <ConnectPanel id={connecting} onDone={() => setConnecting(null)} onCancel={() => setConnecting(null)} />
        </Modal>
      )}
      {confirm && (
        <Modal title={`Disconnect ${SERVICES[confirm].name}?`} size="sm" onClose={() => setConfirm(null)}>
          <p className="text-sm text-slate-600">Scheduled exports to {SERVICES[confirm].name} will be paused. Files already exported stay where they are.</p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button data-autofocus onClick={() => setConfirm(null)} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={() => {
                disconnect(confirm);
                setConfirm(null);
              }}
              className="btn-danger"
            >
              Disconnect
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 ${
        checked ? "bg-brand-600" : "bg-slate-300"
      }`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}
