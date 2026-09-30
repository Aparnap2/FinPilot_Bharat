"use client";
import { useEffect, useMemo, useState } from "react";
import { getTransactions, type Transaction } from "@/lib/api";
import TxnCard from "@/components/TxnCard";

type Filter = "all" | "pending_review" | "needs_info" | "posted";

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let live = true;
    getTransactions().then((t) => { if (live) setTxns(t); });
    return () => { live = false; };
  }, []);

  const shown = useMemo(() => {
    if (filter === "all") return txns;
    if (filter === "posted") return txns.filter((t) => t.status === "posted" || t.status === "auto_posted");
    return txns.filter((t) => t.status === filter);
  }, [txns, filter]);

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: "Sab" },
    { id: "pending_review", label: "Review" },
    { id: "needs_info", label: "Info" },
    { id: "posted", label: "Posted ✓" },
  ];

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-extrabold">Transactions 🧾</h1>
      <div className="flex gap-2" role="tablist" aria-label="Filter">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={filter === t.id}
            onClick={() => setFilter(t.id)}
            className={`min-h-[44px] flex-1 rounded-xl text-sm font-extrabold ${filter === t.id ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {shown.map((t) => (
        <TxnCard key={t.id} txn={t} />
      ))}
      {shown.length === 0 && <p className="text-sm text-zinc-500">Is filter me kuch nahi. 🔍</p>}
    </div>
  );
}
