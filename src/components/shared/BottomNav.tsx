"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, PenLine, User } from "lucide-react";

const NAV_ITEMS = [
  { href: "/app",         icon: Home,    label: "ホーム" },
  { href: "/app/events",  icon: BookOpen, label: "集い" },
  { href: "/app/journal", icon: PenLine,  label: "記録" },
  { href: "/app/my",      icon: User,    label: "マイページ" },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/app") return pathname === "/app";
    if (href === "/app/events") return pathname.startsWith("/app/events");
    if (href === "/app/journal") return pathname.startsWith("/app/journal");
    if (href === "/app/my") return pathname === "/app/my" || pathname.startsWith("/app/my/");
    return false;
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-paper flex safe-area-pb z-40"
      style={{ borderTop: "0.5px solid var(--color-border)" }}
    >
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center pt-2 pb-1 gap-0.5 relative"
          >
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[0.5px] bg-ink" />
            )}
            <Icon
              size={22}
              strokeWidth={active ? 2 : 1.6}
              className={active ? "text-ink" : "text-ink-tertiary"}
            />
            <span className={`font-serif text-[10px] tracking-section font-light ${active ? "text-ink" : "text-ink-tertiary"}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
