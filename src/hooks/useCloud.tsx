"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PeriodId } from "@/lib/cloud/period";
import { computeNextRun, type Schedule } from "@/lib/cloud/schedule";
import { SERVICES, type DestinationId } from "@/lib/cloud/services";
import { buildArtifact, downloadArtifact, tableToTSV, type Artifact, type TemplateId } from "@/lib/cloud/templates";
import { generateId } from "@/lib/storage";
import { useExpenses } from "./useExpenses";
import { useToast } from "./useToast";

const STORAGE_KEY = "expense-tracker:cloud:v1";
const MAX_HISTORY = 60;

export interface Connection {
  account: string;
  connectedAt: string;
  liveSync: boolean;
  lastSyncAt: string | null;
}

export type JobStatus = "running" | "waiting" | "done" | "failed";

export interface Job {
  id: string;
  title: string;
  destination: DestinationId;
  target: string;
  status: JobStatus;
  progress: number;
  step: string;
  startedAt: number;
  trigger: "manual" | "scheduled";
  artifact: Artifact;
  periodId: PeriodId;
  error?: string;
}

export interface HistoryEntry {
  id: string;
  templateId: TemplateId;
  templateName: string;
  periodId: PeriodId;
  periodLabel: string;
  destination: DestinationId;
  target: string;
  filename: string;
  records: number;
  bytes: number;
  status: "delivered" | "failed";
  trigger: "manual" | "scheduled";
  createdAt: string;
  shareUrl?: string;
}

export interface ShareRecord {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  expiresAt: string | null;
  protected: boolean;
  records: number;
  periodLabel: string;
}

interface Persisted {
  connections: Partial<Record<DestinationId, Connection>>;
  history: HistoryEntry[];
  schedules: Schedule[];
  shares: ShareRecord[];
}

const EMPTY: Persisted = { connections: {}, history: [], schedules: [], shares: [] };

export interface StartJobInput {
  templateId: TemplateId;
  periodId: PeriodId;
  destination: DestinationId;
  target?: string;
  trigger?: "manual" | "scheduled";
  title?: string;
}

interface CloudContextValue extends Persisted {
  ready: boolean;
  online: boolean;
  jobs: Job[];
  syncing: boolean;
  connect: (id: DestinationId, account: string) => void;
  disconnect: (id: DestinationId) => void;
  setLiveSync: (id: DestinationId, on: boolean) => void;
  startJob: (input: StartJobInput) => Promise<Job>;
  dismissJob: (id: string) => void;
  clearFinishedJobs: () => void;
  recordHistory: (entry: Omit<HistoryEntry, "id" | "createdAt">) => void;
  clearHistory: () => void;
  saveSchedule: (s: Omit<Schedule, "id" | "createdAt" | "lastRunAt" | "nextRunAt"> & { id?: string }) => void;
  toggleSchedule: (id: string) => void;
  deleteSchedule: (id: string) => void;
  runScheduleNow: (id: string) => void;
  addShare: (s: Omit<ShareRecord, "id" | "createdAt">) => ShareRecord;
  removeShare: (id: string) => void;
}

const CloudContext = createContext<CloudContextValue | null>(null);

