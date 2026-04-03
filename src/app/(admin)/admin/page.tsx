import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardCharts, { ChartDataPoint } from "./DashboardCharts";
import {
  CalendarDays, Users, UserCheck, Calendar,
  Coins, Clock, AlertTriangle, ChevronRight,
  Plus, TrendingUp, BarChart3, Megaphone, FileText, Zap,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (authUser.role === "SUPER_ADMIN") redirect("/superadmin");
  if (authUser.role === "MEMBER") redirect("/app");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const twoWeeksLater = new Date(todayStart.getTime() + 14 * 86400000);
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const currentFiscalYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

  const [
    todayReservations,
    dankaCount,
    goenCount,
    monthlyEventSignups,
    recentReservations,
    recentMembers,
    recentEventSignups,
    upcomingEvents,
    upcomingFollowups,
    recentInteractions,
    unpaidGojikai,
    churnRisk,
  ] = await Promise.all([
    prisma.reservation.count({
      where: {
        templeId: authUser.templeId,
        scheduledAt: { gte: todayStart, lt: todayEnd },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    }),
    prisma.member.count({ where: { templeId: authUser.templeId, type: "DANKA" } }),
    prisma.member.count({ where: { templeId: authUser.templeId, type: "GOEN" } }),
    prisma.eventParticipation.count({
      where: {
        event: { templeId: authUser.templeId },
        status: { in: ["APPLIED", "CONFIRMED", "ATTENDED"] },
        createdAt: { gte: firstOfMonth },
      },
    }),
    prisma.reservation.findMany({
      where: {
        templeId: authUser.templeId,
        scheduledAt: { gte: todayStart, lt: todayEnd },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: { member: { include: { user: { select: { name: true } } } } },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.member.findMany({
      where: { templeId: authUser.templeId, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, type: true },
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
      take: 10,
    }),
    prisma.memberNote.findMany({
      where: { templeId: authUser.templeId, noteType: "INTERACTION" },
      include: {
        member: { include: { user: { select: { name: true } } } },
        author: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.gojikaiPayment.findMany({
      where: {
        member: { templeId: authUser.templeId, type: "DANKA" },
        fiscalYear: currentFiscalYear,
        status: "UNPAID",
      },
      include: { member: { include: { user: { select: { name: true } } } } },
      orderBy: { member: { user: { name: "asc" } } },
      take: 8,
    }),
    prisma.member.findMany({
      where: {
        templeId: authUser.templeId,
        type: "DANKA",
        OR: [
          { lastContactAt: { lte: oneYearAgo } },
          { lastContactAt: null, createdAt: { lte: oneYearAgo } },
        ],
      },
      include: { user: { select: { name: true } } },
      orderBy: [{ lastContactAt: "asc" }],
      take: 5,
    }),
  ]);

  const monthKeys = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const toMonthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const dankaByMonth: Record<string, number> = {};
  const goenByMonth: Record<string, number> = {};
  for (const m of recentMembers) {
    const key = toMonthKey(m.createdAt);
    if (m.type === "DANKA") dankaByMonth[key] = (dankaByMonth[key] ?? 0) + 1;
    else goenByMonth[key] = (goenByMonth[key] ?? 0) + 1;
  }

  const eventsByMonth: Record<string, number> = {};
  for (const s of recentEventSignups) {
    const key = toMonthKey(s.createdAt);
    eventsByMonth[key] = (eventsByMonth[key] ?? 0) + 1;
  }

  const chartData: ChartDataPoint[] = monthKeys.map((key) => ({
    month: key.slice(5).replace(/^0/, "") + "月",
    danka: dankaByMonth[key] ?? 0,
    goen: goenByMonth[key] ?? 0,
    events: eventsByMonth[key] ?? 0,
  }));

  const RESERVATION_TYPE_LABELS: Record<string, string> = {
    ANNUAL_MEMORIAL: "年忌法要",
    MONTHLY_MEMORIAL: "月命日",
    NIBON: "お盆",
    KUYO: "供養",
    FUNERAL: "葬儀",
    OTHER: "その他",
  };

  const todayStr = now.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* ヘッダー */}
      <div>
        <p className="text-xs text-stone-400 font-medium mb-0.5">{todayStr}</p>
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">ダッシュボード</h1>
      </div>

      {/* KPI カード */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={CalendarDays}
          iconBg="bg-amber-50"
          iconColor="text-amber-700"
          label="本日の予約"
          value={todayReservations}
          unit="件"
          href="/admin/reservations"
        />
        <KpiCard
          icon={UserCheck}
          iconBg="bg-amber-50"
          iconColor="text-amber-700"
          label="檀家"
          value={dankaCount}
          unit="名"
          valueColor="text-amber-700"
          href="/admin/members?type=DANKA"
        />
        <KpiCard
          icon={Users}
          iconBg="bg-teal-50"
          iconColor="text-teal-700"
          label="ご縁さん"
          value={goenCount}
          unit="名"
          valueColor="text-teal-700"
          href="/admin/members?type=GOEN"
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

      {/* 本日の予約 & 公開中のイベント */}
      <div className="grid lg:grid-cols-2 gap-4">
        <DashCard
          title="本日の予約"
          icon={CalendarDays}
          iconColor="text-amber-700"
          moreHref="/admin/reservations"
          moreLabel="すべて見る"
        >
          {recentReservations.length === 0 ? (
            <EmptyState text="本日の予約はありません" />
          ) : (
            <ul className="divide-y divide-stone-50">
              {recentReservations.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/reservations/${r.id}`}
                    className="flex items-center justify-between py-3 hover:bg-stone-50 -mx-4 px-4 transition-colors rounded-xl">
                    <div>
                      <p className="text-sm font-semibold text-stone-800">
                        {r.scheduledAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                        <span className="ml-2 font-normal text-stone-600">{r.member.user.name}</span>
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {RESERVATION_TYPE_LABELS[r.type] ?? r.type}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.status === "CONFIRMED"
                        ? "bg-teal-100 text-teal-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {r.status === "CONFIRMED" ? "確定" : "確認待ち"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DashCard>

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
      </div>

      {/* グラフ */}
      <DashboardCharts data={chartData} />

      {/* フォロー予定 & 対応履歴 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <DashCard
          title="フォロー予定（2週間以内）"
          icon={Clock}
          iconColor="text-teal-600"
          moreHref="/admin/members"
          moreLabel="会員一覧"
        >
          {upcomingFollowups.length === 0 ? (
            <EmptyState text="予定はありません" />
          ) : (
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
          )}
        </DashCard>

        <DashCard
          title="最近の対応履歴"
          icon={FileText}
          iconColor="text-stone-500"
          moreHref="/admin/members"
          moreLabel="会員一覧"
        >
          {recentInteractions.length === 0 ? (
            <EmptyState text="対応履歴がありません" />
          ) : (
            <ul className="divide-y divide-stone-50">
              {recentInteractions.map((note) => (
                <li key={note.id}>
                  <Link href={`/admin/members/${note.memberId}`}
                    className="flex items-start gap-3 py-3 hover:bg-stone-50 -mx-4 px-4 transition-colors rounded-xl">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-800">
                        {note.member.user.name}
                        <span className="ml-2 text-xs font-normal text-stone-400">{note.author.name}</span>
                      </p>
                      {note.title && (
                        <p className="text-xs text-stone-600 mt-0.5 truncate">{note.title}</p>
                      )}
                      <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{note.content}</p>
                    </div>
                    <span className="text-xs text-stone-400 shrink-0">
                      {new Date(note.createdAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DashCard>
      </div>

      {/* 未納アラート・離脱予兆・スコアアップ */}
      <div className="grid lg:grid-cols-3 gap-4">
        <DashCard
          title="護持会費 未納"
          icon={Coins}
          iconColor="text-red-500"
          moreHref="/admin/gojikai"
          moreLabel="管理"
          badge={unpaidGojikai.length > 0 ? { count: unpaidGojikai.length, color: "red" } : undefined}
        >
          {unpaidGojikai.length === 0 ? (
            <EmptyState text="未納なし" icon="✓" ok />
          ) : (
            <ul className="divide-y divide-stone-50">
              {unpaidGojikai.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/members/${p.memberId}`}
                    className="flex items-center justify-between py-2.5 hover:bg-stone-50 -mx-4 px-4 transition-colors rounded-xl">
                    <p className="text-sm text-stone-800 font-medium">{p.member.user.name}</p>
                    <span className="text-xs font-bold text-red-600">¥{p.amount.toLocaleString()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DashCard>

        <DashCard
          title="離脱予兆"
          icon={AlertTriangle}
          iconColor="text-orange-500"
          moreHref="/admin/churn"
          moreLabel="詳細"
          badge={churnRisk.length > 0 ? { count: churnRisk.length, color: "orange" } : undefined}
        >
          {churnRisk.length === 0 ? (
            <EmptyState text="問題なし" icon="✓" ok />
          ) : (
            <ul className="divide-y divide-stone-50">
              {churnRisk.map((m) => {
                const lastDate = m.lastContactAt ?? m.createdAt;
                const monthsAgo = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
                return (
                  <li key={m.id}>
                    <Link href={`/admin/members/${m.id}`}
                      className="flex items-center justify-between py-2.5 hover:bg-stone-50 -mx-4 px-4 transition-colors rounded-xl">
                      <p className="text-sm text-stone-800 font-medium">{m.user.name}</p>
                      <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">{monthsAgo}ヶ月前</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </DashCard>

        <DashCard
          title="経営分析"
          icon={TrendingUp}
          iconColor="text-indigo-500"
          moreHref="/admin/analytics/retention"
          moreLabel="詳細"
        >
          <div className="flex flex-col gap-2 py-2">
            <Link href="/admin/analytics/retention"
              className="text-sm text-stone-600 hover:text-amber-700 hover:bg-amber-50 px-3 py-2 rounded-xl -mx-3 transition-colors">
              離脱予測・維持率分析 →
            </Link>
            <Link href="/admin/revenue"
              className="text-sm text-stone-600 hover:text-amber-700 hover:bg-amber-50 px-3 py-2 rounded-xl -mx-3 transition-colors">
              収益レポート →
            </Link>
          </div>
        </DashCard>
      </div>

      {/* クイックアクション */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={14} className="text-amber-600" />
          <h2 className="text-sm font-bold text-stone-700">クイックアクション</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: CalendarDays, label: "予約管理", href: "/admin/reservations", color: "text-amber-700 bg-amber-50" },
            { icon: Users, label: "会員一覧", href: "/admin/members", color: "text-teal-700 bg-teal-50" },
            { icon: Plus, label: "イベント作成", href: "/admin/events/new", color: "text-sky-700 bg-sky-50" },
            { icon: Megaphone, label: "お知らせ作成", href: "/admin/announcements/new", color: "text-purple-700 bg-purple-50" },
            { icon: TrendingUp, label: "イベント分析", href: "/admin/events/analytics", color: "text-indigo-700 bg-indigo-50" },
            { icon: BarChart3, label: "機能利用ログ", href: "/admin/analytics/features", color: "text-stone-700 bg-stone-100" },
            { icon: AlertTriangle, label: "離脱予兆", href: "/admin/churn", color: "text-orange-700 bg-orange-50" },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} href={action.href}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-stone-100 hover:border-amber-200 hover:shadow-sm transition-all bg-stone-50/50">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${action.color}`}>
                  <Icon size={14} strokeWidth={1.8} />
                </div>
                <span className="text-xs font-medium text-stone-700">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
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
  title, icon: Icon, iconColor, moreHref, moreLabel, badge, children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  iconColor: string;
  moreHref: string;
  moreLabel: string;
  badge?: { count: number; color: "red" | "orange" };
  children: React.ReactNode;
}) {
  const badgeColors = {
    red: "bg-red-100 text-red-700",
    orange: "bg-orange-100 text-orange-700",
  };
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon size={14} strokeWidth={1.8} className={iconColor} />
          <h2 className="font-semibold text-stone-800 text-sm">{title}</h2>
          {badge && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeColors[badge.color]}`}>
              {badge.count}
            </span>
          )}
        </div>
        <Link href={moreHref} className="text-xs text-amber-700 hover:text-amber-900 font-medium flex items-center gap-0.5">
          {moreLabel}<ChevronRight size={12} />
        </Link>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ text, icon, ok }: { text: string; icon?: string; ok?: boolean }) {
  return (
    <p className={`text-sm text-center py-5 ${ok ? "text-teal-600 font-medium" : "text-stone-400"}`}>
      {icon && <span className="mr-1">{icon}</span>}{text}
    </p>
  );
}
