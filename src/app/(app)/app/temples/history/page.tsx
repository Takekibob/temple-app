import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCategoryLabel, getCategoryIcon } from "@/lib/eventCategories";
import { MapPin, ChevronLeft, ChevronRight, PenLine, BookOpen, Stamp, ScrollText } from "lucide-react";

export default async function TempleHistoryPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (!authUser.member) redirect("/app");

  const now = new Date();
  const memberId = authUser.member.id;

  const [followedTemples, pastParticipations, templeVisits] = await Promise.all([
    // フォロー中のお寺（ご縁を結んだお寺）
    prisma.memberFavoriteTemple.findMany({
      where: { memberId },
      select: {
        templeId: true,
        createdAt: true,
        temple: { select: { id: true, name: true, denomination: true, logoUrl: true, address: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // 過去のイベント参加
    prisma.eventParticipation.findMany({
      where: {
        memberId,
        status: { in: ["ATTENDED", "CONFIRMED"] },
        event: { eventDate: { lt: now } },
      },
      select: {
        id: true,
        status: true,
        feedbackScore: true,
        event: {
          select: {
            id: true,
            title: true,
            category: true,
            eventDate: true,
            startTime: true,
            temple: { select: { name: true } },
          },
        },
      },
      orderBy: { event: { eventDate: "desc" } },
    }),
    // 参拝記録
    prisma.templeVisit.findMany({
      where: { memberId },
      select: {
        id: true,
        memo: true,
        visitedAt: true,
        temple: { select: { id: true, name: true, denomination: true } },
      },
      orderBy: { visitedAt: "desc" },
    }),
  ]);

  const isEmpty = followedTemples.length === 0 && pastParticipations.length === 0 && templeVisits.length === 0;

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <Link href="/app" className="w-8 h-8 flex items-center justify-center rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors">
          <ChevronLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">参拝履歴</h1>
          <p className="text-xs text-stone-400 mt-0.5">お寺との歩み・ご縁の記録</p>
        </div>
        <Link
          href="/app/temples/visit"
          className="flex items-center gap-1.5 text-xs font-semibold bg-teal-600 text-white px-3 py-2 rounded-xl hover:bg-teal-700 transition-colors shadow-sm shrink-0"
        >
          <Stamp size={13} />
          記録する
        </Link>
      </div>

      <div className="px-4 space-y-6">
        {isEmpty && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Stamp size={26} className="text-amber-500" />
            </div>
            <p className="text-stone-500 text-sm font-medium mb-1">まだ参拝履歴がありません</p>
            <p className="text-xs text-stone-400 mb-4">お寺をフォローしたりイベントに参加すると記録されます</p>
            <Link href="/app/temples" className="text-amber-700 text-sm font-semibold hover:underline">
              お寺を探す →
            </Link>
          </div>
        )}

        {/* 参拝記録ジャーナル */}
        {templeVisits.length > 0 && (
          <section>
            <SectionLabel>参拝メモ</SectionLabel>
            <div className="space-y-2.5">
              {templeVisits.map((v) => (
                <div key={v.id} className="bg-white border border-stone-100 rounded-2xl shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <Link
                        href={`/app/temples/${v.temple.id}`}
                        className="text-sm font-bold text-stone-800 hover:text-amber-700 transition-colors"
                      >
                        {v.temple.name}
                      </Link>
                      {v.temple.denomination && (
                        <p className="text-xs text-amber-700 font-medium mt-0.5">{v.temple.denomination}</p>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-400 shrink-0 mt-0.5">
                      {v.visitedAt.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  </div>
                  {v.memo ? (
                    <div className="flex gap-2 mt-1">
                      <ScrollText size={12} className="text-stone-300 shrink-0 mt-0.5" />
                      <p className="text-xs text-stone-500 leading-relaxed whitespace-pre-wrap">{v.memo}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-300 italic">メモなし</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ご縁を結んだお寺 */}
        {followedTemples.length > 0 && (
          <section>
            <SectionLabel>ご縁を結んだお寺</SectionLabel>
            <div className="space-y-2.5">
              {followedTemples.map((f) => (
                <Link
                  key={f.templeId}
                  href={`/app/temples/${f.templeId}`}
                  className="flex items-center gap-3 bg-white border border-stone-100 rounded-2xl p-3.5 shadow-sm hover:border-amber-200 hover:shadow-md transition-all"
                >
                  {f.temple.logoUrl ? (
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-stone-100 shrink-0">
                      <Image src={f.temple.logoUrl} alt={f.temple.name} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xl shrink-0">
                      🏯
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-800 text-sm">{f.temple.name}</p>
                    {f.temple.denomination && (
                      <p className="text-xs text-amber-700 font-medium mt-0.5">{f.temple.denomination}</p>
                    )}
                    {f.temple.address && (
                      <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin size={10} />
                        {f.temple.address}
                      </p>
                    )}
                    <p className="text-[10px] text-stone-300 mt-1">
                      {f.createdAt.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })} ご縁を結びました
                    </p>
                  </div>
                  <ChevronRight size={15} className="text-stone-300 shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 過去の参加イベント */}
        {pastParticipations.length > 0 && (
          <section>
            <SectionLabel>参加したイベント</SectionLabel>
            <div className="space-y-2.5">
              {pastParticipations.map((p) => (
                <div key={p.id} className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden">
                  <Link
                    href={`/app/events/${p.event.id}`}
                    className="flex items-center gap-3 p-4 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                      <BookOpen size={16} className="text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-teal-700 font-medium">
                        {getCategoryIcon(p.event.category)} {getCategoryLabel(p.event.category)}
                        <span className="text-stone-300 mx-1">·</span>
                        <span className="text-stone-400 font-normal">{p.event.temple.name}</span>
                      </p>
                      <p className="text-sm font-semibold text-stone-800 truncate">{p.event.title}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {p.event.eventDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
                        {p.event.startTime && ` ${p.event.startTime}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                      {p.feedbackScore != null && (
                        <span className="text-xs text-amber-600 font-semibold">{"★".repeat(p.feedbackScore)}</span>
                      )}
                      <ChevronRight size={14} className="text-stone-300" />
                    </div>
                  </Link>
                  <div className="border-t border-stone-50 px-4 pb-3 pt-2.5">
                    <Link
                      href={`/app/events/${p.event.id}/feedback`}
                      className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                    >
                      <PenLine size={12} />
                      {p.feedbackScore != null ? "感想を編集する" : "感想を書く"}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="h-px flex-1 bg-stone-100" />
      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest whitespace-nowrap">
        {children}
      </span>
      <div className="h-px flex-1 bg-stone-100" />
    </div>
  );
}