export function CloudProvider({ children }: { children: ReactNode }) {
  const { expenses, currency, isLoading } = useExpenses();
  const { toast } = useToast();
  const [data, setData] = useState<Persisted>(EMPTY);
  const [ready, setReady] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const expensesRef = useRef(expenses);
  expensesRef.current = expenses;
  const currencyRef = useRef(currency);
  currencyRef.current = currency;
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  const dataRef = useRef(data);
  dataRef.current = data;

  /* ---------- persistence ---------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData({ ...EMPTY, ...(JSON.parse(raw) as Partial<Persisted>) });
    } catch {
      /* start fresh */
    }
    setOnline(navigator.onLine);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      /* storage full: non-critical */
    }
  }, [data, ready]);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  /* ---------- history ---------- */
  const recordHistory = useCallback((entry: Omit<HistoryEntry, "id" | "createdAt">) => {
    setData((d) => ({
      ...d,
      history: [{ ...entry, id: generateId(), createdAt: new Date().toISOString() }, ...d.history].slice(0, MAX_HISTORY),
    }));
  }, []);

  const historyFromJob = useCallback(
    (j: Job, status: "delivered" | "failed") =>
      recordHistory({
        templateId: j.artifact.template.id,
        templateName: j.artifact.template.name,
        periodId: j.periodId,
        periodLabel: j.artifact.periodLabel,
        destination: j.destination,
        target: j.target,
        filename: j.artifact.filename,
        records: j.artifact.records,
        bytes: j.artifact.bytes,
        status,
        trigger: j.trigger,
      }),
    [recordHistory],
  );

  /* ---------- jobs ---------- */
  const startJob = useCallback(
    async (input: StartJobInput): Promise<Job> => {
      const service = SERVICES[input.destination];
      const artifact = buildArtifact(input.templateId, expensesRef.current, input.periodId, currencyRef.current);
      const job: Job = {
        id: generateId(),
        title: input.title ?? `${artifact.template.name} → ${service.name}`,
        destination: input.destination,
        target: input.target ?? "",
        status: "running",
        progress: 0,
        step: service.steps[0],
        startedAt: Date.now(),
        trigger: input.trigger ?? "manual",
        artifact,
        periodId: input.periodId,
      };

      // Local destinations do real work immediately (clipboard needs the user gesture).
      if (input.destination === "download" || input.destination === "clipboard") {
        try {
          if (input.destination === "download") downloadArtifact(artifact);
          else await navigator.clipboard.writeText(tableToTSV(artifact.table));
          const done = { ...job, status: "done" as const, progress: 100, step: service.steps[service.steps.length - 1] };
          setJobs((js) => [done, ...js]);
          historyFromJob(done, "delivered");
          return done;
        } catch {
          const failed = { ...job, status: "failed" as const, progress: 100, step: "Failed", error: "Browser blocked the action." };
          setJobs((js) => [failed, ...js]);
          historyFromJob(failed, "failed");
          return failed;
        }
      }

      setJobs((js) => [job, ...js]);
      return job;
    },
    [historyFromJob],
  );

  // Simulated background worker: advances cloud jobs, pauses them while offline.
  const hasActive = jobs.some((j) => j.status === "running" || j.status === "waiting");
  useEffect(() => {
    if (!hasActive) return;
    const timer = setInterval(() => {
      const finished: Job[] = [];
      const next = jobsRef.current.map((j) => {
        if (j.status !== "running" && j.status !== "waiting") return j;
        if (!navigator.onLine) return { ...j, status: "waiting" as const, step: "Waiting for connection…" };
        const steps = SERVICES[j.destination].steps;
        const progress = Math.min(100, j.progress + 4 + Math.random() * 9);
        if (progress >= 100) {
          const done = { ...j, status: "done" as const, progress: 100, step: steps[steps.length - 1] };
          finished.push(done);
          return done;
        }
        const idx = Math.min(steps.length - 2, Math.floor((progress / 100) * (steps.length - 1)));
        return { ...j, status: "running" as const, progress, step: steps[idx] };
      });
      setJobs(next);
      for (const j of finished) {
        historyFromJob(j, "delivered");
        if (j.trigger === "scheduled") toast(`Scheduled export delivered · ${j.title}`, { kind: "info" });
        if (j.destination === "gdrive" || j.destination === "dropbox" || j.destination === "onedrive" || j.destination === "gsheets") {
          setData((d) => {
            const c = d.connections[j.destination];
            return c ? { ...d, connections: { ...d.connections, [j.destination]: { ...c, lastSyncAt: new Date().toISOString() } } } : d;
          });
        }
      }
    }, 280);
    return () => clearInterval(timer);
  }, [hasActive, historyFromJob, toast]);

  const dismissJob = useCallback((id: string) => setJobs((js) => js.filter((j) => j.id !== id)), []);
  const clearFinishedJobs = useCallback(() => setJobs((js) => js.filter((j) => j.status === "running" || j.status === "waiting")), []);

  /* ---------- connections & live sync ---------- */
  const connect = useCallback((id: DestinationId, account: string) => {
    setData((d) => ({
      ...d,
      connections: {
        ...d.connections,
        [id]: { account, connectedAt: new Date().toISOString(), liveSync: id === "gsheets", lastSyncAt: null },
      },
    }));
  }, []);

  const disconnect = useCallback((id: DestinationId) => {
    setData((d) => {
      const connections = { ...d.connections };
      delete connections[id];
      // Schedules that depended on this service are paused, not deleted.
      const schedules = d.schedules.map((s) => (s.destination === id ? { ...s, enabled: false } : s));
      return { ...d, connections, schedules };
    });
  }, []);

  const setLiveSync = useCallback((id: DestinationId, on: boolean) => {
    setData((d) => {
      const c = d.connections[id];
      return c ? { ...d, connections: { ...d.connections, [id]: { ...c, liveSync: on } } } : d;
    });
  }, []);

  // When expenses change, "push" them to live-synced services (simulated latency; waits while offline).
  const firstExpensesRun = useRef(true);
  useEffect(() => {
    if (isLoading || !ready) return;
    if (firstExpensesRun.current) {
      firstExpensesRun.current = false;
      return;
    }
    const live = (Object.entries(dataRef.current.connections) as [DestinationId, Connection][]).filter(([, c]) => c.liveSync);
    if (!live.length) return;
    setSyncing(true);
    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      if (!navigator.onLine) {
        window.addEventListener("online", finish, { once: true });
        return;
      }
      setSyncing(false);
      const now = new Date().toISOString();
      setData((d) => {
        const connections = { ...d.connections };
        for (const [id] of live) if (connections[id]) connections[id] = { ...connections[id]!, lastSyncAt: now };
        return { ...d, connections };
      });
    };
    const t = setTimeout(finish, 1400);
    return () => {
      cancelled = true;
      clearTimeout(t);
      window.removeEventListener("online", finish);
    };
  }, [expenses, isLoading, ready]);

  /* ---------- schedules ---------- */
  const saveSchedule = useCallback<CloudContextValue["saveSchedule"]>((input) => {
    setData((d) => {
      const nextRunAt = computeNextRun(input).toISOString();
      if (input.id) {
        return { ...d, schedules: d.schedules.map((s) => (s.id === input.id ? { ...s, ...input, id: s.id, nextRunAt } : s)) };
      }
      const s: Schedule = { ...input, id: generateId(), createdAt: new Date().toISOString(), lastRunAt: null, nextRunAt };
      return { ...d, schedules: [...d.schedules, s] };
    });
  }, []);

  const toggleSchedule = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      schedules: d.schedules.map((s) => (s.id === id ? { ...s, enabled: !s.enabled, nextRunAt: computeNextRun(s).toISOString() } : s)),
    }));
  }, []);

  const deleteSchedule = useCallback((id: string) => setData((d) => ({ ...d, schedules: d.schedules.filter((s) => s.id !== id) })), []);

  // Each occurrence (id + due time) runs at most once, even if effects fire twice.
  const ranOccurrences = useRef(new Set<string>());
  const runSchedule = useCallback(
    (s: Schedule, manual = false) => {
      if (!manual) {
        const key = `${s.id}@${s.nextRunAt}`;
        if (ranOccurrences.current.has(key)) return;
        ranOccurrences.current.add(key);
      }
      void startJob({
        templateId: s.templateId,
        periodId: s.periodId,
        destination: s.destination,
        target: s.target,
        trigger: "scheduled",
        title: s.name,
      });
      const now = new Date();
      setData((d) => ({
        ...d,
        schedules: d.schedules.map((x) =>
          x.id === s.id
            ? // A manual "Run now" doesn't move the regular schedule.
              { ...x, lastRunAt: now.toISOString(), nextRunAt: manual ? x.nextRunAt : computeNextRun(x, now).toISOString() }
            : x,
        ),
      }));
    },
    [startJob],
  );

  const runScheduleNow = useCallback(
    (id: string) => {
      const s = dataRef.current.schedules.find((x) => x.id === id);
      if (s) runSchedule(s, true);
    },
    [runSchedule],
  );

  // Scheduler tick: runs due schedules while the app is open (missed runs catch up once on next open).
  useEffect(() => {
    if (!ready || isLoading) return;
    const tick = () => {
      const now = Date.now();
      for (const s of dataRef.current.schedules) {
        if (s.enabled && new Date(s.nextRunAt).getTime() <= now) runSchedule(s);
      }
    };
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, [ready, isLoading, runSchedule]);

  /* ---------- shares ---------- */
  const addShare = useCallback((s: Omit<ShareRecord, "id" | "createdAt">) => {
    const rec: ShareRecord = { ...s, id: generateId(), createdAt: new Date().toISOString() };
    setData((d) => ({ ...d, shares: [rec, ...d.shares] }));
    return rec;
  }, []);
  const removeShare = useCallback((id: string) => setData((d) => ({ ...d, shares: d.shares.filter((s) => s.id !== id) })), []);
  const clearHistory = useCallback(() => setData((d) => ({ ...d, history: [] })), []);

  const value = useMemo<CloudContextValue>(
    () => ({
      ...data,
      ready,
      online,
      jobs,
      syncing,
      connect,
      disconnect,
      setLiveSync,
      startJob,
      dismissJob,
      clearFinishedJobs,
      recordHistory,
      clearHistory,
      saveSchedule,
      toggleSchedule,
      deleteSchedule,
      runScheduleNow,
      addShare,
      removeShare,
    }),
    [data, ready, online, jobs, syncing, connect, disconnect, setLiveSync, startJob, dismissJob, clearFinishedJobs, recordHistory, clearHistory, saveSchedule, toggleSchedule, deleteSchedule, runScheduleNow, addShare, removeShare],
  );

  return <CloudContext.Provider value={value}>{children}</CloudContext.Provider>;
}

export function useCloud(): CloudContextValue {
  const ctx = useContext(CloudContext);
  if (!ctx) throw new Error("useCloud must be used inside <CloudProvider>");
  return ctx;
}
