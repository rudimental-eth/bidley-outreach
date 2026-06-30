import Link from "next/link";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import AppHeader from "@/app/_components/AppHeader";
import { PageHeader, StatCard, Icons } from "@/app/_components/ui";
import PipelineBoard, { type Card } from "./PipelineBoard";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const rijen = await db.select().from(prospects);
  const active = rijen.filter((r) => !["kandidaat", "afgewezen_koud", "opt_out"].includes(r.status));
  const count = (s: string) => rijen.filter((r) => r.status === s).length;
  const inSequence = count("benaderd") + count("audit_gestart") + count("demo");

  const cards: Card[] = active.map((p) => ({
    id: p.id, bedrijf: p.bedrijf, sector: p.sector, tier: p.tier,
    kanaal: p.kanaal, icpTotaal: p.icpTotaal, haakje: p.haakje,
    lookalikeCluster: p.lookalikeCluster, status: p.status,
  }));

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <PageHeader
          title="Pipeline"
          subtitle={`${active.length} actieve prospects · ${count("kandidaat")} kandidaten wachten op goedkeuring`}
          action={
            <Link href="/prospects/new" className="shrink-0 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/30 transition hover:opacity-95">
              + Nieuwe prospect
            </Link>
          }
        />

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Actieve prospects" value={active.length} accent="bg-slate-100 text-slate-700" icon={<Icons.users />} />
          <StatCard label="In sequence" value={inSequence} accent="bg-blue-100 text-blue-700" icon={<Icons.send />} />
          <StatCard label="Demo's" value={count("demo")} accent="bg-violet-100 text-violet-700" icon={<Icons.spark />} />
          <StatCard label="Klanten" value={count("klant")} accent="bg-emerald-100 text-emerald-700" icon={<Icons.trophy />} />
        </div>

        <PipelineBoard cards={cards} />
      </main>
    </>
  );
}
