import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription";
import CancelButton from "./CancelButton";
import ShareButton from "@/components/shared/ShareButton";

import { getCategoryLabel } from "@/lib/eventCategories";

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
  const isDanka = authUser.member?.type === "DANKA";

  // マルチテンプル対応: templeId フィルタを外し全寺院のイベントを参照可能に
  const event = await prisma.event.findFirst({
    where: { id, status: "PUBLISHED" },
    include: {
      temple: { select: { id: true, name: true, denomination: true, templePage: { select: { slug: true, isPublished: true } } } },
      _count: {
        select: { participations: { where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } } } },
      },
    },
  });

  if (!event) notFound();

  // Visibility check: DANKA_ONLY は自寺院の檀家のみ
  if (event.visibility === "DANKA_ONLY") {
    const isMyTempleDanka = isDanka && authUser.member?.templeId === event.templeId;
    if (!isMyTempleDanka) redirect("/app/events");
  }

  // Visibility check: SUBSCRIBERS_ONLY は会員プラン加入者のみ
  if (event.visibility === "SUBSCRIBERS_ONLY") {
    if (!authUser.member) redirect("/app/events");
    const isSubscriber = await hasActiveSubscription(authUser.member.id, event.templeId);
    if (!isSubscriber) redirect("/app/subscriptions");
  }

  // My participation
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

  return (
    <div className="max-w-lg mx-auto">
      {/* Cover image */}
      {event.imageUrl ? (
        <div className="relative h-48 bg-stone-200 overflow-hidden">
          <Image src={event.imageUrl} alt={event.title} fill className="object-cover" />
        </div>
      ) : (
        <div className="h-24 bg-gradient-to-b from-amber-50 to-stone-50" />
      )}

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Link href="/app/events" className="text-sm text-stone-400 hover:text-stone-600">
            ← イベント一覧
          </Link>
          <ShareButton title={event.title} />
        </div>

        <div className="flex items-start gap-2 mb-1">
          <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
            {getCategoryLabel(event.category)}
          </span>
          {event.visibility === "DANKA_ONLY" && (
            <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
              檀家限定
            </span>
          )}
          {event.visibility === "SUBSCRIBERS_ONLY" && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              会員限定
            </span>
          )}
        </div>

        <h1 className="text-xl font-bold text-stone-800 mt-2">{event.title}</h1>
        <Link href={`/app/temples/${event.temple.id}`}
          className="inline-flex items-center gap-1 text-xs text-amber-700 hover:underline mt-1">
          🏯 {event.temple.name}
          {event.temple.denomination && `（${event.temple.denomination}）`}
        </Link>
        {event.temple.templePage?.isPublished && event.temple.templePage.slug && (
          <div className="mt-2">
            <Link
              href={`/temples/p/${event.temple.templePage.slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-amber-700 border border-stone-200 hover:border-amber-300 rounded-lg px-2.5 py-1 transition-colors"
            >
              🌐 寺院の公式ページを見る
            </Link>
          </div>
        )}

        {/* Info */}
        <div className="bg-white rounded-xl border border-stone-200 p-4 mt-4 space-y-3 text-sm">
          <div className="flex gap-3">
            <span className="text-stone-400 w-16">日時</span>
            <span className="text-stone-800">
              {event.eventDate.toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "short",
              })}
              <br />
              {event.startTime} 〜 {event.endTime}
            </span>
          </div>
          {event.location && (
            <div className="flex gap-3">
              <span className="text-stone-400 w-16">会場</span>
              <span className="text-stone-800">{event.location}</span>
            </div>
          )}
          <div className="flex gap-3">
            <span className="text-stone-400 w-16">参加費</span>
            <span className="font-semibold text-amber-700">
              {event.fee === 0 ? "無料" : `¥${event.fee.toLocaleString()}`}
            </span>
          </div>
          <div className="flex gap-3">
            <span className="text-stone-400 w-16">定員</span>
            <span className="text-stone-800">
              {event.capacity
                ? `${event.capacity}名（残${Math.max(0, remaining ?? 0)}席）`
                : "定員なし"}
            </span>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <div className="mt-4">
            <h2 className="font-semibold text-stone-800 mb-2">詳細</h2>
            <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed">
              {event.description}
            </p>
          </div>
        )}

        {/* Participation status / CTA */}
        <div className="mt-6">
          {!authUser.member ? (
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-center text-sm text-stone-500">
              参加申込には会員登録が必要です
              <br />
              <Link href="/auth/register" className="text-amber-700 font-medium hover:underline">
                新規登録はこちら
              </Link>
            </div>
          ) : myParticipation ? (
            <div className="p-4 bg-teal-50 rounded-xl border border-teal-200">
              <p className="text-sm font-medium text-teal-800">
                {PARTICIPATION_STATUS_LABELS[myParticipation.status] ?? myParticipation.status}
              </p>
              <p className="text-xs text-teal-600 mt-0.5">{myParticipation.numGuests}名で申込済み</p>
              <div className="flex gap-2 mt-3">
                <CancelButton eventId={id} />
                {["ATTENDED", "CONFIRMED", "APPLIED"].includes(myParticipation.status) && (
                  <Link
                    href={`/app/events/${id}/feedback`}
                    className="text-xs px-3 py-1.5 border border-teal-300 text-teal-700 rounded-lg hover:bg-teal-100"
                  >
                    感想を書く
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <Link
              href={`/app/events/${id}/apply`}
              className={`block w-full text-center py-3 rounded-xl text-sm font-semibold transition-colors ${
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
    </div>
  );
}

