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
      className="fixed z-50 right-5 w-12 h-12 rounded-full bg-paper-soft flex items-center justify-center shadow-md"
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 68px)",
        border: "0.5px solid var(--color-border)",
      }}
    >
      <PenLine size={18} strokeWidth={1.6} className="text-ink-secondary" />
    </Link>
  );
}
