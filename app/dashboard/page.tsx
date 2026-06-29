import Link from "next/link";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import AppHeader from "@/app/_components/AppHeader";
import { setStatus } from "@/app/prospects/actions";

export const dynamic = "force-dynamic";

type Prospect = typeof prospects.$inferSelect;

type Status = Prospect["status"];

function transitions(status: Status): { to: Status; label: string; primary?: boolean }[] {
  switch (status) {
    case "benaderd": return [{ to: "audit_gestart", label: "Audit", primary: true }, { to: "afgewezen_koud", label: "✗" }];
    case "audit_gestart": return [{ to: "demo", label: "Demo", primary: true }, { to: "afgewezen_koud", label: "✗" }];
    case "demo": return [{ to: "klant", label: "Klant", primary: true }, { to: "afgewezen_koud", label: "✗" }];
    default: return [];
  }
}

const COLUMNS = [
  { key: "nieuw", label: "Nieuw", dot: "bg-slate-400", ring: "ring-slate-200" },
  { key: "benaderd", label: "Benaderd", dot: "bg-blue-500", ring: "ring-blue-200" },
  { key: "audit_gestart", label: "Audit gestart", dot: "bg-amber-500", ring: "ring-amber-200" },
  { key: "demo", label: "Demo", dot: "bg-violet-500", ring: "ring-violet-200" },
  { key: "klant", label: "Klant", dot: "bg-emerald-500", ring: "ring-emerald-200" },
] as const;

function tierClasses(t: string | null) {
  if (t === "A") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (t === "B") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (t === "C") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-slate-100 text-slate-500 ring-slate-200";
}

function Card({ p }: { p: Prospect }) {
  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug text-slate-900">{p.bedrijf}</h3>
        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tierClasses(p.tier)}`}>
          {p.tier ? `Tier ${p.tier}` : "—"}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
        {p.sector && (
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">{p.sector}</span>
        )}
        <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 font-medium capitalize text-indigo-600">{p.kanaal}</span>
        {typeof p.icpTotaal === "number" && (
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">ICP {p.icpTotaal}/25</span>
        )}
      </div>
      {p.haakje && (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{p.haakje}</p>
      )}
      {transitions(p.status).length > 0 && (
        <div className="mt-3 flex gap-1.5">
          {transitions(p.status).map((t) => (
            <form key={t.to} action={setStatus.bind(null, p.id, t.to)} className="contents">
              <button
                className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                  t.primary
                    ? "bg-slate-900 text-white hover:bg-slate-700"
                    : "bg-white text-slate-400 ring-1 ring-inset ring-slate-200 hover:text-slate-700"
                }`}
              >
                {t.label}
              </button>
            </form>
          ))}
        </div>
      )}
    </div>
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

export default async function Dashboard() {
  const rijen = await db.select().from(prospects);
  const per = (s: string) => rijen.filter((r) => r.status === s);
  const count = (s: string) => per(s).length;
  const inSequence = count("benaderd") + count("audit_gestart") + count("demo");

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pipeline</h1>
            <p className="mt-1 text-sm text-slate-500">
              {rijen.length} {rijen.length === 1 ? "prospect" : "prospects"} in beeld · live uit de database
            </p>
          </div>
          <Link
            href="/prospects/new"
            className="shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
          >
            + Nieuwe prospect
          </Link>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Totaal prospects" value={rijen.length} accent="text-slate-900" />
          <Stat label="In sequence" value={inSequence} accent="text-blue-600" />
          <Stat label="Demo's" value={count("demo")} accent="text-violet-600" />
          <Stat label="Klanten" value={count("klant")} accent="text-emerald-600" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {COLUMNS.map((c) => {
            const items = per(c.key);
            return (
              <section key={c.key} className="flex flex-col rounded-2xl bg-slate-100/60 p-3">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                  <h2 className="text-sm font-semibold text-slate-700">{c.label}</h2>
                  <span className={`ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-inset ${c.ring}`}>
                    {items.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {items.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">
                      Leeg
                    </p>
                  ) : (
                    items.map((p) => <Card key={p.id} p={p} />)
                  )}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-8">
          <Link
            href="/queue"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700"
          >
            Naar verzendwachtrij →
          </Link>
        </div>
      </main>
    </>
  );
}
