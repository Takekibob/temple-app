import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AnnouncementTarget } from "@/generated/prisma/enums";
import { Bell, ChevronRight, User } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
  ALL: "全員",
  DANKA: "檀家",
  GOEN: "ご縁さん",
};

export default async function NewsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const memberType = authUser.member?.type ?? null;

  const allowedSegments: AnnouncementTarget[] = memberType === "DANKA"
    ? ["ALL", "DANKA"]
    : memberType === "GOEN"
    ? ["ALL", "GOEN"]
    : ["ALL"];

  const announcements = await prisma.announcement.findMany({
    where: {
      templeId: authUser.templeId,
      publishedAt: { not: null, lte: new Date() },
      OR: [
        { memberId: null, targetSegment: { in: allowedSegments } },
        ...(authUser.member ? [{ memberId: authUser.member.id }] : []),
      ],
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      targetSegment: true,
      memberId: true,
      publishedAt: true,
      body: true,
    },
  });

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">お知らせ</h1>
      </div>

      <div className="px-4">
        {announcements.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center">
            <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Bell size={22} className="text-stone-400" />
            </div>
            <p className="text-stone-400 text-sm">お知らせはありません</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {announcements.map((a) => (
              <Link
                key={a.id}
                href={`/app/news/${a.id}`}
                className="flex items-center gap-3 bg-white rounded-2xl border border-stone-100 shadow-sm px-4 py-3.5 hover:border-amber-200 hover:shadow-md transition-all"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  a.memberId ? "bg-blue-50" : "bg-amber-50"
                }`}>
                  {a.memberId
                    ? <User size={15} className="text-blue-600" />
                    : <Bell size={15} className="text-amber-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {a.memberId ? (
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                        あなた宛
                      </span>
                    ) : a.targetSegment !== "ALL" && (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                        {SEGMENT_LABELS[a.targetSegment]}限定
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-stone-800 text-sm leading-snug truncate">{a.title}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {a.publishedAt!.toLocaleDateString("ja-JP", {
                      year: "numeric", month: "long", day: "numeric",
                    })}
                  </p>
                </div>
                <ChevronRight size={15} className="text-stone-300 shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
