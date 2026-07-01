"use client";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// Submit-knop die tijdens de server-action een spinner + label toont.
// Werkt binnen een <form action={...}> (useFormStatus leest de bovenliggende form).
export default function SubmitButton({
  children, pendingLabel, className,
}: { children: ReactNode; pendingLabel?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-1.5 transition ${className ?? ""} ${pending ? "cursor-wait opacity-70" : ""}`}
    >
      {pending ? (<><Spinner />{pendingLabel && <span>{pendingLabel}</span>}</>) : children}
    </button>
  );
}
