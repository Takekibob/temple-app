"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/app",         label: "ホーム",     symbol: "■" },
  { href: "/app/events",  label: "集い",       symbol: "●" },
  { href: "/app/temples", label: "お寺",       symbol: "▲" },
  { href: "/app/mypage",  label: "マイページ", symbol: "◯" },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-paper z-40 flex"
      style={{ borderTop: "0.5px solid var(--color-border)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map(({ href, label, symbol }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center pt-3 pb-2 gap-0.5"
          >
            <span
              className={`font-sans text-[14px] leading-none ${
                active ? "text-ink" : "text-ink-tertiary"
              }`}
            >
              {symbol}
            </span>
            <span
              className={`font-serif text-[10px] tracking-section font-light ${
                active ? "text-ink" : "text-ink-tertiary"
              }`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
