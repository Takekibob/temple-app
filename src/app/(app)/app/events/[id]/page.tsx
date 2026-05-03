import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CancelButton from "./CancelButton";
import ShareButton from "@/components/shared/ShareButton";
import { getCategoryLabel, getCategoryIcon } from "@/lib/eventCategories";
import { MapPin, Clock, Users, Coins, ChevronLeft, CheckCircle, Globe, ExternalLink, Heart, Lock } from "lucide-react";
import FollowButton from "@/app/(app)/app/temples/[id]/FollowButton";

const PARTICIPATION_STATUS_LABELS: Record<string, string> = {
  APPLIED: "申込済み（確認待ち）",
  CONFIRMED: "参加確定",
  WAITLISTED: "キャンセル待ち登録済み",
  ATTENDED: "参加済み",
  NO_SHOW: "不参加",
};

export default async function AppEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, status: "PUBLISHED" },
    include: {
      temple: { select: { id: true, name: true, denomination: true, websiteUrl: true } },
      _count: {
        select: { participations: { where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } } } },
      },
    },
  });

  if (!event) notFound();

  // フォロワー限定イベントの制御
  if ((event.visibility as string) === "FOLLOWERS_ONLY") {
    const memberId = authUser.member?.id;
    const isFollowing = memberId
      ? !!(await prisma.memberFavoriteTemple.findUnique({
          where: { memberId_templeId: { memberId, templeId: event.templeId } },
        }))
      : false;
    const isMyTemple = authUser.member?.templeId === event.templeId;

    if (!isFollowing && !isMyTemple) {
      // フォロー促進画面
      return (
        <div className="max-w-lg mx-auto pb-28">
          <div className="h-24 bg-gradient-to-b from-amber-50 to-stone-50 relative flex items-center px-4">
            <Link
              href="/app/events"
              className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700"
            >
              <ChevronLeft size={16} />
              イベント一覧
            </Link>
          </div>

          <div className="px-4 pt-4 space-y-4">
            <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 text-center">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock size={24} className="text-rose-400" />
              </div>
              <p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-100 px-3 py-1 rounded-full inline-block mb-4">
                フォロワー限定
              </p>
              <h1 className="text-lg font-bold text-stone-800 mb-1">{event.title}</h1>
              <p className="text-sm text-stone-500 mb-1">
                {event.eventDate.toLocaleDateString("ja-JP", {
                  year: "numeric", month: "long", day: "numeric", weekday: "short",
                })}
                {event.startTime && ` ${event.startTime}〜`}
              </p>
              <Link
                href={`/app/temples/${event.temple.id}`}
                className="inline-flex items-center gap-1 text-xs text-amber-700 hover:underline mb-5"
              >
                <MapPin size={11} />
                {event.temple.name}
                {event.temple.denomination && `（${event.temple.denomination}）`}
              </Link>

              <div className="border-t border-stone-100 pt-5 mt-1">
                <p className="text-sm font-semibold text-stone-700 mb-1">
                  このイベントは <span className="text-amber-800">{event.temple.name}</span> のフォロワー限定です
                </p>
                <p className="text-xs text-stone-400 mb-5">
                  フォローすると限定イベントやお知らせが届きます
                </p>
                {authUser.member ? (
                  <FollowButton
                    templeId={event.temple.id}
                    initialFollowing={false}
                    redirectAfter={`/app/events/${id}`}
                  />
                ) : (
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold px-6 py-3 rounded-2xl shadow-sm transition-colors"
                  >
                    <Heart size={15} />
                    ログインしてフォローする
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  let myParticipation = null;
  if (authUser.member) {
    myParticipation = await prisma.eventParticipation.findUnique({
      where: { eventId_memberId: { eventId: id, memberId: authUser.member.id } },
      select: { id: true, status: true, numGuests: true },
    });
    if (myParticipation?.status === "CANCELLED") myParticipation = null;
  }

  const isFull = event.capacity != null && event._count.participations >= event.capacity;
  const remaining = event.capacity != null ? event.capacity - event._count.participations : null;

  const isFollowersOnly = (event.visibility as string) === "FOLLOWERS_ONLY";

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* カバー画像 */}
      {event.imageUrl ? (
        <div className="relative h-52 bg-stone-200 overflow-hidden">
          <Image src={event.imageUrl} alt={event.title} fill className="object-cover" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4">
            <Link
              href="/app/events"
              className="w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm"
            >
              <ChevronLeft size={18} className="text-stone-700" />
            </Link>
            <ShareButton title={event.title} />
          </div>
          <div className="absolute bottom-3 left-4 flex gap-1.5">
            <span className="bg-white/90 backdrop-blur-sm text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
              {getCategoryIcon(event.category)} {getCategoryLabel(event.category)}
            </span>
            {isFollowersOnly && (
              <span className="bg-rose-600/90 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                フォロワー限定
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="h-24 bg-gradient-to-b from-amber-50 to-stone-50 relative flex items-center justify-between px-4">
          <Link
            href="/app/events"
            className="flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700"
          >
            <ChevronLeft size={16} />
            イベント一覧
          </Link>
          <ShareButton title={event.title} />
        </div>
      )}

      <div className="px-4 pt-4 space-y-4">
        {/* タイトル・寺院 */}
        <div>
          {!event.imageUrl && (
            <div className="flex gap-1.5 mb-2">
              <span className="text-xs bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full font-semibold">
                {getCategoryIcon(event.category)} {getCategoryLabel(event.category)}
              </span>
              {isFollowersOnly && (
                <span className="text-xs bg-rose-50 text-rose-600 px-2.5 py-0.5 rounded-full font-medium">
                  フォロワー限定
                </span>
              )}
            </div>
          )}
          <h1 className="text-xl font-bold text-stone-800 leading-snug">{event.title}</h1>
          <Link
            href={`/app/temples/${event.temple.id}`}
            className="inline-flex items-center gap-1 text-xs text-amber-700 hover:underline mt-1.5"
          >
            <MapPin size={11} />
            {event.temple.name}
            {event.temple.denomination && `（${event.temple.denomination}）`}
          </Link>
          {event.temple.websiteUrl && (
            <div className="mt-2">
              <Link
                href={event.temple.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-amber-700 border border-stone-200 hover:border-amber-300 rounded-lg px-2.5 py-1 transition-colors"
              >
                <Globe size={11} />
                寺院の公式サイト
                <ExternalLink size={10} />
              </Link>
            </div>
          )}
        </div>

        {/* 詳細情報カード */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-stone-50">
            <InfoRow icon={<Clock size={14} className="text-amber-600" />} label="日時">
              <span>
                {event.eventDate.toLocaleDateString("ja-JP", {
                  year: "numeric", month: "long", day: "numeric", weekday: "short",
                })}
              </span>
              <span className="text-stone-400 ml-1">{event.startTime}〜{event.endTime}</span>
            </InfoRow>
            {event.location && (
              <InfoRow icon={<MapPin size={14} className="text-amber-600" />} label="会場">
                {event.location}
              </InfoRow>
            )}
            <InfoRow icon={<Coins size={14} className="text-amber-600" />} label="参加費">
              <span className="font-bold text-amber-700">
                {event.fee === 0 ? "無料" : `¥${event.fee.toLocaleString()}`}
              </span>
            </InfoRow>
            <InfoRow icon={<Users size={14} className="text-amber-600" />} label="定員">
              {event.capacity
                ? `${event.capacity}名（残${Math.max(0, remaining ?? 0)}席）`
                : "定員なし"}
            </InfoRow>
          </div>
        </div>

        {/* 説明 */}
        {event.description && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
            <h2 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">詳細</h2>
            <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed">
              {event.description}
            </p>
          </div>
        )}

        {/* 参加ステータス / CTA */}
        {!authUser.member ? (
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-5 text-center">
            <p className="text-sm text-stone-500 mb-2">参加申込には会員登録が必要です</p>
            <Link href="/auth/register" className="text-amber-700 font-semibold text-sm hover:underline">
              新規登録はこちら →
            </Link>
          </div>
        ) : myParticipation ? (
          <div className="bg-teal-50 rounded-2xl border border-teal-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={16} className="text-teal-600" />
              <p className="text-sm font-semibold text-teal-800">
                {PARTICIPATION_STATUS_LABELS[myParticipation.status] ?? myParticipation.status}
              </p>
            </div>
            <p className="text-xs text-teal-600 ml-6">{myParticipation.numGuests}名で申込済み</p>
            <div className="flex gap-2 mt-3 ml-6">
              {event.eventDate >= new Date() && <CancelButton eventId={id} />}
              {event.eventDate < new Date() && ["ATTENDED", "CONFIRMED"].includes(myParticipation.status) && (
                <Link
                  href={`/app/events/${id}/feedback`}
                  className="text-xs px-3 py-1.5 border border-teal-300 text-teal-700 rounded-lg hover:bg-teal-100 font-medium"
                >
                  感想を書く
                </Link>
              )}
            </div>
          </div>
        ) : (
          <Link
            href={`/app/events/${id}/apply`}
            className={`block w-full text-center py-3.5 rounded-2xl text-sm font-semibold shadow-sm transition-colors ${
              isFull
                ? "bg-stone-100 text-stone-600 hover:bg-stone-200"
                : "bg-amber-700 text-white hover:bg-amber-800"
            }`}
          >
            {isFull ? "キャンセル待ちに登録する" : "参加申込する"}
          </Link>
        )}
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
      <div className="w-5 shrink-0 mt-0.5">{icon}</div>
      <p className="text-xs text-stone-400 w-12 shrink-0 pt-0.5">{label}</p>
      <p className="text-sm text-stone-700 flex-1">{children}</p>
    </div>
  );
}
