import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "FinPilot Bharat — SME CFO",
  description: "UPI reconciliation, udhaari ledger aur runway alerts — mobile-first SME CFO.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "FinPilot", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#047857",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-zinc-100 text-zinc-900 dark:bg-black dark:text-zinc-50">
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-zinc-50 shadow-xl dark:bg-zinc-950">
          <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
            <p className="text-base font-extrabold tracking-tight">
              🇮🇳 FinPilot <span className="text-emerald-700 dark:text-emerald-400">Bharat</span>
            </p>
            <p className="text-[11px] font-medium text-zinc-500">Aapka AI munshi · mock mode me demo ready</p>
          </header>
          <main className="flex-1 px-4 pb-24 pt-4">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
