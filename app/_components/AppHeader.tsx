"use client";
import { useState } from "react";
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
  const [open, setOpen] = useState(false);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const active = pathname.startsWith(href);
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
          active ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-sm shadow-indigo-500/30">B</span>
            <span className="text-sm font-semibold tracking-tight text-slate-900">
              Bidley <span className="font-normal text-slate-400">Lead Machine</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => <NavLink key={l.href} {...l} />)}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={logout} className="hidden text-sm font-medium text-slate-500 transition hover:text-slate-900 sm:block">
            Uitloggen
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5">
              {open ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 border-t border-slate-200/80 px-4 py-3 md:hidden">
          {LINKS.map((l) => <NavLink key={l.href} {...l} />)}
          <button onClick={logout} className="mt-1 rounded-lg px-3 py-1.5 text-left text-sm font-medium text-slate-500 hover:bg-slate-100">
            Uitloggen
          </button>
        </nav>
      )}
    </header>
  );
}
