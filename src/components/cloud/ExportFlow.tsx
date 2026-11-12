"use client";

import { Check, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { useCloud } from "@/hooks/useCloud";
import { useExpenses } from "@/hooks/useExpenses";
import { computeInsights } from "@/lib/cloud/insights";
import { PERIODS, resolvePeriod, type PeriodId } from "@/lib/cloud/period";
import { SERVICES, type DestinationId, type Service } from "@/lib/cloud/services";
import { buildArtifact, formatBytes, getTemplate, TEMPLATES, type TemplateId } from "@/lib/cloud/templates";
import { ConnectPanel } from "./ConnectPanel";
import { EmailConfig, LocalConfig, SheetsConfig, SlackConfig, StorageConfig, type ConfigProps } from "./DestinationConfigs";
import { DemoBadge, ServiceIcon } from "./ServiceIcon";
import { ShareConfig } from "./ShareConfig";

export interface FlowSeed {
  templateId?: TemplateId;
  destination?: DestinationId;
}

type Step = "what" | "where" | "connect" | "configure";

const GROUPS: { title: string; ids: DestinationId[] }[] = [
  { title: "On this device", ids: ["download", "clipboard"] },
  { title: "Share with people", ids: ["share", "email"] },
  { title: "Connected apps", ids: ["gsheets", "slack"] },
  { title: "Cloud storage", ids: ["gdrive", "dropbox", "onedrive"] },
];

export function ExportFlow({ seed, onClose }: { seed: FlowSeed; onClose: () => void }) {
  const { expenses, currency } = useExpenses();
  const { connections } = useCloud();
  const [templateId, setTemplateId] = useState<TemplateId>(seed.templateId ?? "monthly-summary");
  const [periodId, setPeriodId] = useState<PeriodId>(getTemplate(seed.templateId ?? "monthly-summary").defaultPeriod);
  const [destination, setDestination] = useState<DestinationId | null>(seed.destination ?? null);
  const [step, setStep] = useState<Step>(() => {
    if (!seed.destination) return "what";
    if (!seed.templateId) return "what";
    return SERVICES[seed.destination].requiresConnection && !connections[seed.destination] ? "connect" : "configure";
  });

  const artifact = useMemo(() => buildArtifact(templateId, expenses, periodId, currency), [templateId, expenses, periodId, currency]);
  const insights = useMemo(() => computeInsights(expenses, resolvePeriod(periodId), currency), [expenses, periodId, currency]);

  const chooseDestination = (id: DestinationId) => {
    setDestination(id);
    setStep(SERVICES[id].requiresConnection && !connections[id] ? "connect" : "configure");
  };

  const next = () => (destination ? chooseDestination(destination) : setStep("where"));

  const titles: Record<Step, string> = {
    what: "Choose what to export",
    where: "Where should it go?",
    connect: destination ? `Connect ${SERVICES[destination].name}` : "Connect",
    configure: destination ? `${SERVICES[destination].name}` : "Deliver",
  };
  const stepIndex = step === "what" ? 0 : step === "where" ? 1 : 2;

  const cfg: ConfigProps | null = destination
    ? { destination, artifact, insights, periodId, onBack: () => setStep("where"), onClose }
    : null;

  return (
    <Modal title={titles[step]} description={`${artifact.template.name} · ${artifact.periodLabel}`} onClose={onClose} size="lg">
      {/* Stepper */}
      <ol className="mb-6 flex items-center gap-2 text-xs font-medium" aria-label="Progress">
        {["Data", "Destination", "Deliver"].map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                i < stepIndex ? "bg-brand-600 text-white" : i === stepIndex ? "bg-brand-50 text-brand-700 ring-2 ring-brand-500" : "bg-slate-100 text-slate-400"
              }`}
              aria-current={i === stepIndex ? "step" : undefined}
            >
              {i < stepIndex ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={i <= stepIndex ? "text-slate-800" : "text-slate-400"}>{label}</span>
            {i < 2 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden />}
          </li>
        ))}
      </ol>

      {step === "what" && (
        <div className="space-y-6">
          <div role="radiogroup" aria-label="Template" className="grid gap-3 sm:grid-cols-2">
            {TEMPLATES.map((t) => {
              const Icon = t.icon;
              const active = t.id === templateId;
              return (
                <label
                  key={t.id}
                  className={`relative flex cursor-pointer gap-3 rounded-2xl p-4 ring-1 ring-inset transition focus-within:ring-2 focus-within:ring-brand-500 ${
                    active ? "bg-brand-50/50 ring-2 ring-brand-500" : "ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="template"
                    className="sr-only"
                    checked={active}
                    onChange={() => {
                      setTemplateId(t.id);
                      setPeriodId(t.defaultPeriod);
                    }}
                  />
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white ${t.accent}`} aria-hidden>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{t.name}</span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">{t.format}</span>
                    </span>
                    <span className="block text-xs font-medium text-brand-700">{t.audience}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-slate-500">{t.tagline}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-slate-700">Period</legend>
            <div className="flex flex-wrap gap-1.5">
              {PERIODS.map((p) => (
                <label
                  key={p.id}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset focus-within:ring-2 focus-within:ring-brand-500 ${
                    periodId === p.id ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input type="radio" name="period" className="sr-only" checked={periodId === p.id} onChange={() => setPeriodId(p.id)} />
                  {p.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            {artifact.records === 0 ? (
              <p className="text-sm font-medium text-amber-700" role="status">
                No expenses in {artifact.periodLabel.toLowerCase()} — pick another period.
              </p>
            ) : (
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{artifact.records}</span> expense{artifact.records === 1 ? "" : "s"} ·{" "}
                {artifact.table.length - 1} row{artifact.table.length === 2 ? "" : "s"} · {formatBytes(artifact.bytes)}
              </p>
            )}
            <button onClick={next} className="btn-primary">
              Continue <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {step === "where" && (
        <div className="space-y-5">
          {GROUPS.map((g) => (
            <section key={g.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{g.title}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {g.ids.map((id) => (
                  <DestinationTile key={id} service={SERVICES[id]} connected={!!connections[id]} onClick={() => chooseDestination(id)} />
                ))}
              </div>
            </section>
          ))}
          <div className="flex justify-start border-t border-slate-100 pt-4">
            <button onClick={() => setStep("what")} className="btn-secondary">
              Back
            </button>
          </div>
        </div>
      )}

      {step === "connect" && destination && (
        <ConnectPanel id={destination} onDone={() => setStep("configure")} onCancel={() => setStep("where")} />
      )}

      {step === "configure" && cfg && destination && (
        <>
          {destination === "download" || destination === "clipboard" ? (
            <LocalConfig {...cfg} />
          ) : destination === "share" ? (
            <ShareConfig artifact={artifact} periodId={periodId} onBack={cfg.onBack} onClose={onClose} />
          ) : destination === "email" ? (
            <EmailConfig {...cfg} />
          ) : destination === "gsheets" ? (
            <SheetsConfig {...cfg} />
          ) : destination === "slack" ? (
            <SlackConfig {...cfg} />
          ) : (
            <StorageConfig {...cfg} />
          )}
        </>
      )}
    </Modal>
  );
}

function DestinationTile({ service, connected, onClick }: { service: Service; connected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl p-3 text-left ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:ring-slate-300 focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <ServiceIcon id={service.id} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
          {service.name}
          {service.simulated && <DemoBadge />}
        </span>
        <span className="block truncate text-xs text-slate-500">{service.tagline}</span>
      </span>
      {service.requiresConnection &&
        (connected ? (
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden /> Connected
          </span>
        ) : (
          <span className="shrink-0 text-xs font-medium text-brand-600 group-hover:underline">Connect</span>
        ))}
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-slate-500" aria-hidden />
    </button>
  );
}
