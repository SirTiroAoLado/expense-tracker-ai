"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";

/**
 * Error boundary for /share. Shared links are untrusted input. parseSnapshot()
 * rejects malformed reports up front, and this boundary is the last line of
 * defence if anything still throws while rendering one.
 */
export default function ShareError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-md p-8 text-center" role="alert">
      <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-amber-500" aria-hidden />
      <h1 className="text-lg font-semibold text-slate-900">This report can&apos;t be displayed</h1>
      <p className="mt-1 text-sm text-slate-500">The link may be damaged or was not created by Spendwise. Ask the sender for a new one.</p>
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={reset} className="btn-secondary">
          Try again
        </button>
        <Link href="/" className="btn-primary">
          Go to Spendwise
        </Link>
      </div>
    </div>
  );
}
