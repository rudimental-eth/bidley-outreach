import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { outreachEngine } from "@/inngest/outreach-engine";
import { followUp } from "@/inngest/follow-up";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [outreachEngine, followUp],
});
