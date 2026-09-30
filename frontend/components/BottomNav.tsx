"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/udhaari", label: "Udhaari", icon: "📒" },
  { href: "/sale", label: "Sale", icon: "＋" },
  { href: "/actions", label: "Actions", icon: "🤖" },
  { href: "/transactions", label: "Txns", icon: "🧾" },
];

export default function BottomNav() {
  const path = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-md -translate-x-1/2 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
    >
      <ul className="grid grid-cols-5">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-xs font-semibold ${
                  active ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-400"
                } ${t.href === "/sale" ? "relative" : ""}`}
              >
                {t.href === "/sale" ? (
                  <span
                    aria-hidden
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-2xl text-white shadow-lg ${
                      active ? "bg-emerald-700" : "bg-emerald-600"
                    } -mt-5 border-4 border-zinc-50 dark:border-zinc-950`}
                  >
                    {t.icon}
                  </span>
                ) : (
                  <span aria-hidden className="text-xl leading-none">{t.icon}</span>
                )}
                <span>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
