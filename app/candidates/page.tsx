import { eq } from "drizzle-orm";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import AppHeader from "@/app/_components/AppHeader";
import { setStatus } from "../prospects/actions";

export const dynamic = "force-dynamic";

export default async function Candidates() {
  const rijen = await db.select().from(prospects).where(eq(prospects.status, "kandidaat"));

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Kandidaten</h1>
          <p className="mt-1 text-sm text-slate-500">
            Door sourcing voorgestelde prospects. Keur goed om ze in de pipeline te zetten.
          </p>
        </div>

        {rijen.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">🔍</div>
            <h2 className="text-sm font-semibold text-slate-700">Geen kandidaten</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Zodra de sourcing-engine draait verschijnen hier nieuwe kandidaten ter goedkeuring.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {rijen.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{p.bedrijf}</span>
                    {p.tier && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">Tier {p.tier}</span>}
                    {typeof p.icpTotaal === "number" && <span className="text-xs text-slate-400">ICP {p.icpTotaal}/25</span>}
                  </div>
                  {p.haakje && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{p.haakje}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={setStatus.bind(null, p.id, "nieuw")}>
                    <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500">Goedkeuren</button>
                  </form>
                  <form action={setStatus.bind(null, p.id, "afgewezen_koud")}>
                    <button className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50">Afwijzen</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
