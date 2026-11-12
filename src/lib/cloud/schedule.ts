import type { PeriodId } from "./period";
import type { DestinationId } from "./services";
import type { TemplateId } from "./templates";

export type Frequency = "daily" | "weekly" | "monthly";

export interface Schedule {
  id: string;
  name: string;
  templateId: TemplateId;
  periodId: PeriodId;
  destination: DestinationId;
  /** e.g. recipient emails, folder path or channel */
  target: string;
  frequency: Frequency;
  weekday: number; // 0-6, weekly
  monthDay: number; // 1-28, monthly
  time: string; // HH:MM local
  enabled: boolean;
  createdAt: string;
  lastRunAt: string | null;
  nextRunAt: string;
}

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** Next occurrence strictly after `from`. */
export function computeNextRun(s: Pick<Schedule, "frequency" | "weekday" | "monthDay" | "time">, from = new Date()): Date {
  const [h, m] = s.time.split(":").map(Number);
  const d = new Date(from);
  d.setHours(h, m, 0, 0);
  if (s.frequency === "daily") {
    if (d <= from) d.setDate(d.getDate() + 1);
  } else if (s.frequency === "weekly") {
    d.setDate(d.getDate() + ((s.weekday - d.getDay() + 7) % 7));
    if (d <= from) d.setDate(d.getDate() + 7);
  } else {
    d.setDate(s.monthDay);
    if (d <= from) {
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
      d.setDate(s.monthDay);
    }
  }
  return d;
}

export function describeSchedule(s: Pick<Schedule, "frequency" | "weekday" | "monthDay" | "time">): string {
  const t = new Date(2000, 0, 1, ...(s.time.split(":").map(Number) as [number, number])).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (s.frequency === "daily") return `Every day at ${t}`;
  if (s.frequency === "weekly") return `Every ${WEEKDAY_NAMES[s.weekday]} at ${t}`;
  return `Monthly on the ${ordinal(s.monthDay)} at ${t}`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function relativeTime(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  if (abs < 45_000) return diff < 0 ? "just now" : "in a moment";
  if (abs < 3_600_000) return rtf.format(Math.round(diff / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diff / 3_600_000), "hour");
  if (abs < 30 * 86_400_000) return rtf.format(Math.round(diff / 86_400_000), "day");
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
