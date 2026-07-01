import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { outreachEngine } from "@/inngest/outreach-engine";
import { followUp } from "@/inngest/follow-up";
import { sourcing } from "@/inngest/sourcing";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [outreachEngine, followUp, sourcing],
});
