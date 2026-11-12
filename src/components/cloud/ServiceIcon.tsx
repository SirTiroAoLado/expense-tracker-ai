import { SERVICES, type DestinationId } from "@/lib/cloud/services";

export function ServiceIcon({ id, size = "md" }: { id: DestinationId; size?: "sm" | "md" | "lg" }) {
  const s = SERVICES[id];
  const Icon = s.icon;
  const box = size === "sm" ? "h-7 w-7 rounded-lg" : size === "lg" ? "h-12 w-12 rounded-2xl" : "h-10 w-10 rounded-xl";
  const icon = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-6 w-6" : "h-5 w-5";
  return (
    <span className={`flex shrink-0 items-center justify-center ${box} ${s.tint}`} aria-hidden>
      <Icon className={icon} />
    </span>
  );
}

export function DemoBadge() {
  return (
    <span
      className="inline-flex items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-600/20"
      title="Simulated integration — nothing is sent to this service"
    >
      Demo
    </span>
  );
}
