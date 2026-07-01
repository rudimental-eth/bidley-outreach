"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";

function SendButton({ count }: { count: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={count === 0 || pending}
      className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {pending ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Versturen…
        </>
      ) : `Verstuur batch (${count})`}
    </button>
  );
}

export type QueueRow = {
  id: string;
  onderwerp: string | null;
  tekst: string;
  bedrijf: string;
  email: string | null;
};

export default function QueueItems({ rows }: { rows: QueueRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(rows.map((r) => r.id)));
  const allSelected = selected.size === rows.length && rows.length > 0;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          Alles selecteren
        </label>
        <span className="text-sm text-slate-400">{selected.size} van {rows.length} geselecteerd</span>
      </div>

      <div className="space-y-3">
        {rows.map((m) => {
          const checked = selected.has(m.id);
          return (
            <label
              key={m.id}
              className={`flex cursor-pointer gap-3 rounded-xl border bg-white p-4 shadow-sm transition ${
                checked ? "border-indigo-300 ring-1 ring-indigo-200" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                name="id"
                value={m.id}
                checked={checked}
                onChange={() => toggle(m.id)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{m.bedrijf}</span>
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-500">
                    {m.email}
                  </span>
                </div>
                <div className="mt-1 text-sm font-medium text-slate-700">{m.onderwerp}</div>
                <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-sans text-xs leading-relaxed text-slate-500">
                  {m.tekst}
                </pre>
              </div>
            </label>
          );
        })}
      </div>

      <div className="sticky bottom-0 mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white/90 p-3 shadow-lg backdrop-blur">
        <span className="px-1 text-sm text-slate-500">
          {selected.size} {selected.size === 1 ? "mail" : "mails"} klaar om te versturen
        </span>
        <SendButton count={selected.size} />
      </div>
    </>
  );
}
