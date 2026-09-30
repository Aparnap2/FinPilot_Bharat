"use client";
import { useEffect, useState } from "react";
import { getCustomers, postQuickSale, inr, type Customer, type PaymentType } from "@/lib/api";
import Keypad from "@/components/Keypad";
import CustomerPicker from "@/components/CustomerPicker";

const TYPES: { id: PaymentType; label: string; icon: string }[] = [
  { id: "cash", label: "Cash", icon: "💵" },
  { id: "upi", label: "UPI", icon: "📲" },
  { id: "udhaari", label: "Udhaari", icon: "📒" },
];

export default function SalePage() {
  const [amount, setAmount] = useState("");
  const [ptype, setPtype] = useState<PaymentType>("upi");
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [note, setNote] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    getCustomers().then((c) => { if (live) setCustomers(c); });
    return () => { live = false; };
  }, []);

  const save = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) { setMsg("Pehle amount dalo 💰"); return; }
    if (ptype === "udhaari" && !customerId) { setMsg("Udhaari ke liye customer chuno 📒"); return; }
    setSaving(true);
    const t0 = Date.now();
    try {
      const r = await postQuickSale({ amount: amt, payment_type: ptype, customer_id: customerId, note: note || undefined });
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      setMsg(`${r.message} (${secs}s — target <5s ✓)`);
      setAmount(""); setNote(""); setCustomerId(undefined);
    } catch {
      setMsg("Save fail — backend offline? Dobara try karo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <section aria-label="Amount" className="rounded-2xl bg-zinc-900 p-4 text-center text-white dark:bg-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Amount</p>
        <p className="mt-1 min-h-[56px] text-5xl font-extrabold tracking-tight" aria-live="polite">
          {amount ? inr(Number(amount)) : "₹0"}
        </p>
      </section>

      <Keypad value={amount} onChange={setAmount} />

      <section aria-label="Payment type">
        <h2 className="mb-2 text-sm font-extrabold">Payment type chuno</h2>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment type">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={ptype === t.id}
              onClick={() => setPtype(t.id)}
              className={`min-h-[56px] rounded-2xl border-2 text-base font-extrabold ${ptype === t.id ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950" : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"}`}
            >
              {t.icon}<br />{t.label}
            </button>
          ))}
        </div>
      </section>

      {ptype === "udhaari" && (
        <section aria-label="Customer">
          <h2 className="mb-2 text-sm font-extrabold">Customer chuno (udhaari) 📒</h2>
          <CustomerPicker customers={customers} selected={customerId} onSelect={setCustomerId} />
        </section>
      )}

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional) — jaise 2kg atta"
        aria-label="Note"
        className="min-h-[48px] w-full rounded-xl border border-zinc-300 bg-white px-3 text-base dark:border-zinc-700 dark:bg-zinc-900"
      />

      {msg && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{msg}</p>}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="min-h-[56px] w-full rounded-2xl bg-emerald-600 text-lg font-extrabold text-white shadow-lg transition active:scale-[0.99] disabled:opacity-60"
      >
        {saving ? "Save ho raha… ⏳" : "✓ Sale save karo"}
      </button>
      <p className="text-center text-xs text-zinc-500">Fast save target: 5 second se kam ⚡</p>
    </div>
  );
}
