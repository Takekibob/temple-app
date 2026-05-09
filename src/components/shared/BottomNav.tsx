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
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-stone-100 shadow-[0_-1px_12px_rgba(0,0,0,0.06)] flex safe-area-pb z-40">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center pt-2 pb-1 gap-0.5 relative"
          >
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-amber-700 rounded-full" />
            )}
            <Icon
              size={22}
              strokeWidth={active ? 2.2 : 1.7}
              className={active ? "text-amber-700" : "text-stone-400"}
            />
            <span className={`text-[10px] font-medium tracking-tight ${active ? "text-amber-700" : "text-stone-400"}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
