"use client";
import type { Customer } from "@/lib/api";
import { inr } from "@/lib/api";

export default function CustomerPicker({
  customers,
  selected,
  onSelect,
}: {
  customers: Customer[];
  selected?: string;
  onSelect: (id: string | undefined) => void;
}) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label="Customer chuno">
      <button
        type="button"
        role="radio"
        aria-checked={!selected}
        onClick={() => onSelect(undefined)}
        className={`w-full rounded-2xl border p-3 text-left text-sm font-bold ${!selected ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950" : "border-zinc-200 dark:border-zinc-700"}`}
      >
        Walk-in customer <span className="font-normal text-zinc-500">(bina naam)</span>
      </button>
      {customers.map((c) => (
        <button
          key={c.id}
          type="button"
          role="radio"
          aria-checked={selected === c.id}
          onClick={() => onSelect(selected === c.id ? undefined : c.id)}
          className={`flex w-full items-center justify-between gap-2 rounded-2xl border p-3 text-left ${selected === c.id ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950" : "border-zinc-200 dark:border-zinc-700"}`}
        >
          <span>
            <span className="block text-sm font-bold text-zinc-900 dark:text-zinc-50">{c.name}</span>
            <span className="block text-xs text-zinc-500">{c.phone}</span>
          </span>
          <span className={`text-sm font-extrabold ${c.outstanding > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600"}`}>
            {c.outstanding > 0 ? `${inr(c.outstanding)} baki` : "clear ✓"}
          </span>
        </button>
      ))}
    </div>
  );
}
