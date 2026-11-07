"use client";

import { ArrowLeftRight, Check, Info, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useCloud } from "@/hooks/useCloud";
import { useToast } from "@/hooks/useToast";
import { SERVICES, type DestinationId } from "@/lib/cloud/services";
import { ServiceIcon } from "./ServiceIcon";

/**
 * Simulated OAuth-style connection: sign in → review permissions → connect.
 * Rendered inside a Modal or inline inside the export flow.
 */
export function ConnectPanel({ id, onDone, onCancel }: { id: DestinationId; onDone: () => void; onCancel: () => void }) {
  const service = SERVICES[id];
  const { connect } = useCloud();
  const { toast } = useToast();
  const [step, setStep] = useState<"signin" | "consent" | "connecting">("signin");
  const [account, setAccount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submitAccount = (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.trim())) {
      setError("Enter the email address of the account to connect.");
      return;
    }
    setError(null);
    setStep("consent");
  };

  const allow = () => {
    setStep("connecting");
    setTimeout(() => {
      connect(id, account.trim());
      toast(`${service.name} connected`);
      onDone();
    }, 1200);
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white" aria-hidden>
          <Wallet className="h-6 w-6" />
        </span>
        <ArrowLeftRight className="h-4 w-4 text-slate-300" aria-hidden />
        <ServiceIcon id={id} size="lg" />
      </div>

      <div className="mb-5 flex gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-600/20">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Demo integration — this simulates the {service.name} sign-in. No credentials are requested and nothing is sent to {service.name}.
      </div>

      {step === "signin" && (
        <form onSubmit={submitAccount} noValidate>
          <h3 className="text-center text-base font-semibold text-slate-900">Connect {service.name}</h3>
          <p className="mb-4 text-center text-sm text-slate-500">Which {service.name} account should Spendwise use?</p>
          <label htmlFor="connect-account" className="mb-1.5 block text-sm font-medium text-slate-700">
            Account email
          </label>
          <input
            id="connect-account"
            data-autofocus
            type="email"
            autoComplete="off"
            placeholder="name@example.com"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            aria-invalid={!!error}
            className={`block w-full rounded-lg border-0 px-3 py-2.5 text-sm shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-brand-500 ${
              error ? "ring-red-300" : "ring-slate-300"
            }`}
          />
          {error && (
            <p className="mt-1.5 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Continue
            </button>
          </div>
        </form>
      )}

      {step === "consent" && (
        <div>
          <h3 className="text-center text-base font-semibold text-slate-900">Spendwise wants to access your {service.name}</h3>
          <p className="mb-4 text-center text-sm text-slate-500">{account}</p>
          <ul className="space-y-2 rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
            {(service.scopes ?? []).map((s) => (
              <li key={s} className="flex items-start gap-2 text-sm text-slate-700">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                {s}
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> You can disconnect at any time from Integrations.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setStep("signin")} className="btn-secondary">
              Back
            </button>
            <button type="button" data-autofocus onClick={allow} className="btn-primary">
              Allow access
            </button>
          </div>
        </div>
      )}

      {step === "connecting" && (
        <div className="flex flex-col items-center py-6" role="status">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" aria-hidden />
          <p className="mt-3 text-sm font-medium text-slate-700">Connecting to {service.name}…</p>
          <p className="text-xs text-slate-500">Exchanging tokens securely</p>
        </div>
      )}
    </div>
  );
}
