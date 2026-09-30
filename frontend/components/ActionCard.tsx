"use client";
import { useState } from "react";
import Link from "next/link";
import type { ActionItem } from "@/lib/api";
import { respondAction } from "@/lib/api";

export default function ActionCard({ item }: { item: ActionItem }) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reply = async (r: string) => {
    setBusy(true);
    try {
      const res = await respondAction(item.id, r);
      setStatus(res.message);
    } catch {
      setStatus("Backend offline — reply save nahi hua, dobara try karo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <p className="text-[15px] font-semibold leading-6 text-zinc-900 dark:text-zinc-50">{item.message}</p>
      <Link href={`/transactions/${item.txn_id}`} className="mt-1 inline-block text-xs font-bold text-emerald-700 underline dark:text-emerald-400">
        Transaction {item.txn_id} ka proof dekho →
      </Link>
      {status ? (
        <p role="status" className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          {status}
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {item.quick_replies.map((q) => (
            <button
              key={q}
              type="button"
              disabled={busy}
              onClick={() => reply(q)}
              className="min-h-[44px] flex-1 basis-1/3 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white transition active:scale-95 disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
