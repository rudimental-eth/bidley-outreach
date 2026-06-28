"use client";
import { createBrowserClient } from "@supabase/ssr";

export default function Login() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const signIn = () =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback`, queryParams: { hd: "blueflamingos.nl" } },
    });
  return (
    <main className="flex h-screen items-center justify-center">
      <button onClick={signIn} className="rounded bg-black px-6 py-3 text-white">
        Inloggen met Google
      </button>
    </main>
  );
}
