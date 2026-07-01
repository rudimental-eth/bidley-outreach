import { inngest } from "./client";
import { runSourcing } from "@/lib/sourcing-run";

// ma-vr 07:00 Europe/Amsterdam → vindt automatisch nieuwe adverteerders via Ahrefs
// en zet ze als kandidaat klaar (dedup ingebouwd). Doet niets zonder AHREFS_API_KEY.
export const sourcing = inngest.createFunction(
  { id: "sourcing", triggers: [{ cron: "TZ=Europe/Amsterdam 0 7 * * 1-5" }] },
  async () => {
    return await runSourcing({ keywords: 8 });
  },
);
