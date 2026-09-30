"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { approveTransaction, getTransactionDetail, inr, type TransactionDetail } from "@/lib/api";
import ConfidenceBadge from "@/components/ConfidenceBadge";
import ExplainDrawer from "@/components/ExplainDrawer";

export default function TxnDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [override, setOverride] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    getTransactionDetail(id).then((d) => { if (live) setDetail(d); });
    return () => { live = false; };
  }, [id]);

  const decide = async (approved: boolean) => {
    setBusy(true);
    try {
      const r = await approveTransaction(id, approved, override || undefined);
      setMsg(r.message);
    } catch {
      setMsg("Backend offline — decision save nahi hua.");
    } finally {
      setBusy(false);
    }
  };

  if (!detail) return <p className="text-sm text-zinc-500">Load ho raha… ⏳</p>;
  const { transaction: t, proposal, evidence, guardrail, audit } = detail;
  const finalAction = guardrail.safe_to_post ? "auto-post" : proposal.requires_review ? "human review" : "quick-confirm";

  return (
    <div className="space-y-4">
      <Link href="/transactions" className="text-sm font-bold text-emerald-700 underline dark:text-emerald-400">← Sab transactions</Link>

      <section className="rounded-2xl bg-zinc-900 p-4 text-white dark:bg-zinc-800" aria-label="Transaction summary">
        <p className="text-xs text-zinc-400">{t.id} · {t.raw_descriptor}</p>
        <p className="mt-1 text-4xl font-extrabold">{t.direction === "credit" ? "+" : "−"}{inr(t.amount)}</p>
        <p className="text-sm font-semibold">{t.merchant} · {t.category}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <ConfidenceBadge value={t.confidence} />
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold">{t.status}</span>
        </div>
      </section>

      <ExplainDrawer proposal={proposal} guardrail={guardrail} evidence={evidence} finalAction={finalAction} />

      <section aria-label="Approve or reject" className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-extrabold">Aapka faisla ✋</h2>
        <input
          value={override}
          onChange={(e) => setOverride(e.target.value)}
          placeholder="Category override (optional)"
          aria-label="Category override"
          className="mt-2 min-h-[48px] w-full rounded-xl border border-zinc-300 px-3 text-base dark:border-zinc-700 dark:bg-zinc-800"
        />
        <div className="mt-2 flex gap-2">
          <button type="button" disabled={busy} onClick={() => decide(true)} className="min-h-[52px] flex-1 rounded-xl bg-emerald-600 text-base font-extrabold text-white disabled:opacity-50">
            ✓ Approve
          </button>
          <button type="button" disabled={busy} onClick={() => decide(false)} className="min-h-[52px] flex-1 rounded-xl border-2 border-red-300 text-base font-extrabold text-red-700 dark:text-red-300 disabled:opacity-50">
            ✕ Reject
          </button>
        </div>
        {msg && <p role="status" className="mt-2 rounded-xl bg-emerald-50 p-2 text-sm font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{msg}</p>}
      </section>

      <section aria-label="Audit trail" className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-extrabold">Audit trail 🕵️ (immutable)</h2>
        <ol className="mt-2 space-y-0 border-l-2 border-emerald-200 pl-4 dark:border-emerald-900">
          {audit.map((a) => (
            <li key={a.id} className="relative pb-3 text-sm">
              <span aria-hidden className="absolute -left-[22px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-600" />
              <p className="font-bold text-zinc-900 dark:text-zinc-100">{a.action}</p>
              <p className="text-xs text-zinc-500">{a.actor_type} · {a.timestamp}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
