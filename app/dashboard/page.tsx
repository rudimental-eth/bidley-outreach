import { db } from "@/db";
import { prospects } from "@/db/schema";

export const dynamic = "force-dynamic";

const KOLOMMEN = ["nieuw", "benaderd", "audit_gestart", "demo", "klant"] as const;

export default async function Dashboard() {
  const rijen = await db.select().from(prospects);
  const perStatus = (s: string) => rijen.filter((r) => r.status === s);
  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Pipeline</h1>
      <div className="grid grid-cols-5 gap-4">
        {KOLOMMEN.map((k) => (
          <div key={k} className="rounded border p-3">
            <h2 className="mb-2 font-semibold capitalize">{k.replace("_", " ")} ({perStatus(k).length})</h2>
            <ul className="space-y-2">
              {perStatus(k).map((p) => (
                <li key={p.id} className="rounded bg-gray-50 p-2 text-sm">
                  <div className="font-medium">{p.bedrijf}</div>
                  <div className="text-gray-500">{p.sector} · {p.tier ?? "—"}</div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-6"><a href="/queue" className="text-blue-600 underline">→ Verzendwachtrij</a></p>
    </main>
  );
}
