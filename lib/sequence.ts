export type SequenceStep = "Mail1" | "Mail2" | "Mail3";

export type ProspectSeqState = {
  status: string;
  kanaal: "email" | "linkedin" | "beide";
  laatsteStap: SequenceStep | string | null;
  laatsteActieOp: Date | null;
  replyOntvangen: boolean;
};

const DAY = 24 * 60 * 60 * 1000;

export function nextStep(p: ProspectSeqState, now: Date): SequenceStep | null {
  if (p.kanaal === "linkedin") return null;
  if (p.replyOntvangen) return null;
  if (["klant", "afgewezen_koud", "opt_out", "demo"].includes(p.status)) return null;

  if (!p.laatsteStap) return "Mail1";
  if (!p.laatsteActieOp) return null;

  const dagenSinds = (now.getTime() - p.laatsteActieOp.getTime()) / DAY;
  if (p.laatsteStap === "Mail1" && dagenSinds >= 3) return "Mail2";
  if (p.laatsteStap === "Mail2" && dagenSinds >= 4) return "Mail3";
  return null;
}
