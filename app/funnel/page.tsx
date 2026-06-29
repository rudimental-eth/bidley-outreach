import { db } from "@/db";
import { prospects, conversions } from "@/db/schema";
import AppHeader from "@/app/_components/AppHeader";

export const dynamic = "force-dynamic";

const STAGES = [
  { key: "nieuw", label: "Nieuw", color: "bg-slate-400" },
  { key: "benaderd", label: "Benaderd", color: "bg-blue-500" },
  { key: "audit_gestart", label: "Audit gestart", color: "bg-amber-500" },
  { key: "demo", label: "Demo", color: "bg-violet-500" },
  { key: "klant", label: "Klant", color: "bg-emerald-500" },
] as const;

function pct(a: number, b: number) {
  if (b === 0) return "—";
  return `${Math.round((a / b) * 100)}%`;
}

export default async function Funnel() {
  const [rijen, convs] = await Promise.all([
    db.select().from(prospects),
    db.select().from(conversions),
  ]);
  const count = (s: string) => rijen.filter((r) => r.status === s).length;
  const max = Math.max(1, ...STAGES.map((s) => count(s.key)));
  const benaderd = count("benaderd") + count("audit_gestart") + count("demo") + count("klant");
  const audits = convs.filter((c) => c.type === "audit_gestart").length;
  const demos = convs.filter((c) => c.type === "demo_geboekt").length;
  const afgewezen = rijen.filter((r) => r.status === "afgewezen_koud").length;
  const optOut = rijen.filter((r) => r.status === "opt_out").length;

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Funnel</h1>
          <p className="mt-1 text-sm text-slate-500">Momentopname van de pipeline + conversiesignalen.</p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Ooit benaderd" value={benaderd} accent="text-blue-600" />
          <Stat label="Audits gestart" value={audits} accent="text-amber-600" />
          <Stat label="Demo's geboekt" value={demos} accent="text-violet-600" />
          <Stat label="Klanten" value={count("klant")} accent="text-emerald-600" />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Verdeling per fase</h2>
          <div className="space-y-3">
            {STAGES.map((s) => {
              const c = count(s.key);
              return (
                <div key={s.key} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm text-slate-600">{s.label}</span>
                  <div className="h-6 flex-1 overflow-hidden rounded-lg bg-slate-100">
                    <div className={`h-full ${s.color} transition-all`} style={{ width: `${(c / max) * 100}%` }} />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-700">{c}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Rate label="Benaderd → demo" value={pct(count("demo") + count("klant"), benaderd)} />
          <Rate label="Demo → klant" value={pct(count("klant"), count("demo") + count("klant"))} />
          <Rate label="Afgewezen / opt-out" value={`${afgewezen + optOut}`} />
        </div>
      </main>
    </>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`text-2xl font-bold tabular-nums ${accent}`}>{value}</div>
      <div className="mt-0.5 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}

function Rate({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xl font-bold tabular-nums text-slate-900">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-slate-500">{label}</div>
    </div>
  );
}
