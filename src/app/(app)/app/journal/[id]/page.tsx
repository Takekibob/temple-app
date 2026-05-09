import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ArticleRenderer from "@/components/teralog/ArticleRenderer";
import { getMoodIcon, getMoodLabel } from "@/lib/journalMoods";
import JournalEditToggle from "./JournalEditToggle";

type Props = { params: Promise<{ id: string }> };

export default async function JournalDetailPage({ params }: Props) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const { id } = await params;

  const journal = await prisma.journal.findFirst({
    where: { id, userId: authUser.id },
    include: { relatedEvent: { select: { id: true, title: true, eventDate: true } } },
  });

  if (!journal) notFound();

  const DAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;
  const d = new Date(journal.entryDate);
  const dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${DAYS[d.getDay()]}）`;

  // 編集用イベント一覧（過去30日の参加）
  const memberId = authUser.member?.id;
  const recentEvents = memberId
    ? await prisma.eventParticipation.findMany({
        where: {
          memberId,
          status: { in: ["APPLIED", "CONFIRMED"] },
          event: { eventDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
        },
        include: { event: { select: { id: true, title: true, eventDate: true } } },
        orderBy: { event: { eventDate: "desc" } },
        take: 20,
      }).then((ps) => ps.map((p) => ({
        id: p.event.id,
        title: p.event.title,
        eventDate: p.event.eventDate,
      })))
    : [];

  return (
    <div className="max-w-lg mx-auto pb-28">
      <div className="px-5 pt-6">
        <Link href="/app/journal" className="font-serif text-[11px] text-ink-tertiary tracking-section block mb-5">
          ← 学びの日記
        </Link>
      </div>

      <div className="px-5">
        {/* 日付 + mood */}
        <div className="flex items-baseline justify-between mb-3">
          <time className="font-serif text-sm text-ink-tertiary font-light">{dateStr}</time>
          {journal.mood && (
            <span className="font-serif text-sm text-ink-secondary">
              {getMoodIcon(journal.mood)} {getMoodLabel(journal.mood)}
            </span>
          )}
        </div>

        {/* タイトル */}
        {journal.title && (
          <h1 className="font-serif text-xl text-ink font-medium leading-snug mb-4">
            {journal.title}
          </h1>
        )}

        {/* 関連イベント */}
        {journal.relatedEvent && (
          <div className="mb-5 p-3 bg-paper-soft border-[0.5px] border-border">
            <p className="font-serif text-[11px] text-ink-tertiary tracking-section mb-0.5">関連イベント</p>
            <p className="font-serif text-sm text-ink font-light">{journal.relatedEvent.title}</p>
          </div>
        )}

        {/* タグ */}
        {journal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {journal.tags.map((tag) => (
              <span key={tag} className="font-sans text-[11px] text-ink-tertiary bg-paper-soft px-2 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        )}

        <hr style={{ border: "none", borderTop: "0.5px solid #E5E5E5", marginBottom: "1.5rem" }} />

        {/* 本文 */}
        <ArticleRenderer content={journal.content} />

        {/* 編集 / 削除 — クライアントコンポーネント */}
        <JournalEditToggle
          journalId={journal.id}
          initialData={{
            id: journal.id,
            title: journal.title,
            content: journal.content,
            mood: journal.mood as string | null,
            tags: journal.tags,
            entryDate: journal.entryDate,
            relatedEventId: journal.relatedEventId,
          }}
          recentEvents={recentEvents}
        />
      </div>
    </div>
  );
}
