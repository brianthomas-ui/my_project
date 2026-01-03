"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Dumbbell,
  Home,
  ClipboardList,
  History,
  BarChart3,
  Download,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Flame,
  Target,
  Calendar,
} from "lucide-react";

/**
 * Brian Strength Tracker — Personal (Phone-First)
 *
 * - Premium, minimal, mobile-first
 * - Stores locally (phone-only) with automatic analytics
 * - Logging is working sets only
 * - Scoreboard: Last / Previous / Change / Next Target / Warm-up plan
 */

// -----------------------------
// Minimal UI primitives (no external UI libs)
// -----------------------------

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Card({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm", className)}>
      {children}
    </div>
  );
}

function CardHeader({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("px-4 pt-4", className)}>{children}</div>;
}

function CardContent({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("px-4 pb-4", className)}>{children}</div>;
}

function CardTitle({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("text-base font-semibold", className)}>{children}</div>;
}

function CardDescription({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mt-1 text-sm text-[hsl(var(--muted-foreground))]", className)}>{children}</div>;
}

function Button({
  className = "",
  variant = "solid",
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "outline" }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition active:scale-[0.99]";
  const solid =
    "bg-[hsl(var(--primary))] text-[hsl(var(--bg))] shadow-sm hover:opacity-95";
  const outline =
    "border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--fg))] hover:bg-[hsl(var(--muted))]";
  return (
    <button className={cn(base, variant === "solid" ? solid : outline, className)} {...props}>
      {children}
    </button>
  );
}

function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-2xl border border-[hsl(var(--border))] bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--muted))]",
        className
      )}
      {...props}
    />
  );
}

function Label({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("text-xs font-medium text-[hsl(var(--muted-foreground))]", className)}>{children}</div>;
}

// -----------------------------
// Storage
// -----------------------------

const LS_KEY = "brian_strength_tracker_personal_v2";

function useLocalState<T>(key: string, initial: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw) as T;
    } catch {}
    return initial;
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, state]);

  return [state, setState] as const;
}

// -----------------------------
// Utils
// -----------------------------

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseISODate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`);
}

function daysBetween(a: string, b: string) {
  const ms = 24 * 60 * 60 * 1000;
  const da = parseISODate(a);
  const db = parseISODate(b);
  return Math.round((db.getTime() - da.getTime()) / ms);
}

function safeNum(x: any, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

function formatNum(n: any) {
  const v = safeNum(n, 0);
  const isInt = Math.abs(v - Math.round(v)) < 1e-9;
  return isInt ? `${Math.round(v)}` : `${v}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function roundToIncrement(value: number, inc: number) {
  const v = safeNum(value, 0);
  const i = safeNum(inc, 0);
  if (i <= 0) return v;
  return Math.round(v / i) * i;
}

function formatWeight(weight: any, unit: string) {
  return `${formatNum(weight)}${unit}`;
}

function compareByDateDesc(a: any, b: any) {
  return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
}

function stateLabel(dayKey: string) {
  if (dayKey === "upper1") return "Upper 1";
  if (dayKey === "lower1") return "Lower 1";
  return dayKey || "—";
}

// -----------------------------
// Program (Upper 1 + Lower 1 only, personal)
// -----------------------------

