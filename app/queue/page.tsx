import { eq } from "drizzle-orm";
import { db } from "@/db";
import { messages, prospects } from "@/db/schema";
import { verstuurBatch } from "./actions";
import AppHeader from "@/app/_components/AppHeader";
import QueueItems from "./QueueItems";

export const dynamic = "force-dynamic";

export default async function Queue() {
  const rijen = await db.select({
    id: messages.id, onderwerp: messages.onderwerp, tekst: messages.tekst,
    bedrijf: prospects.bedrijf, email: prospects.publiekEmail,
  }).from(messages).innerJoin(prospects, eq(messages.prospectId, prospects.id))
    .where(eq(messages.status, "in_wachtrij"));

  async function action(formData: FormData) {
    "use server";
    const ids = formData.getAll("id").map(String);
    await verstuurBatch(ids);
  }

  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Verzendwachtrij</h1>
          <p className="mt-1 text-sm text-slate-500">
            Controleer de concepten en verstuur de goedgekeurde batch in één klik.
          </p>
        </div>

        {rijen.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl">
              📭
            </div>
            <h2 className="text-sm font-semibold text-slate-700">De wachtrij is leeg</h2>
            <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
              Zodra de outreach-engine concepten klaarzet (of je voegt een nieuwe prospect toe), verschijnen ze hier ter goedkeuring.
            </p>
          </div>
        ) : (
          <form action={action}>
            <QueueItems rows={rijen} />
          </form>
        )}
      </main>
    </>
  );
}
