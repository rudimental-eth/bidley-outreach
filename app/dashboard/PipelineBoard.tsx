"use client";
import { useMemo, useState } from "react";
import { setStatus } from "@/app/prospects/actions";
import { Badge, tierTone } from "@/app/_components/ui";

export type Card = {
  id: string; bedrijf: string; sector: string | null; tier: string | null;
  kanaal: string; icpTotaal: number | null; haakje: string | null;
  lookalikeCluster: string | null; status: string;
};

const COLUMNS = [
  { key: "nieuw", label: "Nieuw", dot: "bg-slate-400" },
  { key: "benaderd", label: "Benaderd", dot: "bg-blue-500" },
  { key: "audit_gestart", label: "Audit gestart", dot: "bg-amber-500" },
  { key: "demo", label: "Demo", dot: "bg-violet-500" },
  { key: "klant", label: "Klant", dot: "bg-emerald-500" },
] as const;

function transitions(status: string): { to: string; label: string; primary?: boolean }[] {
  switch (status) {
    case "benaderd": return [{ to: "audit_gestart", label: "→ Audit", primary: true }, { to: "afgewezen_koud", label: "✗" }];
    case "audit_gestart": return [{ to: "demo", label: "→ Demo", primary: true }, { to: "afgewezen_koud", label: "✗" }];
    case "demo": return [{ to: "klant", label: "→ Klant", primary: true }, { to: "afgewezen_koud", label: "✗" }];
    default: return [];
  }
}

export default function PipelineBoard({ cards }: { cards: Card[] }) {
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<"alle" | "A" | "B" | "C">("alle");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return cards.filter((c) => {
      if (tier !== "alle" && c.tier !== tier) return false;
      if (!needle) return true;
      return (c.bedrijf + " " + (c.sector ?? "")).toLowerCase().includes(needle);
    });
  }, [cards, q, tier]);

  const per = (s: string) => filtered.filter((c) => c.status === s);

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" /></svg>
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Zoek op bedrijf of sector…"
            className="w-full rounded-xl border border-slate-200 bg-white/90 py-2 pl-9 pr-3 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {(["alle", "A", "B", "C"] as const).map((t) => (
            <button key={t} onClick={() => setTier(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${tier === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
              {t === "alle" ? "Alle" : `Tier ${t}`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {COLUMNS.map((c) => {
          const items = per(c.key);
          return (
            <section key={c.key} className="flex flex-col rounded-2xl bg-slate-100/70 p-3">
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                <h2 className="text-sm font-semibold text-slate-700">{c.label}</h2>
                <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 shadow-sm">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {items.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400">Leeg</p>
                ) : items.map((p) => (
                  <div key={p.id} className="rise group rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold leading-snug text-slate-900">{p.bedrijf}</h3>
                      <Badge tone={tierTone(p.tier)}>{p.tier ? `Tier ${p.tier}` : "—"}</Badge>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {p.sector && <Badge tone="slate">{p.sector}</Badge>}
                      <Badge tone="indigo">{p.kanaal}</Badge>
                      {typeof p.icpTotaal === "number" && <Badge tone="slate">ICP {p.icpTotaal}/25</Badge>}
                      {p.lookalikeCluster && <Badge tone="violet">look-alike</Badge>}
                    </div>
                    {p.haakje && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{p.haakje}</p>}
                    {transitions(p.status).length > 0 && (
                      <div className="mt-3 flex gap-1.5">
                        {transitions(p.status).map((t) => (
                          <form key={t.to} action={setStatus.bind(null, p.id, t.to as never)} className="contents">
                            <button className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${t.primary ? "bg-slate-900 text-white hover:bg-slate-700" : "bg-white text-slate-400 ring-1 ring-inset ring-slate-200 hover:text-slate-700"}`}>
                              {t.label}
                            </button>
                          </form>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
