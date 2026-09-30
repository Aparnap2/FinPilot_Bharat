"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getDigest, getActions, getHealth, postSync, inr, type DailyDigest, type ActionItem } from "@/lib/api";
import RunwayBanner from "@/components/RunwayBanner";
import ActionCard from "@/components/ActionCard";

export default function HomePage() {
  const [digest, setDigest] = useState<DailyDigest | null>(null);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [backend, setBackend] = useState("checking…");
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let live = true;
    const load = async () => {
      const [d, a, h] = await Promise.all([getDigest(), getActions(), getHealth()]);
      if (live) {
        setDigest(d);
        setActions(a.filter((x) => !x.resolved).slice(0, 2));
        setBackend(h.status);
      }
    };
    void load();
    return () => { live = false; };
  }, []);

  const sync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const r = await postSync();
      setSyncMsg(`✓ Sync ${r.run_id}: ${r.ingested} aaye · ${r.auto_posted} auto-post · ${r.nudges_sent} nudges · ${r.manual_review} review`);
      const d = await getDigest();
      setDigest(d);
    } catch {
      setSyncMsg("Sync fail — backend offline? Mock data dikh raha hai.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold text-zinc-500" role="status">
        Backend: {backend} · Offline shell ready — bina net ke demo data dikhega.
      </p>

      {digest && <RunwayBanner days={digest.runway_days} alert={digest.alert} />}

      <section aria-label="Aaj ki kamai" className="rounded-2xl bg-emerald-700 p-4 text-white shadow">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Aaj ki kamai</p>
        <p className="mt-1 text-4xl font-extrabold">{digest ? inr(digest.inflows) : "…"}</p>
        <p className="mt-1 text-xs text-emerald-100">
          Kharcha {digest ? inr(digest.outflows) : "…"} · Udhaari {digest ? inr(digest.open_udhaari) : "…"} · Overdue {digest?.overdue ?? "…"}
        </p>
        {digest && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold" aria-label="UPI cash udhaari split">
            <div className="rounded-xl bg-white/15 p-2">UPI<br />{inr(digest.upi_vs_cash_vs_credit.upi)}</div>
            <div className="rounded-xl bg-white/15 p-2">Cash<br />{inr(digest.upi_vs_cash_vs_credit.cash)}</div>
            <div className="rounded-xl bg-white/15 p-2">Udhaar<br />{inr(digest.upi_vs_cash_vs_credit.credit)}</div>
          </div>
        )}
        <button
          type="button"
          onClick={sync}
          disabled={syncing}
          className="mt-3 min-h-[48px] w-full rounded-xl bg-white text-base font-extrabold text-emerald-800 transition active:scale-[0.99] disabled:opacity-60"
        >
          {syncing ? "Sync ho raha… ⏳" : "🔄 Sync now"}
        </button>
        {syncMsg && <p role="status" className="mt-2 rounded-xl bg-white/15 p-2 text-xs font-semibold">{syncMsg}</p>}
      </section>

      <section aria-label="Attention chahiye" className="grid grid-cols-2 gap-2">
        <Link href="/udhaari" className="rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-2xl font-extrabold text-red-600">{digest?.overdue ?? "…"}</p>
          <p className="text-xs font-bold">Overdue udhaari ⏰</p>
        </Link>
        <Link href="/transactions" className="rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-2xl font-extrabold text-amber-600">{digest?.uncategorized ?? "…"}</p>
          <p className="text-xs font-bold">Bina category 🧾</p>
        </Link>
      </section>

      <section aria-label="AI action items" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold">AI action items 🤖</h2>
          <Link href="/actions" className="text-xs font-bold text-emerald-700 underline dark:text-emerald-400">Sab dekho →</Link>
        </div>
        {actions.map((a) => (
          <ActionCard key={a.id} item={a} />
        ))}
        {actions.length === 0 && <p className="text-sm text-zinc-500">Sab clear! Koi pending sawaal nahi. 🎉</p>}
      </section>
    </div>
  );
}
