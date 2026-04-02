import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AnnouncementTarget } from "@/generated/prisma/enums";

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
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-stone-800 mb-4">お知らせ</h1>

      {announcements.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-10 text-center text-stone-400 text-sm">
          お知らせはありません
        </div>
      ) : (
        <ul className="space-y-2">
          {announcements.map((a) => (
            <li key={a.id}>
              <Link
                href={`/app/news/${a.id}`}
                className="block bg-white rounded-xl border border-stone-200 p-4 hover:border-amber-200 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {a.memberId ? (
                      <span className="inline-block text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full mb-1 font-medium">
                        あなた宛
                      </span>
                    ) : a.targetSegment !== "ALL" && (
                      <span className="inline-block text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mb-1 font-medium">
                        {SEGMENT_LABELS[a.targetSegment]}限定
                      </span>
                    )}
                    <p className="font-medium text-stone-800 leading-snug">{a.title}</p>
                    <p className="text-xs text-stone-400 mt-1">
                      {a.publishedAt!.toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <span className="text-stone-300 shrink-0 mt-1">›</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
