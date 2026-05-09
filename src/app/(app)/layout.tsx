import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import BottomNav from "@/components/shared/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await getAuthUser();
  const isAdminOrStaff =
    authUser != null &&
    ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);

  return (
    <div className="min-h-screen bg-paper pb-20">
      {/* 管理者・スタッフ向けバナー */}
      {isAdminOrStaff && (
        <div
          className="sticky top-0 z-30 bg-paper-soft text-ink-secondary text-[11px] py-2 px-5 flex items-center justify-between font-serif"
          style={{ borderBottom: "0.5px solid var(--color-border)" }}
        >
          <span className="tracking-section text-ink-tertiary">管理者として閲覧中</span>
          <Link
            href="/admin"
            className="text-ink font-light border-b-[0.5px] border-ink"
          >
            管理画面に戻る →
          </Link>
        </div>
      )}
      {children}
      <BottomNav />
    </div>
  );
}
