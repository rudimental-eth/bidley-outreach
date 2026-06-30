import { eq } from "drizzle-orm";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import AppHeader from "@/app/_components/AppHeader";
import { PageHeader } from "@/app/_components/ui";
import CandidateList, { type Cand } from "./CandidateList";

export const dynamic = "force-dynamic";

export default async function Candidates() {
  const rijen = await db.select().from(prospects).where(eq(prospects.status, "kandidaat"));
  const cands: Cand[] = rijen.map((p) => ({
    id: p.id, bedrijf: p.bedrijf, sector: p.sector, tier: p.tier,
    icpTotaal: p.icpTotaal, haakje: p.haakje, lookalikeCluster: p.lookalikeCluster, bron: p.bron,
  }));

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <PageHeader
          title="Kandidaten"
          subtitle="Door sourcing voorgesteld. Keur goed om in de pipeline te zetten."
        />
        <CandidateList cands={cands} />
      </main>
    </>
  );
}