const PROGRAM = {
  days: {
    upper1: {
      key: "upper1",
      name: "Upper 1",
      subtitle: "Machines, low junk volume, cap 10 reps",
      order: [
        "fly_machine",
        "high_row_cs",
        "lat_pulldown",
        "shoulder_press_u1",
        "pushdown_3pulley",
        "preacher_curl_machine",
      ],
    },
    lower1: {
      key: "lower1",
      name: "Lower 1",
      subtitle: "Leg press + single-leg curl/ext + calves",
      order: [
        "leg_press_angled",
        "leg_curl_single_alt",
        "leg_ext_single_alt",
        "calf_press_leg_press",
      ],
    },
  },
  exercises: {
    fly_machine: {
      id: "fly_machine",
      name: "Chest Fly Machine",
      sets: 2,
      repMin: 5,
      repMax: 10,
      targetRIR: 2,
      type: "isolation",
      unit: "lb",
      increment: 5,
    },
    high_row_cs: {
      id: "high_row_cs",
      name: "Chest-supported seated high row (horizontal)",
      sets: 2,
      repMin: 5,
      repMax: 10,
      targetRIR: 1,
      type: "compound",
      unit: "kg",
      increment: 2.5,
    },
    lat_pulldown: {
      id: "lat_pulldown",
      name: "Lat Pulldown Machine",
      sets: 2,
      repMin: 5,
      repMax: 10,
      targetRIR: 1,
      type: "compound",
      unit: "kg",
      increment: 2.5,
    },
    shoulder_press_u1: {
      id: "shoulder_press_u1",
      name: "Shoulder Press Machine",
      sets: 1,
      repMin: 5,
      repMax: 10,
      targetRIR: 1,
      type: "compound",
      unit: "kg",
      increment: 2.5,
    },
    pushdown_3pulley: {
      id: "pushdown_3pulley",
      name: "Tricep Rope Pushdown (3-pulley)",
      sets: 1,
      repMin: 5,
      repMax: 10,
      targetRIR: 2,
      type: "isolation",
      unit: "kg",
      increment: 2.5,
    },
    preacher_curl_machine: {
      id: "preacher_curl_machine",
      name: "Preacher Curl Machine",
      sets: 1,
      repMin: 5,
      repMax: 10,
      targetRIR: 2,
      type: "isolation",
      unit: "kg",
      increment: 2.5,
    },

    leg_press_angled: {
      id: "leg_press_angled",
      name: "Angled Leg Press",
      sets: 2,
      repMin: 4,
      repMax: 8,
      targetRIR: 2,
      type: "compound",
      unit: "kg",
      increment: 10,
    },
    leg_curl_single_alt: {
      id: "leg_curl_single_alt",
      name: "Single-leg seated leg curl (alternating)",
      sets: 2,
      repMin: 6,
      repMax: 10,
      targetRIR: 2,
      type: "isolation",
      unit: "kg",
      increment: 2.5,
      perLeg: true,
    },
    leg_ext_single_alt: {
      id: "leg_ext_single_alt",
      name: "Single-leg leg extension (alternating)",
      sets: 1,
      repMin: 6,
      repMax: 10,
      targetRIR: 2,
      type: "isolation",
      unit: "kg",
      increment: 2.5,
      perLeg: true,
    },
    calf_press_leg_press: {
      id: "calf_press_leg_press",
      name: "Calf press on leg press",
      sets: 2,
      repMin: 6,
      repMax: 10,
      targetRIR: 1,
      type: "isolation",
      unit: "kg",
      increment: 10,
    },
  },
} as const;

// -----------------------------
// Warm-ups (your PAPE algorithm)
// -----------------------------

function warmupPlan(exercise: any, workingWeight: number) {
  const w = safeNum(workingWeight, 0);
  if (w <= 0) return [];
  const inc =
    safeNum(exercise.increment, 0) || (exercise.unit === "lb" ? 5 : 2.5);

  if (exercise.type === "compound") {
    const s1 = roundToIncrement(w * 0.5, inc);
    const s2 = roundToIncrement(w * 0.7, inc);
    const s3 = roundToIncrement(w * 0.85, inc);
    const s4 = roundToIncrement(w * 0.93, inc);

    const sets = [
      { weight: Math.max(inc, s1), reps: "8", note: "~50%" },
      { weight: Math.max(inc, s2), reps: "4–5", note: "~70%" },
      { weight: Math.max(inc, s3), reps: "1–2", note: "~85%" },
      {
        weight: Math.max(inc, s4),
        reps: "1",
        note: "Optional primer ~92–95% (only if snappy)",
      },
    ];

    return sets.filter(
      (s, idx, arr) => idx === 0 || s.weight > (arr[idx - 1] as any).weight
    );
  }

  const s1 = roundToIncrement(w * 0.55, inc);
  const s2 = roundToIncrement(w * 0.8, inc);
  const sets = [
    { weight: Math.max(inc, s1), reps: "8–10", note: "~50–60%" },
    { weight: Math.max(inc, s2), reps: "3–5", note: "~75–85%" },
  ];
  return sets.filter(
    (s, idx, arr) => idx === 0 || s.weight > (arr[idx - 1] as any).weight
  );
}

function restGuidance(type: string) {
  return type === "compound" ? "2–3 min before top set" : "60–90 sec before top set";
}

// -----------------------------
// Progression (aggressive double progression)
// -----------------------------

