"use client";
import { useEffect, useState } from "react";
import { getCustomers, createCustomer, addCustomerPayment, remindCustomer, inr, type Customer } from "@/lib/api";

export default function UdhaariPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [payAmt, setPayAmt] = useState<Record<string, string>>({});

  const load = async () => setCustomers(await getCustomers());
  useEffect(() => { void load(); }, []);

  const total = customers.reduce((s, c) => s + c.outstanding, 0);

  const add = async () => {
    if (!name.trim() || !phone.trim()) { setMsg("Naam + phone dono likho 🙏"); return; }
    const c = await createCustomer(name.trim(), phone.trim());
    setCustomers((p) => [...p, c]);
    setName(""); setPhone("");
    setMsg(`✓ ${c.name} joda`);
  };

  const pay = async (id: string) => {
    const amt = Number(payAmt[id]);
    if (!amt || amt <= 0) { setMsg("Sahi amount likho"); return; }
    const r = await addCustomerPayment(id, amt);
    setMsg(r.message);
    await load();
  };

  const remind = async (id: string) => {
    const r = await remindCustomer(id);
    setMsg(r.message);
  };

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-zinc-900 p-4 text-white dark:bg-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Kul udhaari baki</p>
        <p className="text-3xl font-extrabold">{inr(total)}</p>
        <p className="text-xs text-zinc-400">{customers.length} customers · ek tap me remind karo 🙏</p>
      </section>

      {msg && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">{msg}</p>}

      <section aria-label="Naya customer" className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-extrabold">+ Naya customer</h2>
        <div className="mt-2 flex gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Naam (jaise Suresh)" aria-label="Customer naam"
            className="min-h-[48px] w-full rounded-xl border border-zinc-300 px-3 text-base dark:border-zinc-700 dark:bg-zinc-800" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" aria-label="Phone"
            className="min-h-[48px] w-full rounded-xl border border-zinc-300 px-3 text-base dark:border-zinc-700 dark:bg-zinc-800" />
        </div>
        <button type="button" onClick={add} className="mt-2 min-h-[48px] w-full rounded-xl bg-emerald-600 text-base font-extrabold text-white active:scale-[0.99]">
          Jodo
        </button>
      </section>

      <ul className="space-y-3" aria-label="Customer list">
        {customers.map((c) => (
          <li key={c.id} className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-extrabold">{c.name}</p>
                <p className="text-xs text-zinc-500">{c.phone} · due {c.due_date}</p>
                {c.last_payment && <p className="text-xs text-zinc-500">Last: {c.last_payment}</p>}
              </div>
              <div className="text-right">
                <p className={`text-xl font-extrabold ${c.outstanding > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600"}`}>
                  {c.outstanding > 0 ? inr(c.outstanding) : "clear ✓"}
                </p>
                <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${c.status === "overdue" ? "bg-red-100 text-red-700" : c.status === "due_soon" ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-600"}`}>
                  {c.status === "overdue" ? "⏰ Overdue" : c.status === "due_soon" ? "⏳ Due soon" : c.status}
                </span>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={payAmt[c.id] ?? ""}
                onChange={(e) => setPayAmt((p) => ({ ...p, [c.id]: e.target.value }))}
                inputMode="numeric"
                placeholder="₹ payment"
                aria-label={`${c.name} payment amount`}
                className="min-h-[48px] w-full rounded-xl border border-zinc-300 px-3 text-base dark:border-zinc-700 dark:bg-zinc-800"
              />
              <button type="button" onClick={() => pay(c.id)} className="min-h-[48px] flex-1 rounded-xl bg-zinc-900 text-sm font-extrabold text-white dark:bg-zinc-100 dark:text-zinc-900">
                Payment +
              </button>
              <button type="button" onClick={() => remind(c.id)} className="min-h-[48px] flex-1 rounded-xl bg-emerald-600 text-sm font-extrabold text-white">
                Remind 🙏
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
