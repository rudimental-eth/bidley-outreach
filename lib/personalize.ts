export type MergeVelden = {
  voornaam: string; bedrijf: string; zoekwoord: string;
  sector: string; observatie: string; afzender: string;
};

export function mergeFields(template: string, velden: Partial<MergeVelden>): string {
  return template.replace(/\{(\w+)\}/g, (m, key: string) =>
    key in velden && velden[key as keyof MergeVelden] != null
      ? String(velden[key as keyof MergeVelden])
      : m,
  );
}

export function requiredFieldsPresent(velden: Partial<MergeVelden>): boolean {
  return Boolean(velden.voornaam && velden.bedrijf && velden.observatie?.trim());
}
