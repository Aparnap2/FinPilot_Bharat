"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getActions, getOutbox, type ActionItem, type OutboxMessage } from "@/lib/api";
import ActionCard from "@/components/ActionCard";

export default function ActionsPage() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [outbox, setOutbox] = useState<OutboxMessage[]>([]);

  useEffect(() => {
    let live = true;
    Promise.all([getActions(), getOutbox()]).then(([a, o]) => {
      if (live) { setActions(a); setOutbox(o); }
    });
    return () => { live = false; };
  }, []);

  const pending = actions.filter((a) => !a.resolved);
  const done = actions.filter((a) => a.resolved);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-extrabold">AI Assistant 🤖 <span className="text-sm font-medium text-zinc-500">· {pending.length} pending</span></h1>

      <section aria-label="Pending questions" className="space-y-3">
        {pending.map((a) => (
          <ActionCard key={a.id} item={a} />
        ))}
        {pending.length === 0 && <p className="text-sm text-zinc-500">Koi pending sawaal nahi — sab clear 🎉</p>}
      </section>

      {done.length > 0 && (
        <section aria-label="Recent resolutions">
          <h2 className="mb-2 text-sm font-extrabold text-zinc-600">Haal me suljhe ✓</h2>
          <ul className="space-y-2">
            {done.map((a) => (
              <li key={a.id} className="rounded-2xl bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
                <p className="font-semibold">{a.message}</p>
                <Link href={`/transactions/${a.txn_id}`} className="text-xs font-bold text-emerald-700 underline dark:text-emerald-400">
                  {a.txn_id} dekho →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="WhatsApp outbox">
        <h2 className="mb-2 text-sm font-extrabold text-zinc-600">WhatsApp outbox 📩 (mocked)</h2>
        <ul className="space-y-2">
          {outbox.map((m) => (
            <li key={m.id} className="rounded-2xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
              <p className="font-semibold">{m.body}</p>
              <p className="mt-1 text-xs text-zinc-500">To {m.to} · {m.template} · {m.status}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
