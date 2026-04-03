import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import BottomNav from "@/components/shared/BottomNav";
import type { AnnouncementTarget } from "@/generated/prisma/enums";

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

  // 未読お知らせ数を取得
  let unreadNewsCount = 0;
  if (authUser?.member) {
    const memberType = authUser.member.type;
    const memberId = authUser.member.id;
    const allowedSegments: AnnouncementTarget[] =
      memberType === "DANKA" ? ["ALL", "DANKA"] : ["ALL", "GOEN"];

    unreadNewsCount = await prisma.announcement.count({
      where: {
        templeId: authUser.templeId,
        publishedAt: { not: null, lte: new Date() },
        OR: [
          { memberId: null, targetSegment: { in: allowedSegments } },
          { memberId },
        ],
        reads: { none: { memberId } },
      },
    });
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
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
      <BottomNav isDanka={isDanka} unreadNewsCount={unreadNewsCount} />
    </div>
  );
}
