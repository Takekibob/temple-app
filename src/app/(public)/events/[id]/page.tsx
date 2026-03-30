import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

const CATEGORY_LABELS: Record<string, string> = {
  ZAZEN: "坐禅",
  SHAKYO: "写経",
  YOGA: "ヨガ",
  MINDFULNESS: "マインドフルネス",
  LECTURE: "仏事講座",
  SEASONAL: "季節行事",
  OTHER: "その他",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await prisma.event.findFirst({
    where: { id, status: "PUBLISHED" },
    include: { temple: { select: { name: true } } },
  });

  if (!event || event.visibility === "DANKA_ONLY") {
    return { title: "てらログ" };
  }

  const dateStr = event.eventDate.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const description =
    event.description?.slice(0, 120) ??
    `${event.temple.name}主催のイベントです。${dateStr} ${event.startTime}〜`;

  return {
    title: `${event.title} | ${event.temple.name} | てらログ`,
    description,
    openGraph: {
      title: event.title,
      description,
      images: event.imageUrl ? [{ url: event.imageUrl }] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
    },
  };
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, status: "PUBLISHED" },
    include: {
      temple: { select: { name: true, denomination: true } },
      _count: {
        select: {
          participations: { where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } } },
        },
      },
    },
  });

  if (!event) notFound();

  // 檀家限定イベントは非公開メッセージを表示
  if (event.visibility === "DANKA_ONLY") {
    return (
      <div className="text-center py-20">
        <p className="text-5xl mb-4">🔒</p>
        <h1 className="text-xl font-bold text-stone-800 mb-2">檀家限定イベント</h1>
        <p className="text-sm text-stone-500">
          このイベントは寺院の檀家の方のみご参加いただけます。
        </p>
        <Link href="/" className="mt-6 inline-block text-sm text-amber-700 hover:underline">
          ホームへ戻る
        </Link>
      </div>
    );
  }

  const participantCount = event._count.participations;
  const isFull = event.capacity != null && participantCount >= event.capacity;
  const remaining = event.capacity != null ? event.capacity - participantCount : null;

  const dateStr = event.eventDate.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  return (
    <div className="max-w-lg mx-auto">
      {/* カバー画像 */}
      {event.imageUrl ? (
        <div className="relative h-56 rounded-2xl overflow-hidden mb-6 bg-stone-200">
          <Image src={event.imageUrl} alt={event.title} fill className="object-cover" />
        </div>
      ) : (
        <div className="h-24 rounded-2xl bg-gradient-to-b from-amber-50 to-stone-100 mb-6" />
      )}

      {/* カテゴリバッジ */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
          {CATEGORY_LABELS[event.category] ?? event.category}
        </span>
      </div>

      <h1 className="text-2xl font-bold text-stone-800">{event.title}</h1>
      <p className="text-sm text-amber-700 mt-1">
        🏯 {event.temple.name}
        {event.temple.denomination && `（${event.temple.denomination}）`}
      </p>

      {/* 詳細情報 */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 mt-4 space-y-3 text-sm">
        <div className="flex gap-3">
          <span className="text-stone-400 w-16 shrink-0">日時</span>
          <span className="text-stone-800">
            {dateStr}
            <br />
            {event.startTime} 〜 {event.endTime}
          </span>
        </div>
        {event.location && (
          <div className="flex gap-3">
            <span className="text-stone-400 w-16 shrink-0">会場</span>
            <span className="text-stone-800">{event.location}</span>
          </div>
        )}
        <div className="flex gap-3">
          <span className="text-stone-400 w-16 shrink-0">参加費</span>
          <span className="font-semibold text-amber-700">
            {event.fee === 0 ? "無料" : `¥${event.fee.toLocaleString()}`}
          </span>
        </div>
        {event.capacity != null && (
          <div className="flex gap-3">
            <span className="text-stone-400 w-16 shrink-0">定員</span>
            <span className="text-stone-800">
              {event.capacity}名
              {remaining != null && (
                <span className={remaining <= 5 ? "text-rose-600 font-medium" : "text-stone-500"}>
                  （残{Math.max(0, remaining)}席）
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* イベント説明 */}
      {event.description && (
        <div className="mt-5">
          <h2 className="font-semibold text-stone-800 mb-2">詳細</h2>
          <p className="text-sm text-stone-600 whitespace-pre-wrap leading-relaxed">
            {event.description}
          </p>
        </div>
      )}

      {/* 参加申込 CTA */}
      <div className="mt-8 p-5 bg-amber-50 rounded-2xl border border-amber-100 text-center">
        <p className="text-sm text-stone-700 mb-4">
          参加申込には<strong>てらログ</strong>への無料会員登録が必要です
        </p>
        <Link
          href={`/auth/register?next=/app/events/${id}/apply`}
          className={`block w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors ${
            isFull ? "bg-stone-400" : "bg-amber-700 hover:bg-amber-800"
          }`}
        >
          {isFull ? "満席（キャンセル待ちに登録する）" : "無料登録して申込む"}
        </Link>
        <p className="text-xs text-stone-400 mt-3">
          すでに会員の方は
          <Link
            href={`/?next=/app/events/${id}`}
            className="text-amber-700 hover:underline ml-1"
          >
            こちらからログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
