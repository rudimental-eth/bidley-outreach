import { eq } from "drizzle-orm";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import AppHeader from "@/app/_components/AppHeader";
import { PageHeader } from "@/app/_components/ui";
import CandidateList, { type Cand } from "./CandidateList";

export const dynamic = "force-dynamic";

const MND = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
function datum(d: Date | null): string {
  if (!d) return "onbekend";
  return `${d.getDate()} ${MND[d.getMonth()]}`;
}

export default async function Candidates() {
  const rijen = await db.select().from(prospects).where(eq(prospects.status, "kandidaat"));
  const cands: Cand[] = rijen.map((p) => ({
    id: p.id, bedrijf: p.bedrijf, sector: p.sector, tier: p.tier,
    icpTotaal: p.icpTotaal, haakje: p.haakje, lookalikeCluster: p.lookalikeCluster, bron: p.bron,
  }));
  const laatste = rijen.reduce<Date | null>((acc, p) => {
    const d = p.aangemaaktOp ? new Date(p.aangemaaktOp) : null;
    return d && (!acc || d > acc) ? d : acc;
  }, null);

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <PageHeader
          title="Kandidaten"
          subtitle="Door sourcing voorgesteld. Keur goed om in de pipeline te zetten."
        />

        <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="inline-flex h-2 w-2 rounded-full bg-amber-400" />
              <span className="font-semibold text-slate-700">Automatische sourcing: uit</span>
              <span className="text-slate-400">· {rijen.length} kandidaten open · laatste batch {datum(laatste)}</span>
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Er komen nu geen kandidaten vanzelf bij. Nieuwe batches worden via een Ahrefs-research-run toegevoegd
            (met dedup: bestaande bedrijven worden nooit opnieuw opgehaald). Dagelijkse automatische sourcing gaat
            live zodra de Ahrefs-API-key + Inngest gekoppeld zijn.
          </p>
        </div>

        <CandidateList cands={cands} />
      </main>
    </>
  );
}
