"use client";
import { useMemo, useState } from "react";
import { setStatus } from "@/app/prospects/actions";
import { Badge, tierTone, EmptyState } from "@/app/_components/ui";

export type Cand = {
  id: string; bedrijf: string; sector: string | null; tier: string | null;
  icpTotaal: number | null; haakje: string | null; lookalikeCluster: string | null; bron: string | null;
};

const MND = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
function herkomst(bron: string | null): string {
  if (!bron) return "onbekend";
  const m = bron.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${Number(m[3])} ${MND[Number(m[2]) - 1]}`;
  return bron;
}

export default function CandidateList({ cands }: { cands: Cand[] }) {
  const [tier, setTier] = useState<"alle" | "A" | "B" | "look">("alle");

  const filtered = useMemo(() => cands.filter((c) => {
    if (tier === "alle") return true;
    if (tier === "look") return !c.tier;
    return c.tier === tier;
  }), [cands, tier]);

  const counts = {
    alle: cands.length,
    A: cands.filter((c) => c.tier === "A").length,
    B: cands.filter((c) => c.tier === "B").length,
    look: cands.filter((c) => !c.tier).length,
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
        {([["alle", "Alle"], ["A", "Tier A"], ["B", "Tier B"], ["look", "Look-alike (TC-check)"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTier(k)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tier === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
            {label} <span className="text-slate-400">{counts[k]}</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState emoji="🔍" title="Geen kandidaten in deze filter">
          Pas de filter aan of laat de sourcing draaien voor nieuwe kandidaten.
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <div key={p.id} className="rise flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{p.bedrijf}</span>
                  <Badge tone={tierTone(p.tier)}>{p.tier ? `Tier ${p.tier}` : "look-alike"}</Badge>
                  {typeof p.icpTotaal === "number" && <Badge tone="slate">ICP {p.icpTotaal}/25</Badge>}
                  {p.sector && <Badge tone="indigo">{p.sector}</Badge>}
                  <span className="text-[11px] text-slate-400">· {herkomst(p.bron)}</span>
                </div>
                {p.haakje && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{p.haakje}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <form action={setStatus.bind(null, p.id, "nieuw" as never)}>
                  <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500">Goedkeuren</button>
                </form>
                <form action={setStatus.bind(null, p.id, "afgewezen_koud" as never)}>
                  <button className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50">Afwijzen</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
