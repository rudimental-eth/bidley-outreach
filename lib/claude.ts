import Anthropic from "@anthropic-ai/sdk";
import { mergeFields, type MergeVelden } from "./personalize";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function genObservatie(haak: string, bedrijf: string, sector: string): Promise<string> {
  const msg = await client.messages.create({
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
