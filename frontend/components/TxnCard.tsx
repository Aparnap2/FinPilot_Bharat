import Link from "next/link";
import type { Transaction } from "@/lib/api";
import { inr } from "@/lib/api";
import ConfidenceBadge from "./ConfidenceBadge";

const STATUS_STYLE: Record<string, string> = {
  auto_posted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  posted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  pending_review: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300",
  needs_info: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const STATUS_LABEL: Record<string, string> = {
  auto_posted: "Auto-posted ✓",
  posted: "Posted ✓",
  pending_review: "Review chahiye",
  needs_info: "Info chahiye",
};

export default function TxnCard({ txn }: { txn: Transaction }) {
  return (
    <Link
      href={`/transactions/${txn.id}`}
      className="block rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition active:scale-[0.99] dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-bold text-zinc-900 dark:text-zinc-50">{txn.merchant}</p>
          <p className="truncate font-mono text-xs text-zinc-500 dark:text-zinc-400">{txn.raw_descriptor ?? txn.id}</p>
        </div>
        <p
          className={`shrink-0 text-lg font-extrabold ${txn.direction === "credit" ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-50"}`}
        >
          {txn.direction === "credit" ? "+" : "−"}{inr(txn.amount)}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[txn.status] ?? "bg-zinc-100 text-zinc-700"}`}>
          {STATUS_LABEL[txn.status] ?? txn.status}
        </span>
        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {txn.category}
        </span>
        <ConfidenceBadge value={txn.confidence} />
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${txn.guardrail_pass ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400"}`}
        >
          {txn.guardrail_pass ? "🛡 Guardrail pass" : "🛡 Guardrail hold"}
        </span>
      </div>
    </Link>
  );
}
