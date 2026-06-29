"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const LINKS = [
  { href: "/dashboard", label: "Pipeline" },
  { href: "/candidates", label: "Kandidaten" },
  { href: "/queue", label: "Wachtrij" },
  { href: "/linkedin", label: "LinkedIn" },
  { href: "/funnel", label: "Funnel" },
];

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm">
              B
            </span>
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              Bidley <span className="font-normal text-slate-400">Lead Machine</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {LINKS.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <button
          onClick={logout}
          className="text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          Uitloggen
        </button>
      </div>
    </header>
  );
}
