"use client";
import { useState } from "react";

const SOURCES = [
  { id: "bank", name: "HDFC Bank (mock)", desc: "Statement pull · Setu AA sandbox", on: true },
  { id: "upi", name: "UPI / Razorpay (mock)", desc: "Settlements + webhook", on: true },
  { id: "inbox", name: "Gmail receipts (mock)", desc: "Bounded search: amount + date + merchant only", on: true },
  { id: "wa", name: "WhatsApp (mock)", desc: "Twilio sandbox · quick replies", on: true },
];

export default function SettingsPage() {
  const [consents, setConsents] = useState<Record<string, boolean>>({ bank: true, inbox: true, wa: true });
  const [quiet, setQuiet] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = (id: string) => {
    setConsents((p) => ({ ...p, [id]: !p[id] }));
    setMsg(id === "inbox" && consents[id] ? "Inbox access revoked — receipt search band. ⛔" : "Consent updated ✓ (mocked, audit me logged)");
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-extrabold">Settings ⚙️</h1>
      {msg && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-200">{msg}</p>}

      <section aria-label="Connected sources" className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-extrabold">Connected sources (mocked)</h2>
        <ul className="mt-2 space-y-2">
          {SOURCES.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800">
              <div>
                <p className="text-sm font-bold">{s.name}</p>
                <p className="text-xs text-zinc-500">{s.desc}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${s.on ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"}`}>
                {s.on ? "● Connected" : "○ Off"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Consent" className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-extrabold">Consent (DPDP-style) 🔏</h2>
        {[
          { id: "bank", label: "Bank statement padhne do" },
          { id: "inbox", label: "Receipt ke liye inbox search (bounded)" },
          { id: "wa", label: "WhatsApp nudges bhejo" },
        ].map((c) => (
          <label key={c.id} className="mt-2 flex min-h-[52px] cursor-pointer items-center justify-between gap-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800">
            <span className="text-sm font-semibold">{c.label}</span>
            <input type="checkbox" checked={!!consents[c.id]} onChange={() => toggle(c.id)} className="h-6 w-6 accent-emerald-600" aria-label={c.label} />
          </label>
        ))}
        <button
          type="button"
          onClick={() => { setConsents({ bank: false, inbox: false, wa: false }); setMsg("Sab consent revoked ⛔ — sync ruk jayega (mocked)."); }}
          className="mt-3 min-h-[48px] w-full rounded-xl border-2 border-red-300 text-sm font-extrabold text-red-700 dark:text-red-300"
        >
          Sab access revoke karo
        </button>
      </section>

      <section aria-label="Notifications" className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-extrabold">Notifications 🔔</h2>
        <label className="mt-2 flex min-h-[52px] cursor-pointer items-center justify-between gap-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800">
          <span className="text-sm font-semibold">Raat 9pm–8am shaant raho (quiet hours)</span>
          <input type="checkbox" checked={quiet} onChange={() => setQuiet(!quiet)} className="h-6 w-6 accent-emerald-600" aria-label="Quiet hours" />
        </label>
        <p className="mt-2 text-xs text-zinc-500">Customer reminders polite template + rate-limit ke saath. Koi bank account number WhatsApp par nahi jata. 🛡</p>
      </section>

      <p className="rounded-xl bg-zinc-100 p-3 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        Offline shell: ye UI bina backend ke mock data par chalta hai. Asli backend judte hi <code>NEXT_PUBLIC_API_URL</code> se live data aayega — koi code change nahi.
      </p>
    </div>
  );
}
