"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenLine } from "lucide-react";

export default function FloatingActionButton() {
  const pathname = usePathname();
  // Hide on journal/new itself to avoid self-referential loop
  if (pathname === "/app/journal/new") return null;

  return (
    <Link
      href="/app/journal/new"
      aria-label="記録を書く"
      className="fixed z-50 right-5 flex items-center gap-2 bg-ink text-paper font-serif text-sm font-light px-5 py-3 shadow-lg"
      style={{ bottom: "calc(env(safe-area-inset-bottom) + 72px)" }}
    >
      <PenLine size={16} strokeWidth={1.8} />
      記録
    </Link>
  );
}