function nextTargetInstruction(exercise: any, lastEntry: any) {
  const repMin = exercise.repMin;
  const repMax = exercise.repMax;
  const tRIR = exercise.targetRIR;
  const inc =
    safeNum(exercise.increment, 0) || (exercise.unit === "lb" ? 5 : 2.5);

  if (!lastEntry || !Array.isArray(lastEntry.sets) || lastEntry.sets.length === 0) {
    return {
      mode: "baseline",
      nextWeight: 0,
      instruction: `Baseline: choose a load that lands ~${Math.min(repMin + 1, repMax)} reps @RIR ${tRIR}.`,
    };
  }

  const primary = lastEntry.sets[0]; // set 1 drives progression
  const w = safeNum(primary.weight, 0);
  const r = safeNum(primary.reps, 0);
  const rir = safeNum(primary.rir, tRIR);

  const jointy = exercise.type === "isolation";
  if (jointy && rir <= Math.max(0, tRIR - 2)) {
    const reduced = roundToIncrement(Math.max(inc, w - inc), inc);
    return {
      mode: "reduce",
      nextWeight: reduced,
      instruction: `Reduce slightly: ${formatWeight(reduced, exercise.unit)} — aim +1 rep while keeping ~RIR ${tRIR}.`,
    };
  }

  const nearTarget = rir >= tRIR - 1;
  if (r >= repMax && nearTarget) {
    const bumped = roundToIncrement(w + inc, inc);
    return {
      mode: "add_weight",
      nextWeight: bumped,
      instruction: `Add ${formatNum(inc)}${exercise.unit}: ${formatWeight(bumped, exercise.unit)} — aim ${repMin}–${Math.min(repMin + 1, repMax)} reps @RIR ${tRIR}.`,
    };
  }

  const nextReps = clamp(r + 1, repMin, repMax);
  const lane = exercise.type === "compound" ? `${Math.max(0, tRIR - 1)}–${tRIR}` : `${Math.max(1, tRIR)}–${tRIR}`;
  return {
    mode: "add_rep",
    nextWeight: w,
    instruction: `Same weight: ${formatWeight(w, exercise.unit)} — +1 rep (aim ${nextReps}), keep RIR ~${lane}.`,
  };
}

// -----------------------------
// Scoreboard + analytics
// -----------------------------

function findLastTwoEntries(sessions: any[], exerciseId: string) {
  const sorted = [...sessions].sort(compareByDateDesc);
  const found: any[] = [];
  for (const s of sorted) {
    const item = s.items?.[exerciseId];
    if (item && Array.isArray(item.sets) && item.sets.length > 0) {
      found.push({ session: s, entry: item });
      if (found.length === 2) break;
    }
  }
  return { last: found[0] || null, prev: found[1] || null };
}

function describeChange(last: any, prev: any, unit: string) {
  if (!last || !prev) return "Baseline";
  const l = last.entry.sets?.[0];
  const p = prev.entry.sets?.[0];
  if (!l || !p) return "—";

  const dw = safeNum(l.weight, 0) - safeNum(p.weight, 0);
  const dr = safeNum(l.reps, 0) - safeNum(p.reps, 0);
  const dRIR = safeNum(l.rir, 0) - safeNum(p.rir, 0);

  const parts: string[] = [];
  if (Math.abs(dw) > 1e-9) parts.push(`${dw > 0 ? "+" : ""}${formatNum(dw)}${unit}`);
  if (dr !== 0) parts.push(`${dr > 0 ? "+" : ""}${dr} rep${Math.abs(dr) === 1 ? "" : "s"}`);
  if (Math.abs(dRIR) > 1e-9) parts.push(`${dRIR > 0 ? "+" : ""}${formatNum(dRIR)} RIR`);

  return parts.length ? parts.join(" • ") : "Same";
}

function buildScoreboard(state: any) {
  const ids = Object.keys(PROGRAM.exercises) as string[];
  const out: any[] = [];

  for (const id of ids) {
    const ex: any = (PROGRAM.exercises as any)[id];
    const { last, prev } = findLastTwoEntries(state.sessions || [], id);

    const lastText = last
      ? `${formatWeight(last.entry.sets[0].weight, ex.unit)} × ${last.entry.sets[0].reps} @RIR ${formatNum(last.entry.sets[0].rir)} • ${last.session.date}`
      : "—";

    const prevText = prev
      ? `${formatWeight(prev.entry.sets[0].weight, ex.unit)} × ${prev.entry.sets[0].reps} @RIR ${formatNum(prev.entry.sets[0].rir)} • ${prev.session.date}`
      : "—";

    const change = describeChange(last, prev, ex.unit);
    const target = nextTargetInstruction(ex, last?.entry || null);
    const workingForWarmup = target.nextWeight || last?.entry?.sets?.[0]?.weight || 0;
    const warmups = warmupPlan(ex, workingForWarmup);

    out.push({ id, ex, last, prev, lastText, prevText, change, target, warmups });
  }

  const order = [...PROGRAM.days.upper1.order, ...PROGRAM.days.lower1.order];
  const index = new Map(order.map((x, i) => [x, i]));
  out.sort((a, b) => (index.get(a.id) ?? 999) - (index.get(b.id) ?? 999));

  return out;
}

