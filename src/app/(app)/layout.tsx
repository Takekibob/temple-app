import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import BottomNav from "@/components/shared/BottomNav";

// 利用者側（檀家・ご縁さん）レイアウト
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await getAuthUser();
  const isDanka = authUser?.member?.type === "DANKA";
  const isAdminOrStaff =
    authUser != null &&
    ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);

  return (
    <div className="min-h-screen bg-stone-50 pb-16">
      {/* 管理者・スタッフ向けバナー */}
      {isAdminOrStaff && (
        <div className="sticky top-0 z-30 bg-amber-900 text-amber-100 text-xs py-1.5 px-4 flex items-center justify-between">
          <span>管理者として利用者画面を閲覧中</span>
          <Link
            href="/admin"
            className="underline font-medium hover:text-white transition-colors"
          >
            管理画面に戻る →
          </Link>
        </div>
      )}
      {children}
      <BottomNav isDanka={isDanka} />
    </div>
  );
}
