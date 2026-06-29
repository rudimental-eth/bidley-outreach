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
    <main className="flex h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-xl font-bold">Bidley Lead Machine</h1>
        <p className="mb-6 text-sm text-gray-500">Log in met je werk-e-mailadres.</p>
        {status === "verzonden" ? (
          <p className="rounded bg-green-50 p-3 text-sm text-green-800">
            Check je inbox — we hebben een inloglink naar <strong>{email}</strong> gestuurd.
          </p>
        ) : (
          <form onSubmit={verstuur} className="space-y-3">
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="jij@blueflamingos.nl"
              className="w-full rounded border px-3 py-2"
            />
            <button
              type="submit" disabled={status === "bezig"}
              className="w-full rounded bg-black px-6 py-2 text-white disabled:opacity-50"
            >
              {status === "bezig" ? "Versturen…" : "Stuur inloglink"}
            </button>
            {status === "fout" && <p className="text-sm text-red-600">{fout}</p>}
          </form>
        )}
      </div>
    </main>
  );
}
