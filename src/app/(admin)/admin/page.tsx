import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardCharts, { ChartDataPoint } from "./DashboardCharts";
import {
  Users, Calendar,
  Clock, ChevronRight,
  Plus, Bell,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (authUser.role === "SUPER_ADMIN") redirect("/superadmin");
  if (authUser.role === "MEMBER") redirect("/app");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const twoWeeksLater = new Date(todayStart.getTime() + 14 * 86400000);
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    followerCount,
    memberCount,
    monthlyEventSignups,
    recentFollowers,
    recentEventSignups,
    upcomingEvents,
    upcomingFollowups,
  ] = await Promise.all([
    prisma.memberFavoriteTemple.count({ where: { templeId: authUser.templeId } }),
    prisma.member.count({ where: { templeId: authUser.templeId } }),
    prisma.eventParticipation.count({
      where: {
        event: { templeId: authUser.templeId },
        status: { in: ["APPLIED", "CONFIRMED", "ATTENDED"] },
        createdAt: { gte: firstOfMonth },
      },
    }),
    prisma.memberFavoriteTemple.findMany({
      where: { templeId: authUser.templeId, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    }),
    prisma.eventParticipation.findMany({
      where: {
        event: { templeId: authUser.templeId },
        createdAt: { gte: sixMonthsAgo },
        status: { notIn: ["CANCELLED"] },
      },
      select: { createdAt: true },
    }),
    prisma.event.findMany({
      where: {
        templeId: authUser.templeId,
        status: "PUBLISHED",
        eventDate: { gte: now },
      },
      include: {
        _count: {
          select: {
            participations: { where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } } },
          },
        },
      },
      orderBy: { eventDate: "asc" },
      take: 5,
    }),
    prisma.memberNote.findMany({
      where: {
        templeId: authUser.templeId,
        noteType: "FOLLOWUP",
        isResolved: false,
        followupDate: { gte: todayStart, lte: twoWeeksLater },
      },
      include: { member: { include: { user: { select: { name: true } } } } },
      orderBy: { followupDate: "asc" },
      take: 8,
    }),
  ]);

  const monthKeys = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const toMonthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const followersByMonth: Record<string, number> = {};
  for (const f of recentFollowers) {
    const key = toMonthKey(f.createdAt);
    followersByMonth[key] = (followersByMonth[key] ?? 0) + 1;
  }

  const eventsByMonth: Record<string, number> = {};
  for (const s of recentEventSignups) {
    const key = toMonthKey(s.createdAt);
    eventsByMonth[key] = (eventsByMonth[key] ?? 0) + 1;
  }

  const chartData: ChartDataPoint[] = monthKeys.map((key) => ({
    month: key.slice(5).replace(/^0/, "") + "月",
    followers: followersByMonth[key] ?? 0,
    events: eventsByMonth[key] ?? 0,
  }));

  const todayStr = now.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });

  return (
    <div className="p-4 sm:p-6 max-w-5xl space-y-6">
      {/* ヘッダー + クイックアクション */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <p className="text-xs text-stone-400 font-medium mb-0.5">{todayStr}</p>
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">ダッシュボード</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/events/new"
            className="flex items-center gap-1.5 text-xs font-semibold bg-amber-700 text-white px-3 py-2 rounded-xl hover:bg-amber-800 transition-colors shadow-sm"
          >
            <Plus size={13} />
            イベント作成
          </Link>
          <Link
            href="/admin/announcements/new"
            className="flex items-center gap-1.5 text-xs font-semibold bg-white text-stone-700 border border-stone-200 px-3 py-2 rounded-xl hover:bg-stone-50 transition-colors shadow-sm"
          >
            <Bell size={13} />
            お知らせ作成
          </Link>
        </div>
      </div>

      {/* KPI カード */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard
          icon={Users}
          iconBg="bg-teal-50"
          iconColor="text-teal-700"
          label="メンバー"
          value={memberCount}
          unit="名"
          valueColor="text-teal-700"
          href="/admin/members"
        />
        <KpiCard
          icon={Users}
          iconBg="bg-rose-50"
          iconColor="text-rose-500"
          label="フォロワー"
          value={followerCount}
          unit="名"
          href="/admin/members"
        />
        <KpiCard
          icon={Calendar}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          label="今月の申込"
          value={monthlyEventSignups}
          unit="件"
          href="/admin/events"
        />
      </div>

      {/* 公開中のイベント */}
      <DashCard
        title="公開中のイベント"
        icon={Calendar}
        iconColor="text-sky-600"
        moreHref="/admin/events"
        moreLabel="すべて見る"
      >
        {upcomingEvents.length === 0 ? (
          <EmptyState text="公開中のイベントはありません" />
        ) : (
          <ul className="divide-y divide-stone-50">
            {upcomingEvents.map((e) => (
              <li key={e.id}>
                <Link href={`/admin/events/${e.id}/participants`}
                  className="flex items-center justify-between py-3 hover:bg-stone-50 -mx-4 px-4 transition-colors rounded-xl">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-stone-800 truncate">{e.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {e.eventDate.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
                      {" "}{e.startTime}
                    </p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <span className="text-sm font-bold text-stone-800">
                      {e._count.participations}
                      {e.capacity ? `/${e.capacity}` : ""}
                    </span>
                    <span className="text-xs text-stone-400 ml-0.5">名</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DashCard>

      {/* 月別グラフ */}
      <DashboardCharts data={chartData} />

      {/* フォロー予定 */}
      {upcomingFollowups.length > 0 && (
        <DashCard
          title="フォロー予定（2週間以内）"
          icon={Clock}
          iconColor="text-teal-600"
          moreHref="/admin/members"
          moreLabel="メンバー一覧"
        >
          <ul className="divide-y divide-stone-50">
            {upcomingFollowups.map((note) => (
              <li key={note.id}>
                <Link href={`/admin/members/${note.memberId}`}
                  className="flex items-start gap-3 py-3 hover:bg-stone-50 -mx-4 px-4 transition-colors rounded-xl">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-stone-800">{note.member.user.name}</p>
                    {note.title && (
                      <p className="text-xs text-stone-600 mt-0.5 truncate">{note.title}</p>
                    )}
                    <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{note.content}</p>
                  </div>
                  <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full shrink-0">
                    {note.followupDate
                      ? new Date(note.followupDate).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })
                      : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </DashCard>
      )}
    </div>
  );
}

// ── 共通コンポーネント ────────────────────────────────────────────

function KpiCard({
  icon: Icon, iconBg, iconColor, label, value, unit, valueColor = "text-stone-800", href,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number;
  unit: string;
  valueColor?: string;
  href: string;
}) {
  return (
    <Link href={href}
      className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 hover:shadow-md hover:border-amber-200 transition-all">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-3 ${iconBg}`}>
        <Icon size={16} strokeWidth={1.8} className={iconColor} />
      </div>
      <p className="text-xs text-stone-500 font-medium mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${valueColor}`}>{value.toLocaleString()}</span>
        <span className="text-xs text-stone-400">{unit}</span>
      </div>
    </Link>
  );
}

function DashCard({
  title, icon: Icon, iconColor, moreHref, moreLabel, children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  iconColor: string;
  moreHref: string;
  moreLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={14} strokeWidth={1.8} className={iconColor} />
          <h2 className="font-semibold text-stone-800 text-sm">{title}</h2>
        </div>
        <Link href={moreHref} className="text-xs text-amber-700 hover:text-amber-900 font-medium flex items-center gap-0.5">
          {moreLabel}<ChevronRight size={12} />
        </Link>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="text-sm text-center py-5 text-stone-400">{text}</p>
  );
}