function computeAnalytics(state: any) {
  const sessions = [...(state.sessions || [])].sort(compareByDateDesc);
  const total = sessions.length;
  const last = sessions[0]?.date || null;
  const today = todayISO();
  const sinceLast = last ? Math.max(0, daysBetween(last, today)) : null;

  const last7 = sessions.filter((s) => {
    if (!s?.date) return false;
    const diff = daysBetween(s.date, today);
    return diff >= 0 && diff <= 6;
  }).length;

  const streak = (() => {
    if (!sessions.length) return 0;
    const uniqueDays = Array.from(new Set(sessions.map((s) => s.date))).sort().reverse();
    let count = 1;
    for (let i = 0; i < uniqueDays.length - 1; i++) {
      const a = uniqueDays[i];
      const b = uniqueDays[i + 1];
      if (daysBetween(b, a) === 1) count++;
      else break;
    }
    return count;
  })();

  return { total, last, sinceLast, last7, streak };
}

// -----------------------------
// Default state (your baselines)
// -----------------------------

function makeDefaultState() {
  const baseUpper = {
    id: uid("sess"),
    date: "2026-01-02",
    dayKey: "upper1",
    notes: "Baseline (from chat)",
    items: {
      fly_machine: { exerciseId: "fly_machine", sets: [{ weight: 118, reps: 6, rir: 2, note: "" }] },
      high_row_cs: { exerciseId: "high_row_cs", sets: [{ weight: 80, reps: 5, rir: 1, note: "" }] },
      shoulder_press_u1: { exerciseId: "shoulder_press_u1", sets: [{ weight: 40, reps: 5, rir: 1, note: "" }] },
      pushdown_3pulley: { exerciseId: "pushdown_3pulley", sets: [{ weight: 50, reps: 5, rir: 2, note: "3-pulley" }] },
    },
  };

  const baseLower = {
    id: uid("sess"),
    date: "2026-01-02",
    dayKey: "lower1",
    notes: "Baseline (from chat)",
    items: {
      leg_press_angled: {
        exerciseId: "leg_press_angled",
        sets: [
          { weight: 160, reps: 5, rir: 2.5, note: "set 1" },
          { weight: 160, reps: 7, rir: 1, note: "set 2" },
        ],
      },
      calf_press_leg_press: {
        exerciseId: "calf_press_leg_press",
        sets: [{ weight: 160, reps: 8, rir: 1.5, note: "only 1 working set that day" }],
      },
    },
  };

  return {
    version: 2,
    profile: { name: "Brian", device: "phone-only" },
    sessions: [baseUpper, baseLower],
  };
}

// -----------------------------
// UI bits
// -----------------------------

function Chip({ icon: Icon, children }: { icon?: any; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.6] px-2.5 py-1 text-xs text-[hsl(var(--muted-foreground))] shadow-sm">
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      {children}
    </span>
  );
}

function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-4 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-2xl font-semibold tracking-tight">{title}</div>
          {subtitle ? <div className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{subtitle}</div> : null}
        </div>
        <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.6] p-2 shadow-sm">
          <Dumbbell className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function BottomNav({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  const Item = ({ id, icon: Icon, label }: any) => (
    <button
      onClick={() => setTab(id)}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-1 py-2 text-xs transition",
        tab === id ? "text-[hsl(var(--fg))]" : "text-[hsl(var(--muted-foreground))]"
      )}
    >
      <div
        className={cn(
          "rounded-2xl border border-[hsl(var(--border))] px-3 py-1.5",
          tab === id ? "bg-[hsl(var(--bg))] shadow-sm" : "bg-transparent"
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      {label}
    </button>
  );

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md px-4 pb-4">
      <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.8] p-2 shadow-lg backdrop-blur">
        <div className="grid grid-cols-5">
          <Item id="home" icon={Home} label="Home" />
          <Item id="score" icon={Target} label="Score" />
          <Item id="log" icon={ClipboardList} label="Log" />
          <Item id="history" icon={History} label="History" />
          <Item id="insights" icon={BarChart3} label="Insights" />
        </div>
      </div>
    </div>
  );
}

function PremiumCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={cn("border border-[hsl(var(--border))] bg-[hsl(var(--card))/0.6] backdrop-blur", className)}>
      {children}
    </Card>
  );
}

function WarmupBlock({ ex, warmups, workingWeight }: any) {
  return (
    <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.5] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xs text-[hsl(var(--muted-foreground))]">Warm-ups (PAPE)</div>
          <div className="mt-0.5 text-sm font-medium">Rest: {restGuidance(ex.type)}</div>
        </div>
        <Chip icon={Dumbbell}>Working: {workingWeight ? formatWeight(workingWeight, ex.unit) : "—"}</Chip>
      </div>
      <div className="mt-2 grid grid-cols-1 gap-2">
        {warmups.length ? (
          warmups.map((s: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.7] px-3 py-2">
              <div className="text-sm font-semibold">{formatWeight(s.weight, ex.unit)}</div>
              <div className="text-sm">× {s.reps}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">{s.note}</div>
            </div>
          ))
        ) : (
          <div className="text-sm text-[hsl(var(--muted-foreground))]">Warm-ups appear once a working weight exists.</div>
        )}
      </div>
    </div>
  );
}

