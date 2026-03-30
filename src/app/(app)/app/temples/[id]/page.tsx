import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FavoriteButton from "./FavoriteButton";

import { getCategoryLabel } from "@/lib/eventCategories";

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
      email: true,
      description: true,
      logoUrl: true,
      coverImageUrl: true,
      templePage: { select: { slug: true, isPublished: true } },
    },
  });

  if (!temple) notFound();

  const events = await prisma.event.findMany({
    where: {
      templeId: id,
      status: "PUBLISHED",
      visibility: { in: ["PUBLIC", "MEMBERS_ONLY"] },
      eventDate: { gte: new Date(new Date().toDateString()) },
    },
    select: {
      id: true, title: true, category: true, eventDate: true, startTime: true, fee: true,
    },
    orderBy: { eventDate: "asc" },
    take: 10,
  });

  // ログイン会員のお気に入り状態・所属状態を確認
  const memberId = authUser.member?.id;
  const isMyTemple = authUser.member?.templeId === id;
  let isFavorite = false;

  if (memberId && !isMyTemple) {
    const fav = await prisma.memberFavoriteTemple.findFirst({
      where: { memberId, templeId: id },
    });
    isFavorite = !!fav;
  }

  return (
    <div className="max-w-lg mx-auto pb-8">
      {/* カバー画像 */}
      {temple.coverImageUrl ? (
        <div className="relative h-48 bg-stone-200 overflow-hidden">
          <Image src={temple.coverImageUrl} alt={temple.name} fill className="object-cover" />
        </div>
      ) : (
        <div className="h-32 bg-gradient-to-b from-amber-100 to-stone-50" />
      )}

      <div className="p-4">
        <Link href="/app/events" className="text-sm text-stone-400 hover:text-stone-600 mb-4 inline-block">
          ← イベント一覧
        </Link>

        {/* 寺院基本情報 */}
        <div className="flex items-start gap-4 mb-4">
          {temple.logoUrl ? (
            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-stone-200 flex-shrink-0">
              <Image src={temple.logoUrl} alt={temple.name} fill className="object-cover" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-3xl flex-shrink-0">
              🏯
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-stone-800">{temple.name}</h1>
            {temple.denomination && (
              <p className="text-sm text-amber-700 font-medium">{temple.denomination}</p>
            )}
          </div>
        </div>

        {/* 連絡先 */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-2 text-sm mb-4">
          {temple.address && (
            <div className="flex gap-2 items-start">
              <span className="text-stone-400">📍</span>
              <span className="text-stone-700">{temple.address}</span>
            </div>
          )}
          {temple.phone && (
            <div className="flex gap-2 items-center">
              <span className="text-stone-400">📞</span>
              <a href={`tel:${temple.phone}`} className="text-amber-700 hover:underline">
                {temple.phone}
              </a>
            </div>
          )}
          {temple.email && (
            <div className="flex gap-2 items-center">
              <span className="text-stone-400">✉️</span>
              <a href={`mailto:${temple.email}`} className="text-amber-700 hover:underline text-xs">
                {temple.email}
              </a>
            </div>
          )}
          {temple.templePage?.isPublished && temple.templePage.slug && (
            <div className="flex gap-2 items-center pt-1 border-t border-stone-100">
              <span className="text-stone-400">🌐</span>
              <Link
                href={`/temples/p/${temple.templePage.slug}`}
                target="_blank"
                className="text-amber-700 hover:underline text-xs"
              >
                公式ページを見る
              </Link>
            </div>
          )}
        </div>

        {/* 説明文 */}
        {temple.description && (
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-stone-700 mb-2">お寺について</h2>
            <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-wrap">
              {temple.description}
            </p>
          </div>
        )}

        {/* 開催予定イベント */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">開催予定のイベント</h2>
          {events.length === 0 ? (
            <p className="text-sm text-stone-400">開催予定のイベントはありません</p>
          ) : (
            <div className="space-y-2">
              {events.map((event) => (
                <Link key={event.id} href={`/app/events/${event.id}`}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-stone-200 hover:border-amber-200 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-stone-800">{event.title}</p>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {getCategoryLabel(event.category)} ·{" "}
                      {event.eventDate.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}{" "}
                      {event.startTime}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-amber-700 ml-2 flex-shrink-0">
                    {event.fee === 0 ? "無料" : `¥${event.fee.toLocaleString()}`}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* お気に入りボタン（ご縁さん向け） */}
        {memberId && !isMyTemple && (
          <FavoriteButton templeId={id} initialFavorite={isFavorite} />
        )}
        {isMyTemple && (
          <div className="flex items-center justify-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <span className="text-amber-700 text-sm font-medium">🏠 あなたの所属寺院です</span>
          </div>
        )}
      </div>
    </div>
  );
}
