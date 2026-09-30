import Link from "next/link";

export default function RunwayBanner({ days, alert }: { days: number; alert: string | null }) {
  const danger = days < 45;
  return (
    <div
      role="alert"
      className={`rounded-2xl border p-4 ${danger ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/50" : "border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/50"}`}
    >
      <p className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50">
        {danger ? "⚠️ " : "✅ "} Runway: {days} din
      </p>
      {alert && <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{alert}</p>}
      {danger && (
        <div className="mt-3 flex gap-2">
          <Link href="/udhaari" className="min-h-[44px] flex-1 rounded-xl bg-red-600 px-3 py-2 text-center text-sm font-bold text-white">
            Udhaari vasoolo
          </Link>
          <Link href="/transactions" className="min-h-[44px] flex-1 rounded-xl border border-red-300 px-3 py-2 text-center text-sm font-bold text-red-700 dark:text-red-300">
            Kharcha dekho
          </Link>
        </div>
      )}
    </div>
  );
}
