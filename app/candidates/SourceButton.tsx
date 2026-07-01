"use client";
import { useActionState } from "react";
import { sourceCandidates } from "@/app/prospects/actions";
import SubmitButton from "@/app/_components/SubmitButton";

export default function SourceButton() {
  const [state, action] = useActionState(sourceCandidates, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <SubmitButton
        pendingLabel="Ophalen…"
        className="rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-500/30 hover:opacity-95"
      >
        Nieuwe kandidaten ophalen
      </SubmitButton>
      {state?.message && <span className="text-xs text-slate-500">{state.message}</span>}
    </form>
  );
}
