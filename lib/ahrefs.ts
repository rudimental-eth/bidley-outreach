// Dunne client rond de Ahrefs API v3. Vereist AHREFS_API_KEY.
import { domainFromUrl } from "./sourcing";

const BASE = "https://api.ahrefs.com/v3";

export function hasAhrefsKey(): boolean {
  return Boolean(process.env.AHREFS_API_KEY);
}

async function call(path: string, params: Record<string, string>): Promise<unknown> {
  const key = process.env.AHREFS_API_KEY;
  if (!key) throw new Error("AHREFS_API_KEY ontbreekt");
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}${path}?${qs}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Ahrefs ${path} → HTTP ${res.status}`);
  return res.json();
}

type SerpPosition = { url: string | null; type?: string[] };
// Vindt de domeinen die op een zoekwoord ADVERTEREN (paid posities in de SERP).
export async function serpAdvertiserDomains(keyword: string, country = "nl"): Promise<string[]> {
  const data = (await call("/serp-overview/serp-overview", {
    select: "url,type,position", country, keyword,
  })) as { positions?: SerpPosition[] };
  const out = new Set<string>();
  for (const p of data.positions ?? []) {
    const paid = (p.type ?? []).some((t) => t.startsWith("paid"));
    if (paid && p.url) {
      const d = domainFromUrl(p.url);
      if (d) out.add(d);
    }
  }
  return [...out];
}

export type AhrefsMetrics = { paid_keywords: number; paid_cost: number | null; paid_pages: number };
// Verrijkt één domein met paid-metrics (paid_cost in USD-cents).
export async function ahrefsMetrics(domain: string, date: string, country = "nl"): Promise<AhrefsMetrics> {
  const data = (await call("/site-explorer/metrics", {
    target: domain, date, country, mode: "subdomains",
  })) as { metrics?: AhrefsMetrics };
  return data.metrics ?? { paid_keywords: 0, paid_cost: null, paid_pages: 0 };
}
