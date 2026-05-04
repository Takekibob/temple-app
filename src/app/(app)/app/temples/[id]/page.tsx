import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCategoryLabel, getCategoryIcon } from "@/lib/eventCategories";
import { MapPin, Phone, Globe, CalendarDays, Home, ChevronLeft, ChevronRight, Users, Stamp, Youtube, Instagram, MessageCircle } from "lucide-react";
import FollowButton from "./FollowButton";

export default async function TempleProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const { id } = await params;

  const temple = await prisma.temple.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      name: true,
      denomination: true,
      address: true,
      phone: true,
      description: true,
      logoUrl: true,
      coverImageUrl: true,
      websiteUrl: true,
      instagramUrl: true,
      lineOfficialUrl: true,
      youtubeUrl: true,
      stripeConnectOnboarded: true,
    },
  });

  if (!temple) notFound();

  const events = await prisma.event.findMany({
    where: {
      templeId: id,
      status: "PUBLISHED",
      eventDate: { gte: new Date(new Date().toDateString()) },
    },
    select: {
      id: true, title: true, category: true, eventDate: true, startTime: true, fee: true,
    },
    orderBy: { eventDate: "asc" },
    take: 10,
  });

  const memberId = authUser.member?.id;
  const isMyTemple = authUser.member?.templeId === id;

  const followerCount = await prisma.memberFavoriteTemple.count({ where: { templeId: id } });

  const isFollowing = memberId
    ? !!(await prisma.memberFavoriteTemple.findUnique({
        where: { memberId_templeId: { memberId, templeId: id } },
      }))
    : false;


  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* カバー画像 */}
      {temple.coverImageUrl ? (
        <div className="relative h-52 bg-stone-200 overflow-hidden">
          <Image src={temple.coverImageUrl} alt={temple.name} fill className="object-cover" />
          <div className="absolute top-4 left-4">
            <Link
              href="/app/events"
              className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm"
            >
              <ChevronLeft size={18} className="text-stone-700" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="h-28 bg-gradient-to-b from-amber-50 to-stone-50 relative px-4 flex items-center">
          <Link
            href="/app/events"
            className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700"
          >
            <ChevronLeft size={16} />
            イベント一覧
          </Link>
        </div>
      )}

      <div className="px-4 pt-4 space-y-4">
        {/* 寺院基本情報 */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
          <div className="flex items-start gap-4 mb-4">
            {temple.logoUrl ? (
              <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-stone-100 flex-shrink-0 shadow-sm">
                <Image src={temple.logoUrl} alt={temple.name} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-2xl flex-shrink-0">
                🏯
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-bold text-stone-800">{temple.name}</h1>
              {temple.denomination && (
                <p className="text-sm text-amber-700 font-medium mt-0.5">{temple.denomination}</p>
              )}
              {followerCount > 0 && (
                <p className="text-xs text-stone-400 mt-1 flex items-center gap-1">
                  <Users size={11} />
                  {followerCount}人がフォロー中
                </p>
              )}
            </div>
          </div>

          {/* 連絡先 */}
          <div className="divide-y divide-stone-50">
            {temple.address && (
              <div className="flex items-start gap-3 py-2.5">
                <MapPin size={14} className="text-stone-400 shrink-0 mt-0.5" />
                <span className="text-sm text-stone-600">{temple.address}</span>
              </div>
            )}
            {temple.phone && (
              <div className="flex items-center gap-3 py-2.5">
                <Phone size={14} className="text-stone-400 shrink-0" />
                <a href={`tel:${temple.phone}`} className="text-sm text-amber-700 hover:underline">
                  {temple.phone}
                </a>
              </div>
            )}
          </div>

          {/* リンク集 */}
          {(temple.websiteUrl || temple.instagramUrl || temple.lineOfficialUrl || temple.youtubeUrl) && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {temple.websiteUrl && (
                <Link href={temple.websiteUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-stone-700 hover:bg-stone-800 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors">
                  <Globe size={14} />公式サイト
                </Link>
              )}
              {temple.instagramUrl && (
                <Link href={temple.instagramUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors">
                  <Instagram size={14} />Instagram
                </Link>
              )}
              {temple.lineOfficialUrl && (
                <Link href={temple.lineOfficialUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-[#06C755] hover:bg-[#05b34a] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors">
                  <MessageCircle size={14} />LINE公式
                </Link>
              )}
              {temple.youtubeUrl && (
                <Link href={temple.youtubeUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2.5 rounded-xl transition-colors">
                  <Youtube size={14} />YouTube
                </Link>
              )}
            </div>
          )}
        </div>

        {/* 説明文 */}
        {temple.description && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">お寺について</h2>
            <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">
              {temple.description}
            </p>
          </div>
        )}

        {/* 開催予定イベント */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-stone-50 flex items-center gap-2">
            <CalendarDays size={14} className="text-amber-600" />
            <h2 className="text-sm font-bold text-stone-700">開催予定のイベント</h2>
          </div>
          {events.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-6">開催予定のイベントはありません</p>
          ) : (
            <div className="divide-y divide-stone-50">
              {events.map((event) => (
                <Link key={event.id} href={`/app/events/${event.id}`}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-stone-50 transition-colors">
                  <div>
                    <p className="text-xs text-stone-400 mb-0.5">
                      {getCategoryIcon(event.category)} {getCategoryLabel(event.category)}
                    </p>
                    <p className="text-sm font-semibold text-stone-800">{event.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {event.eventDate.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}{" "}
                      {event.startTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-xs font-bold text-amber-700">
                      {event.fee === 0 ? "無料" : `¥${event.fee.toLocaleString()}`}
                    </span>
                    <ChevronRight size={14} className="text-stone-300" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div className="space-y-3">
          {memberId && (
            <Link
              href={`/app/temples/${id}/visit`}
              className="flex items-center justify-center gap-2 w-full bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold py-3.5 rounded-2xl shadow-sm transition-colors"
            >
              <Stamp size={16} />
              参拝を記録する
            </Link>
          )}
          {memberId && !isMyTemple && (
            <FollowButton templeId={id} initialFollowing={isFollowing} />
          )}
          {isMyTemple && (
            <div className="flex items-center justify-center gap-2 p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <Home size={16} className="text-amber-700" />
              <span className="text-amber-800 text-sm font-semibold">あなたの所属寺院です</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
