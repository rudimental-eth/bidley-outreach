import { db } from "@/db";
import { prospects, conversions } from "@/db/schema";
import AppHeader from "@/app/_components/AppHeader";
import { PageHeader, StatCard, Icons } from "@/app/_components/ui";

export const dynamic = "force-dynamic";

const STAGES = [
  { key: "benaderd", label: "Benaderd", from: "from-blue-500", to: "to-blue-400" },
  { key: "audit_gestart", label: "Audit gestart", from: "from-amber-500", to: "to-amber-400" },
  { key: "demo", label: "Demo", from: "from-violet-500", to: "to-violet-400" },
  { key: "klant", label: "Klant", from: "from-emerald-500", to: "to-emerald-400" },
] as const;

function pct(a: number, b: number) {
  return b === 0 ? "—" : `${Math.round((a / b) * 100)}%`;
}

export default async function Funnel() {
  const [rijen, convs] = await Promise.all([
    db.select().from(prospects),
    db.select().from(conversions),
  ]);
  const count = (s: string) => rijen.filter((r) => r.status === s).length;
  // Cumulatief: wie demo is, was ook benaderd etc.
  const cum = {
    benaderd: count("benaderd") + count("audit_gestart") + count("demo") + count("klant"),
    audit_gestart: count("audit_gestart") + count("demo") + count("klant"),
    demo: count("demo") + count("klant"),
    klant: count("klant"),
  };
  const top = Math.max(1, cum.benaderd);
  const audits = convs.filter((c) => c.type === "audit_gestart").length;
  const demos = convs.filter((c) => c.type === "demo_geboekt").length;

  // Sectorverdeling (actieve + kandidaat)
  const sectorMap = new Map<string, number>();
  rijen.forEach((r) => { const s = r.sector?.trim(); if (s) sectorMap.set(s, (sectorMap.get(s) ?? 0) + 1); });
  const sectors = [...sectorMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const sectorMax = Math.max(1, ...sectors.map((s) => s[1]));

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <PageHeader title="Funnel" subtitle="Conversie door de pijplijn + waar je leads vandaan komen." />

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Ooit benaderd" value={cum.benaderd} accent="bg-blue-100 text-blue-700" icon={<Icons.send />} />
          <StatCard label="Audits gestart" value={audits} accent="bg-amber-100 text-amber-700" icon={<Icons.spark />} />
          <StatCard label="Demo's geboekt" value={demos} accent="bg-violet-100 text-violet-700" icon={<Icons.check className="h-5 w-5" />} />
          <StatCard label="Klanten" value={cum.klant} accent="bg-emerald-100 text-emerald-700" icon={<Icons.trophy />} />
        </div>

        <div className="rise rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
          <h2 className="mb-5 text-sm font-semibold text-slate-700">Conversietrechter</h2>
          <div className="flex flex-col items-center gap-2">
            {STAGES.map((s, i) => {
              const v = cum[s.key as keyof typeof cum];
              const width = 40 + (v / top) * 60; // 40%–100%
              const prev = i === 0 ? null : cum[STAGES[i - 1].key as keyof typeof cum];
              return (
                <div key={s.key} className="flex w-full flex-col items-center">
                  {prev !== null && (
                    <div className="my-0.5 text-[11px] font-medium text-slate-400">↓ {pct(v, prev)}</div>
                  )}
                  <div
                    className={`flex items-center justify-between rounded-xl bg-gradient-to-r ${s.from} ${s.to} px-4 py-3 text-white shadow-sm transition-all`}
                    style={{ width: `${width}%` }}
                  >
                    <span className="text-sm font-semibold">{s.label}</span>
                    <span className="text-lg font-bold tabular-nums">{v}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 rise rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Sectoren in de pijplijn</h2>
          {sectors.length === 0 ? (
            <p className="text-sm text-slate-400">Nog geen sectordata.</p>
          ) : (
            <div className="space-y-2.5">
              {sectors.map(([naam, n]) => (
                <div key={naam} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 truncate text-sm text-slate-600" title={naam}>{naam}</span>
                  <div className="h-5 flex-1 overflow-hidden rounded-lg bg-slate-100">
                    <div className="h-full rounded-lg bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${(n / sectorMax) * 100}%` }} />
                  </div>
                  <span className="w-7 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-700">{n}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
