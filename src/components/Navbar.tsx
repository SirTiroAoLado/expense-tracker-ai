"use client";

import { LayoutDashboard, ListOrdered, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useExpenseDialog } from "@/hooks/useExpenseDialog";
import { useExpenses } from "@/hooks/useExpenses";
import { CURRENCIES, type CurrencyCode } from "@/lib/types";

const LINKS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: ListOrdered },
];

export function Navbar() {
  const pathname = usePathname();
  const { openCreate } = useExpenseDialog();
  const { currency, setCurrency } = useExpenses();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-semibold text-slate-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Wallet className="h-4 w-4" aria-hidden />
            </span>
            <span className="hidden sm:inline">Spendwise</span>
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="currency" className="sr-only">
              Currency
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
              className="rounded-lg border-0 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-brand-500"
              title="Display currency"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code}
                </option>
              ))}
            </select>
            <button onClick={openCreate} className="btn-primary hidden sm:inline-flex">
              <Plus className="h-4 w-4" aria-hidden />
              Add expense
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main mobile"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        <div className="grid grid-cols-3">
          {LINKS.slice(0, 1).map(({ href, label, icon: Icon }) => (
            <MobileLink key={href} href={href} label={label} Icon={Icon} active={pathname === href} />
          ))}
          <div className="flex items-center justify-center">
            <button
              onClick={openCreate}
              className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 ring-4 ring-white active:scale-95"
              aria-label="Add expense"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
          {LINKS.slice(1).map(({ href, label, icon: Icon }) => (
            <MobileLink key={href} href={href} label={label} Icon={Icon} active={pathname === href} />
          ))}
        </div>
      </nav>
    </>
  );
}

function MobileLink({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: typeof Wallet;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${active ? "text-brand-600" : "text-slate-500"}`}
    >
      <Icon className="h-5 w-5" aria-hidden />
      {label}
    </Link>
  );
}
