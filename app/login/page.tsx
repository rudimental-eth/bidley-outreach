"use client";
import { useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

export default function Login() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "bezig" | "verzonden" | "fout">("idle");
  const [fout, setFout] = useState("");

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    setStatus("bezig");
    setFout("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("fout");
      setFout(error.message);
    } else {
      setStatus("verzonden");
    }
  }

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-300/40 to-violet-300/30 blur-3xl" />
      <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-lg font-bold text-white shadow-sm">
            B
          </span>
          <div>
            <div className="text-sm font-semibold tracking-tight text-slate-900">Bidley</div>
            <div className="text-xs text-slate-400">Lead Machine</div>
          </div>
        </div>

        <h1 className="text-lg font-bold text-slate-900">Inloggen</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">
          We sturen je een veilige inloglink naar je werk-e-mailadres.
        </p>

        {status === "verzonden" ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-medium">Check je inbox ✉️</p>
            <p className="mt-1 text-emerald-700">
              We hebben een inloglink naar <strong>{email}</strong> gestuurd.
            </p>
          </div>
        ) : (
          <form onSubmit={verstuur} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jij@blueflamingos.nl"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="submit"
              disabled={status === "bezig"}
              className="w-full rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
            >
              {status === "bezig" ? "Versturen…" : "Stuur inloglink"}
            </button>
            {status === "fout" && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{fout}</p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
