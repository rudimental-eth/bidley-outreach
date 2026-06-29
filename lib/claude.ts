import Anthropic from "@anthropic-ai/sdk";
import { mergeFields, type MergeVelden } from "./personalize";

// Lazy: pas instantiëren bij gebruik, zodat een ontbrekende ANTHROPIC_API_KEY
// niet de build/imports breekt (alleen een echte call faalt dan).
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return client;
}

export async function genObservatie(haak: string, bedrijf: string, sector: string): Promise<string> {
  const msg = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    messages: [{
      role: "user",
      content: `Schrijf één korte, feitelijke observatie-zin (Nederlands, ondernemer-naar-ondernemer, geen verkooptaal, geen verzonnen cijfers) voor een cold e-mail aan ${bedrijf} (sector: ${sector}). Baseer je uitsluitend op deze research-haak: "${haak}". Geef alleen de zin terug.`,
    }],
  });
  const block = msg.content[0];
  return block.type === "text" ? block.text.trim() : "";
}

export function renderTemplate(template: string, velden: Partial<MergeVelden>): string {
  return mergeFields(template, velden);
}
