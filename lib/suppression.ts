export type SuppressionEntry = {
  email: string | null;
  domein: string | null;
  reden: string;
};

export function domainOf(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}

export function isSuppressed(email: string, list: SuppressionEntry[]): boolean {
  const addr = email.trim().toLowerCase();
  const dom = domainOf(addr);
  return list.some(
    (e) =>
      (e.email && e.email.trim().toLowerCase() === addr) ||
      (e.domein && e.domein.trim().toLowerCase() === dom),
  );
}
