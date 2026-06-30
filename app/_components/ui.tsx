import type { ReactNode } from "react";

// — Iconen (inline SVG, 1.5px stroke) —
type IconProps = { className?: string };
const base = "h-5 w-5";
export const Icons = {
  users: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={p.className ?? base}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11"/></svg>
  ),
  send: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={p.className ?? base}><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
  ),
  spark: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={p.className ?? base}><path d="M12 3v3m0 12v3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1M3 12h3m12 0h3M5.6 18.4l2.1-2.1m8.6-8.6 2.1-2.1"/></svg>
  ),
  trophy: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={p.className ?? base}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6m12 5h1.5a2.5 2.5 0 0 0 0-5H18M6 4h12v5a6 6 0 0 1-12 0Z"/><path d="M9 18h6m-3-4v4"/></svg>
  ),
  check: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={p.className ?? base}><path d="M20 6 9 17l-5-5"/></svg>
  ),
};

// — Badge —
const TONE: Record<string, string> = {
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};
export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: keyof typeof TONE }) {
  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${TONE[tone]}`}>
      {children}
    </span>
  );
}

export function tierTone(t: string | null): keyof typeof TONE {
  return t === "A" ? "emerald" : t === "B" ? "blue" : "slate";
}

// — Stat-kaart —
export function StatCard({ label, value, icon, accent }: {
  label: string; value: ReactNode; icon: ReactNode; accent: string;
}) {
  return (
    <div className="rise rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm ring-1 ring-black/[0.02]">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent}`}>{icon}</span>
        <div>
          <div className="text-xl font-bold leading-none tabular-nums text-slate-900">{value}</div>
          <div className="mt-1 text-xs font-medium text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

// — Paginakop —
export function PageHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// — Lege staat —
export function EmptyState({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) {
  return (
    <div className="rise rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">{emoji}</div>
      <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
      {children && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{children}</p>}
    </div>
  );
}
