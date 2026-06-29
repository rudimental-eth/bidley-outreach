import Link from "next/link";
import AppHeader from "@/app/_components/AppHeader";
import { addProspect } from "../actions";

export const dynamic = "force-dynamic";

const SCORES = [
  { name: "score_ads", label: "Draait Google Ads" },
  { name: "score_budget", label: "Budget-fit €1-10K" },
  { name: "score_leadwaarde", label: "Lead-/conversiewaarde" },
  { name: "score_bereikbaarheid", label: "Bereikbaarheid beslisser" },
  { name: "score_geen_bf_overlap", label: "Geen BF-overlap" },
];

function Field({ label, name, type = "text", placeholder, required }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      <input
        name={name} type={type} placeholder={placeholder} required={required}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
      />
    </label>
  );
}

export default function NewProspect() {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-6">
          <Link href="/dashboard" className="text-sm text-slate-400 hover:text-slate-600">← Pipeline</Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Nieuwe prospect</h1>
          <p className="mt-1 text-sm text-slate-500">De ICP-tier wordt automatisch berekend uit de 5 scores.</p>
        </div>

        <form action={addProspect} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">Bedrijf & contact</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Bedrijf *" name="bedrijf" placeholder="Acme B.V." required />
              <Field label="Website" name="website" placeholder="https://acme.nl" />
              <Field label="Sector" name="sector" placeholder="dakdekker" />
              <Field label="Contactpersoon" name="contactpersoon" placeholder="Jan Jansen" />
              <Field label="Publiek e-mailadres" name="publiek_email" type="email" placeholder="info@acme.nl" />
              <Field label="LinkedIn-URL" name="linkedin_url" placeholder="linkedin.com/in/…" />
            </div>
            <div className="mt-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Kanaal</span>
                <select name="kanaal" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                  <option value="email">E-mail</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="beide">Beide</option>
                </select>
              </label>
            </div>
            <div className="mt-4">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Haakje (personalisatie)</span>
                <textarea name="haakje" rows={2} placeholder="Adverteert op 'dakkapel plaatsen', sterke lokale focus…"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20" />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold text-slate-700">ICP-score (1 = laag, 5 = hoog)</h2>
            <div className="space-y-3">
              {SCORES.map((s) => (
                <label key={s.name} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-600">{s.label}</span>
                  <select name={s.name} defaultValue="3" className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20">
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" className="rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95">
              Prospect toevoegen
            </button>
            <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-900">Annuleren</Link>
          </div>
        </form>
      </main>
    </>
  );
}