// -----------------------------
// Screens
// -----------------------------

function HomeScreen({ analytics, lastSession, nextUp }: any) {
  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <PremiumCard>
        <CardHeader className="pb-2">
          <CardTitle>Today’s focus</CardTitle>
          <CardDescription>Open Log, hit the targets, leave the gym with receipts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.6] p-3">
              <div className="text-xs text-[hsl(var(--muted-foreground))]">Sessions (7d)</div>
              <div className="mt-1 text-2xl font-semibold">{analytics.last7}</div>
            </div>
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.6] p-3">
              <div className="text-xs text-[hsl(var(--muted-foreground))]">Streak</div>
              <div className="mt-1 flex items-center gap-2">
                <div className="text-2xl font-semibold">{analytics.streak}</div>
                <Flame className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.6] p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs text-[hsl(var(--muted-foreground))]">Last session</div>
                <div className="mt-0.5 text-sm font-semibold">
                  {lastSession ? `${lastSession.date} • ${stateLabel(lastSession.dayKey)}` : "—"}
                </div>
                <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                  {analytics.sinceLast === null ? "Log your next session to start." : `${analytics.sinceLast} day(s) ago`}
                </div>
              </div>
              <Chip icon={Calendar}>{analytics.total} total</Chip>
            </div>
          </div>

          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.6] p-3">
            <div className="text-xs text-[hsl(var(--muted-foreground))]">Next up</div>
            <div className="mt-1 text-sm font-semibold">{nextUp}</div>
            <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
              Score has your exact warm-ups and next targets.
            </div>
          </div>
        </CardContent>
      </PremiumCard>

      <PremiumCard>
        <CardHeader className="pb-2">
          <CardTitle>Operating rules</CardTitle>
          <CardDescription>Rep cap ≤10. Add reps first, then add weight.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Chip icon={Target}>Aggressive progression</Chip>
          <Chip icon={Dumbbell}>Working sets only</Chip>
          <Chip icon={ChevronRight}>Set 1 drives progress</Chip>
        </CardContent>
      </PremiumCard>
    </div>
  );
}

function ScoreboardScreen({ scoreboard }: any) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <PremiumCard>
        <CardHeader className="pb-2">
          <CardTitle>Scoreboard</CardTitle>
          <CardDescription>Tap an exercise for warm-ups and details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Chip icon={Target}>Targets are exact</Chip>
            <Chip icon={Flame}>Push when form is clean</Chip>
            <Chip icon={Dumbbell}>PAPE warm-ups</Chip>
          </div>

          <div className="space-y-2">
            {scoreboard.map((row: any) => {
              const isOpen = openId === row.id;
              const ex = row.ex;
              const working = row.target.nextWeight || row.last?.entry?.sets?.[0]?.weight || 0;

              return (
                <div key={row.id} className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.5] p-3">
                  <button
                    className="flex w-full items-start justify-between gap-3 text-left"
                    onClick={() => setOpenId(isOpen ? null : row.id)}
                  >
                    <div>
                      <div className="text-sm font-semibold">{ex.name}</div>
                      <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                        {ex.sets} set{ex.sets === 1 ? "" : "s"} • {ex.repMin}–{ex.repMax}
                        {ex.perLeg ? "/leg" : ""} • target RIR {ex.targetRIR}
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="text-[hsl(var(--muted-foreground))]">Next:</span>{" "}
                        <span className="font-medium">{row.target.instruction}</span>
                      </div>
                      <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Last: {row.lastText}</div>
                    </div>
                    <div className="pt-1">{isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 space-y-3">
                          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.6] p-3">
                            <div className="text-xs text-[hsl(var(--muted-foreground))]">Previous</div>
                            <div className="mt-0.5 text-sm font-medium">{row.prevText}</div>
                            <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Change: {row.change}</div>
                          </div>
                          <WarmupBlock ex={ex} warmups={row.warmups} workingWeight={working} />
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.6] p-3 text-xs text-[hsl(var(--muted-foreground))]">
            Tip: For 2-set movements, set 1 is your performance set. Set 2 can be a repeat/back-off.
          </div>
        </CardContent>
      </PremiumCard>
    </div>
  );
}

function makeEmptyEntry(exerciseId: string, setsCount: number) {
  return {
    exerciseId,
    sets: Array.from({ length: setsCount }).map(() => ({ weight: "", reps: "", rir: "", note: "" })),
  };
}

