"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, MapPin, Bell, User } from "lucide-react";

interface BottomNavProps {
  unreadNewsCount?: number;
}

const NAV_ITEMS = [
  { href: "/app",         icon: Home,    label: "ホーム" },
  { href: "/app/events",  icon: BookOpen, label: "イベント" },
  { href: "/app/temples", icon: MapPin,   label: "寺院" },
  { href: "/app/news",    icon: Bell,    label: "お知らせ" },
  { href: "/app/mypage",  icon: User,    label: "マイページ" },
];

export default function BottomNav({ unreadNewsCount = 0 }: BottomNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-stone-100 shadow-[0_-1px_12px_rgba(0,0,0,0.06)] flex safe-area-pb z-40">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const active = isActive(href);
        const badge = href === "/app/news" ? unreadNewsCount : 0;
        return (
          <Link
            key={href}
            href={href}
            className="flex-1 flex flex-col items-center justify-center pt-2 pb-1 gap-0.5 relative"
          >
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-amber-700 rounded-full" />
            )}
            <span className="relative">
              <Icon
                size={22}
                strokeWidth={active ? 2.2 : 1.7}
                className={active ? "text-amber-700" : "text-stone-400"}
              />
              {badge > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </span>
            <span className={`text-[10px] font-medium tracking-tight ${active ? "text-amber-700" : "text-stone-400"}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
