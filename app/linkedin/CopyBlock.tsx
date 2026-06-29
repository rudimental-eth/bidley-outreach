"use client";
import { useState } from "react";

export default function CopyBlock({ stap, titel, text }: { stap: string; titel: string; text: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">
          <span className="mr-1.5 rounded bg-indigo-100 px-1.5 py-0.5 text-indigo-700">{stap}</span>
          {titel}
        </span>
        <button
          onClick={copy}
          className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 ring-1 ring-inset ring-slate-200 transition hover:text-slate-900"
        >
          {copied ? "Gekopieerd ✓" : "Kopieer"}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{text}</p>
    </div>
  );
}