function LogScreen({ state, setState, scoreboard }: any) {
  const [dayKey, setDayKey] = useState<"upper1" | "lower1">("upper1");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const day: any = (PROGRAM.days as any)[dayKey];

  const initialForm = useMemo(() => {
    const obj: any = {};
    for (const exId of day.order) {
      const ex: any = (PROGRAM.exercises as any)[exId];
      obj[exId] = makeEmptyEntry(exId, ex.sets);

      const row = scoreboard.find((r: any) => r.id === exId);
      const w = row?.target?.nextWeight || row?.last?.entry?.sets?.[0]?.weight || "";
      if (w) obj[exId].sets[0].weight = w;
    }
    return obj;
  }, [dayKey, scoreboard, day.order]);

  const [form, setForm] = useState<any>(initialForm);

  useEffect(() => {
    setForm(initialForm);
    setExpanded(null);
  }, [initialForm]);

  function updateSet(exId: string, setIdx: number, field: string, value: string) {
    setForm((prev: any) => {
      const next = { ...prev };
      const entry = { ...next[exId] };
      const sets = entry.sets.map((s: any, i: number) => (i === setIdx ? { ...s, [field]: value } : s));
      entry.sets = sets;
      next[exId] = entry;
      return next;
    });
  }

  function saveSession() {
    const items: any = {};
    for (const exId of day.order) {
      const entry = form[exId];
      const sets = (entry?.sets || [])
        .map((s: any) => ({
          weight: safeNum(s.weight, 0),
          reps: safeNum(s.reps, 0),
          rir: safeNum(s.rir, 0),
          note: String(s.note || "").trim(),
        }))
        .filter((s: any) => s.weight > 0 && s.reps > 0);

      if (sets.length) items[exId] = { exerciseId: exId, sets };
    }

    if (Object.keys(items).length === 0) return;

    const session = { id: uid("sess"), date, dayKey, notes: notes.trim(), items };

    setState((prev: any) => {
      const existingIdx = (prev.sessions || []).findIndex((s: any) => s.date === date && s.dayKey === dayKey);
      const sessions = [...(prev.sessions || [])];
      if (existingIdx >= 0) sessions[existingIdx] = session;
      else sessions.unshift(session);
      return { ...prev, sessions };
    });

    setNotes("");
  }

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <PremiumCard>
        <CardHeader className="pb-2">
          <CardTitle>Log workout</CardTitle>
          <CardDescription>Working sets only. Warm-ups are shown per exercise.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setDayKey("upper1")}
              className={cn(
                "rounded-3xl border border-[hsl(var(--border))] p-3 text-left",
                dayKey === "upper1" ? "bg-[hsl(var(--bg))/0.7] shadow-sm" : "bg-transparent"
              )}
            >
              <div className="text-sm font-semibold">Upper 1</div>
              <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{PROGRAM.days.upper1.subtitle}</div>
            </button>
            <button
              onClick={() => setDayKey("lower1")}
              className={cn(
                "rounded-3xl border border-[hsl(var(--border))] p-3 text-left",
                dayKey === "lower1" ? "bg-[hsl(var(--bg))/0.7] shadow-sm" : "bg-transparent"
              )}
            >
              <div className="text-sm font-semibold">Lower 1</div>
              <div className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{PROGRAM.days.lower1.subtitle}</div>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input className="mt-1" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="sleep, joints, etc" />
            </div>
          </div>

          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.6] p-3 text-xs text-[hsl(var(--muted-foreground))]">
            Fast rule: enter set 1 first. If it beats last time cleanly, we push next time.
          </div>

          <div className="space-y-2">
            {day.order.map((exId: string) => {
              const ex: any = (PROGRAM.exercises as any)[exId];
              const row = scoreboard.find((r: any) => r.id === exId);
              const isOpen = expanded === exId;
              const plannedW =
                safeNum(form[exId]?.sets?.[0]?.weight, 0) ||
                safeNum(row?.target?.nextWeight, 0) ||
                safeNum(row?.last?.entry?.sets?.[0]?.weight, 0);
              const wu = warmupPlan(ex, plannedW);

              return (
                <div key={exId} className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.5] p-3">
                  <button className="flex w-full items-start justify-between gap-3 text-left" onClick={() => setExpanded(isOpen ? null : exId)}>
                    <div>
                      <div className="text-sm font-semibold">{ex.name}</div>
                      <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
                        {ex.sets} set{ex.sets === 1 ? "" : "s"} • {ex.repMin}–{ex.repMax}
                        {ex.perLeg ? "/leg" : ""} • target RIR {ex.targetRIR}
                      </div>
                      <div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Next: {row?.target?.instruction || "—"}</div>
                    </div>
                    <div className="pt-1">{isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen ? (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <div className="mt-3 space-y-3">
                          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.6] p-3">
                            <div className="text-xs text-[hsl(var(--muted-foreground))]">Last logged</div>
                            <div className="mt-1 text-sm font-medium">{row?.lastText || "—"}</div>
                          </div>

                          <WarmupBlock ex={ex} warmups={wu} workingWeight={plannedW || 0} />

                          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.6] p-3">
                            <div className="text-sm font-semibold">Working sets (log these)</div>
                            <div className="mt-2 space-y-3">
                              {Array.from({ length: ex.sets }).map((_, setIdx) => (
                                <div key={setIdx} className="grid grid-cols-12 gap-2">
                                  <div className="col-span-12 flex items-center justify-between">
                                    <Chip icon={Target}>Set {setIdx + 1}</Chip>
                                    <Chip icon={Dumbbell}>
                                      Target: {ex.repMin}–{ex.repMax}{ex.perLeg ? "/leg" : ""} @RIR {ex.targetRIR}
                                    </Chip>
                                  </div>

                                  <div className="col-span-5">
                                    <Label>Weight ({ex.unit})</Label>
                                    <Input
                                      className="mt-1"
                                      value={form[exId]?.sets?.[setIdx]?.weight ?? ""}
                                      onChange={(e) => updateSet(exId, setIdx, "weight", e.target.value)}
                                      placeholder={ex.unit === "lb" ? "118" : "80"}
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <Label>Reps</Label>
                                    <Input
                                      className="mt-1"
                                      value={form[exId]?.sets?.[setIdx]?.reps ?? ""}
                                      onChange={(e) => updateSet(exId, setIdx, "reps", e.target.value)}
                                      placeholder={`≤${ex.repMax}`}
                                    />
                                  </div>
                                  <div className="col-span-4">
                                    <Label>RIR</Label>
                                    <Input
                                      className="mt-1"
                                      value={form[exId]?.sets?.[setIdx]?.rir ?? ""}
                                      onChange={(e) => updateSet(exId, setIdx, "rir", e.target.value)}
                                      placeholder={`${ex.targetRIR}`}
                                    />
                                  </div>

                                  <div className="col-span-12">
                                    <Label>Notes (optional)</Label>
                                    <Input
                                      className="mt-1"
                                      value={form[exId]?.sets?.[setIdx]?.note ?? ""}
                                      onChange={(e) => updateSet(exId, setIdx, "note", e.target.value)}
                                      placeholder={setIdx === 0 ? "form/ROM/pain?" : "back-off notes"}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                            {ex.perLeg ? <div className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Per-leg: log reps per leg.</div> : null}
                          </div>
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <Button onClick={saveSession} className="h-12 w-full text-base">
            Save session
          </Button>

          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.6] p-3 text-xs text-[hsl(var(--muted-foreground))]">
            Phone-only storage: your data stays on this device (local). Export exists under Insights if you ever change phones.
          </div>
        </CardContent>
      </PremiumCard>
    </div>
  );
}

function HistoryScreen({ state }: any) {
  const sessions = useMemo(() => [...(state.sessions || [])].sort(compareByDateDesc), [state.sessions]);

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <PremiumCard>
        <CardHeader className="pb-2">
          <CardTitle>History</CardTitle>
          <CardDescription>Your saved sessions (working sets only).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length ? (
            sessions.map((s: any) => (
              <div key={s.id} className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.5] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold">{s.date}</div>
                    <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{stateLabel(s.dayKey)}</div>
                  </div>
                  {s.notes ? <Chip icon={ChevronRight}>{s.notes}</Chip> : null}
                </div>
                <div className="mt-3 space-y-2">
                  {Object.values(s.items || {}).map((it: any) => {
                    const ex: any = (PROGRAM.exercises as any)[it.exerciseId];
                    return (
                      <div key={it.exerciseId} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.6] p-3">
                        <div className="text-sm font-semibold">{ex?.name || it.exerciseId}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(it.sets || []).map((set: any, idx: number) => (
                            <Chip key={idx} icon={Dumbbell}>
                              S{idx + 1}: {formatWeight(set.weight, ex?.unit || "")} × {set.reps} @RIR {formatNum(set.rir)}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-[hsl(var(--muted-foreground))]">No sessions yet.</div>
          )}
        </CardContent>
      </PremiumCard>
    </div>
  );
}

function ExerciseTrend({ state, exerciseId }: any) {
  const ex: any = (PROGRAM.exercises as any)[exerciseId];

  const data = useMemo(() => {
    const sorted = [...(state.sessions || [])].sort((a, b) => (a.date < b.date ? -1 : 1));
    const points: any[] = [];
    for (const s of sorted) {
      const item = s.items?.[exerciseId];
      if (!item || !item.sets?.length) continue;
      const p = item.sets[0];
      points.push({ date: s.date, reps: safeNum(p.reps, 0), weight: safeNum(p.weight, 0) });
    }
    return points;
  }, [state.sessions, exerciseId]);

  if (!data.length) return null;

  return (
    <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.5] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{ex.name}</div>
          <div className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">Trend (set 1): reps + weight</div>
        </div>
        <Chip icon={BarChart3}>
          {ex.repMin}–{ex.repMax}{ex.perLeg ? "/leg" : ""}
        </Chip>
      </div>
      <div className="mt-3 h-52 w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.6] p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="reps" tick={{ fontSize: 10 }} domain={[0, "dataMax + 2"]} />
            <YAxis yAxisId="weight" orientation="right" tick={{ fontSize: 10 }} domain={[0, "dataMax + 10"]} />
            <Tooltip
              formatter={(value: any, name: any) => {
                if (name === "reps") return [value, "reps"];
                if (name === "weight") return [`${value}${ex.unit}`, `weight (${ex.unit})`];
                return [value, name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line yAxisId="reps" type="monotone" dataKey="reps" stroke={`hsl(var(--primary))`} strokeWidth={2} dot name="reps" />
            <Line yAxisId="weight" type="monotone" dataKey="weight" stroke={`hsl(var(--muted-foreground))`} strokeWidth={2} dot name={`weight (${ex.unit})`} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function InsightsScreen({ state, analytics }: any) {
  const keyExercises = ["leg_press_angled", "high_row_cs", "fly_machine", "shoulder_press_u1"];

  return (
    <div className="space-y-4 px-4 pb-28 pt-4">
      <PremiumCard>
        <CardHeader className="pb-2">
          <CardTitle>Insights</CardTitle>
          <CardDescription>Simple analytics (phone-only). No cloud needed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.6] p-3">
              <div className="text-xs text-[hsl(var(--muted-foreground))]">Total sessions</div>
              <div className="mt-1 text-2xl font-semibold">{analytics.total}</div>
            </div>
            <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.6] p-3">
              <div className="text-xs text-[hsl(var(--muted-foreground))]">Last 7 days</div>
              <div className="mt-1 text-2xl font-semibold">{analytics.last7}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.6] p-3 text-xs text-[hsl(var(--muted-foreground))]">
            As you log more sessions, these trends become meaningful. Everything updates instantly on-device.
          </div>

          <div className="space-y-2">
            {keyExercises.map((id) => (
              <ExerciseTrend key={id} state={state} exerciseId={id} />
            ))}
          </div>
        </CardContent>
      </PremiumCard>

      <PremiumCard>
        <CardHeader className="pb-2">
          <CardTitle>Backup</CardTitle>
          <CardDescription>Only needed if you ever change phones.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="h-12 w-full"
            onClick={() => {
              const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `brian_strength_${todayISO()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-4 w-4" /> Export JSON
          </Button>

          <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))/0.6] p-3 text-xs text-[hsl(var(--muted-foreground))]">
            You said phone-only. This export is just a safety net.
          </div>
        </CardContent>
      </PremiumCard>
    </div>
  );
}

// -----------------------------
// Main
// -----------------------------

export default function BrianStrengthPWA() {
  const [state, setState] = useLocalState(LS_KEY, makeDefaultState());
  const scoreboard = useMemo(() => buildScoreboard(state), [state]);
  const analytics = useMemo(() => computeAnalytics(state), [state]);
  const sessions = useMemo(() => [...(state.sessions || [])].sort(compareByDateDesc), [state.sessions]);

  const lastSession = sessions[0] || null;
  const nextUp = lastSession?.dayKey === "upper1" ? "Lower 1" : "Upper 1";

  const [tab, setTab] = useState("home");

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[hsl(var(--muted))]/40 via-[hsl(var(--bg))] to-[hsl(var(--bg))] text-[hsl(var(--fg))]">
      <div className="mx-auto w-full max-w-md">
        <AppHeader title="Brian Strength" subtitle="Personal tracker • phone-first • auto coaching" />

        <AnimatePresence mode="wait" initial={false}>
          {tab === "home" ? (
            <motion.div key="home" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <HomeScreen analytics={analytics} lastSession={lastSession} nextUp={nextUp} />
            </motion.div>
          ) : null}

          {tab === "score" ? (
            <motion.div key="score" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <ScoreboardScreen scoreboard={scoreboard} />
            </motion.div>
          ) : null}

          {tab === "log" ? (
            <motion.div key="log" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <LogScreen state={state} setState={setState} scoreboard={scoreboard} />
            </motion.div>
          ) : null}

          {tab === "history" ? (
            <motion.div key="history" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <HistoryScreen state={state} />
            </motion.div>
          ) : null}

          {tab === "insights" ? (
            <motion.div key="insights" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <InsightsScreen state={state} analytics={analytics} />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <BottomNav tab={tab} setTab={setTab} />
      </div>
    </div>
  );
}
