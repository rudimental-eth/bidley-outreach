import { eq } from "drizzle-orm";
import { db } from "@/db";
import { messages, prospects } from "@/db/schema";
import { verstuurBatch } from "./actions";

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
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Verzendwachtrij ({rijen.length})</h1>
      <form action={action} className="space-y-3">
        {rijen.map((m) => (
          <label key={m.id} className="flex gap-3 rounded border p-3">
            <input type="checkbox" name="id" value={m.id} defaultChecked />
            <div>
              <div className="font-medium">{m.bedrijf} — {m.email}</div>
              <div className="text-sm text-gray-600">{m.onderwerp}</div>
              <pre className="mt-1 whitespace-pre-wrap text-xs text-gray-500">{m.tekst}</pre>
            </div>
          </label>
        ))}
        <button className="rounded bg-green-600 px-6 py-3 text-white" type="submit">
          Verstuur geselecteerde batch
        </button>
      </form>
    </main>
  );
}
