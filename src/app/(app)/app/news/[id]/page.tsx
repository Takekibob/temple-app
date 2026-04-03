import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChevronLeft, Bell, Calendar } from "lucide-react";

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const { id } = await params;
  const memberType = authUser.member?.type ?? null;

  const announcement = await prisma.announcement.findFirst({
    where: {
      id,
      templeId: authUser.templeId,
      publishedAt: { not: null, lte: new Date() },
    },
  });

  if (!announcement) notFound();

  if (announcement.memberId) {
    if (announcement.memberId !== authUser.member?.id) redirect("/app/news");
  } else {
    const seg = announcement.targetSegment;
    if (seg === "DANKA" && memberType !== "DANKA") redirect("/app/news");
    if (seg === "GOEN" && memberType !== "GOEN") redirect("/app/news");
  }

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4">
        <Link
          href="/app/news"
          className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 mb-4"
        >
          <ChevronLeft size={16} />
          お知らせ一覧
        </Link>
      </div>

      <div className="px-4">
        <article className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          {/* アイコンヘッダー */}
          <div className="bg-gradient-to-r from-amber-50 to-stone-50 px-5 py-4 flex items-center gap-3 border-b border-stone-100">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <Bell size={16} className="text-amber-600" />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-400">
              <Calendar size={11} />
              {announcement.publishedAt!.toLocaleDateString("ja-JP", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </div>
          </div>

          <div className="px-5 py-5">
            <h1 className="text-xl font-bold text-stone-800 leading-snug mb-4">
              {announcement.title}
            </h1>
            <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">
              {announcement.body}
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
