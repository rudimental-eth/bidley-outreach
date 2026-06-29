import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { prospects } from "@/db/schema";
import { LINKEDIN_TEMPLATES } from "@/lib/copy-kit";
import { mergeFields } from "@/lib/personalize";
import AppHeader from "@/app/_components/AppHeader";
import CopyBlock from "./CopyBlock";

export const dynamic = "force-dynamic";

export default async function LinkedInAssist() {
  const rijen = await db.select().from(prospects)
    .where(inArray(prospects.kanaal, ["linkedin", "beide"]));

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">LinkedIn-assist</h1>
          <p className="mt-1 text-sm text-slate-500">
            Kant-en-klare berichten per prospect. Plaats ze handmatig binnen LinkedIn (binnen ToS — geen bots).
          </p>
        </div>

        {rijen.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">💬</div>
            <h2 className="text-sm font-semibold text-slate-700">Geen LinkedIn-prospects</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Prospects met kanaal “LinkedIn” of “Beide” verschijnen hier met klaargezette berichten.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rijen.map((p) => {
              const velden = {
                voornaam: p.contactpersoon?.split(" ")[0] ?? "",
                bedrijf: p.bedrijf,
                sector: p.sector ?? "jouw sector",
              };
              return (
                <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{p.bedrijf}</div>
                      {p.contactpersoon && <div className="text-xs text-slate-500">{p.contactpersoon}</div>}
                    </div>
                    {p.linkedinUrl && (
                      <a
                        href={p.linkedinUrl.startsWith("http") ? p.linkedinUrl : `https://${p.linkedinUrl}`}
                        target="_blank" rel="noopener noreferrer"
                        className="rounded-lg bg-[#0a66c2] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                      >
                        Open profiel ↗
                      </a>
                    )}
                  </div>
                  <div className="space-y-2">
                    {LINKEDIN_TEMPLATES.map((t) => (
                      <CopyBlock key={t.stap} stap={t.stap} titel={t.titel} text={mergeFields(t.body, velden)} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
