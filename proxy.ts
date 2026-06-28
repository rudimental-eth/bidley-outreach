import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  const allowed = (process.env.ALLOWED_EMAIL_DOMAINS ?? "blueflamingos.nl,bidley.ai")
    .split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);
  const emailDomain = user?.email?.split("@")[1]?.toLowerCase();
  const domainOk = emailDomain ? allowed.includes(emailDomain) : false;
  const isAuthPage = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/auth");
  if (!user && !isAuthPage) return NextResponse.redirect(new URL("/login", req.url));
  if (user && !domainOk && !isAuthPage) return NextResponse.redirect(new URL("/login", req.url));
  return res;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
