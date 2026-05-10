import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCategoryLabel, getCategoryIcon } from "@/lib/eventCategories";
import { BookOpen, Clock, ChevronRight, CheckCircle, Users, PenLine } from "lucide-react";

function CategoryLabel({ category }: { category: string }) {
  const Icon = getCategoryIcon(category);
  return <><Icon size={12} className="inline mr-1" />{getCategoryLabel(category)}</>;
}

const STATUS_LABELS: Record<string, string> = {
  APPLIED: "確認待ち",
  CONFIRMED: "参加確定",
  WAITLISTED: "キャンセル待ち",
  ATTENDED: "参加済み",
  NO_SHOW: "不参加",
  CANCELLED: "キャンセル",
};

const STATUS_STYLES: Record<string, string> = {
  APPLIED: "bg-amber-50 text-amber-700 border border-amber-200",
  CONFIRMED: "bg-teal-50 text-teal-700 border border-teal-200",
  WAITLISTED: "bg-stone-100 text-stone-500",
  ATTENDED: "bg-green-50 text-green-700 border border-green-200",
  NO_SHOW: "bg-stone-100 text-stone-400",
  CANCELLED: "bg-stone-100 text-stone-400",
};

export default async function MyEventsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (!authUser.member) redirect("/app");

  const participations = await prisma.eventParticipation.findMany({
    where: { memberId: authUser.member.id },
    include: { event: true },
    orderBy: { event: { eventDate: "asc" } },
  });

  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const upcoming = participations.filter(
    (p) => p.event.eventDate >= now && p.status !== "CANCELLED"
  );
  const allPast = participations.filter(
    (p) => p.event.eventDate < now || p.status === "CANCELLED"
  );
  const recentPast = allPast.filter((p) => p.event.eventDate >= oneYearAgo);
  const olderCount = allPast.filter((p) => p.event.eventDate < oneYearAgo).length;

  const next = upcoming[0] ?? null;

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold text-stone-800 tracking-tight">申込済みイベント</h1>
        <Link
          href="/app/events"
          className="flex items-center gap-1 text-xs text-amber-700 font-semibold bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 hover:bg-amber-100 transition-colors"
        >
          <BookOpen size={12} />
          一覧へ
        </Link>
      </div>

      <div className="px-4 space-y-5">
        {upcoming.length === 0 && allPast.length === 0 && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <BookOpen size={22} className="text-amber-600" />
            </div>
            <p className="text-stone-500 text-sm font-medium mb-1">申込中のイベントはありません</p>
            <Link href="/app/events" className="text-amber-700 text-sm font-semibold hover:underline">
              イベントを探す →
            </Link>
          </div>
        )}

        {/* 直近の申込ハイライト */}
        {next && (
          <Link
            href={`/app/events/${next.event.id}`}
            className="block bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-5 shadow-md text-white hover:from-teal-700 hover:to-teal-900 transition-colors"
          >
            <p className="text-xs font-semibold text-teal-200 uppercase tracking-widest mb-2">次のイベント</p>
            <p className="text-xs text-teal-200 mb-1"><CategoryLabel category={next.event.category} /></p>
            <p className="font-serif text-xl font-bold mb-3 leading-snug">{next.event.title}</p>
            <div className="flex items-center gap-4 text-sm text-teal-100">
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                {next.event.eventDate.toLocaleDateString("ja-JP", {
                  month: "long", day: "numeric", weekday: "short",
                })}
                {" "}{next.event.startTime}
              </span>
              {next.numGuests > 1 && (
                <span className="flex items-center gap-1.5">
                  <Users size={14} />
                  {next.numGuests}名
                </span>
              )}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/20 text-white`}>
                {STATUS_LABELS[next.status]}
              </span>
              <ChevronRight size={18} className="text-teal-300" />
            </div>
          </Link>
        )}

        {/* その他の予定（2件目以降） */}
        {upcoming.length > 1 && (
          <section>
            <SectionLabel>その他の予定</SectionLabel>
            <div className="space-y-2.5">
              {upcoming.slice(1).map((p) => (
                <ParticipationRow key={p.id} p={p} />
              ))}
            </div>
          </section>
        )}

        {/* 過去の参加履歴 */}
        {recentPast.length > 0 && (
          <section>
            <SectionLabel>過去の履歴（直近1年）</SectionLabel>
            <div className="space-y-2.5">
              {recentPast.map((p) => (
                <ParticipationRow key={p.id} p={p} past />
              ))}
            </div>
            {olderCount > 0 && (
              <p className="text-xs text-stone-400 text-center mt-3">
                他に{olderCount}件の参加履歴があります（1年以上前）
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function ParticipationRow({
  p,
  past,
}: {
  p: {
    id: string;
    status: string;
    numGuests: number;
    event: { id: string; title: string; category: string; eventDate: Date; startTime: string };
  };
  past?: boolean;
}) {
  const canFeedback = past && ["ATTENDED", "CONFIRMED"].includes(p.status);

  return (
    <div className={`bg-white rounded-2xl border ${past ? "border-stone-100" : "border-stone-100"}`}>
      <Link
        href={`/app/events/${p.event.id}`}
        className={`flex items-center justify-between p-4 transition-all hover:opacity-80 ${canFeedback ? "" : "rounded-2xl"}`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            past ? "bg-stone-100" : "bg-teal-50"
          }`}>
            <BookOpen size={15} className={past ? "text-stone-400" : "text-teal-600"} />
          </div>
          <div>
            <p className="text-xs text-stone-400 mb-0.5">
              <CategoryLabel category={p.event.category} />
            </p>
            <p className={`font-serif text-sm font-semibold leading-snug ${past ? "text-stone-500" : "text-stone-800"}`}>
              {p.event.title}
            </p>
            <p className="text-xs text-stone-400 mt-0.5">
              {p.event.eventDate.toLocaleDateString("ja-JP", {
                month: "long", day: "numeric", weekday: "short",
              })}
              {" "}{p.event.startTime}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[p.status]}`}>
            {STATUS_LABELS[p.status]}
          </span>
          <ChevronRight size={15} className="text-stone-300" />
        </div>
      </Link>
      {canFeedback && (
        <div className="border-t border-stone-50 px-4 pb-3 pt-2.5">
          <Link
            href={`/app/events/${p.event.id}/feedback`}
            className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <PenLine size={12} />
            感想を書く
          </Link>
        </div>
      )}
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
