"use client";

import { useState, useTransition } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsData {
  event: {
    id: string;
    title: string;
    eventDate: string;
    startTime: string | null;
    endTime: string | null;
    capacity: number | null;
    category: string;
    fee: number;
    status: string;
  };
  kpi: {
    total: number;
    active: number;
    feedbackCount: number;
    avgScore: number | null;
    fillRate: number | null;
  };
  statusCounts: {
    applied: number;
    confirmed: number;
    waitlisted: number;
    attended: number;
    no_show: number;
    cancelled: number;
  };
  dailyTrend: { date: string; count: number }[];
  referralBreakdown: { source: string; label: string; count: number }[];
  memberTypeBreakdown: { type: string; label: string; count: number }[];
  scoreDistribution: { star: number; count: number }[];
  feedbackList: { name: string; score: number; comment: string | null }[];
  shareUrl: string;
}

const PIE_COLORS = ["#92400e", "#d97706", "#fbbf24", "#fde68a"];

export default function EventDetailAnalyticsClient({ data }: { data: AnalyticsData }) {
  const {
    event,
    kpi,
    statusCounts,
    dailyTrend,
    referralBreakdown,
    memberTypeBreakdown,
    scoreDistribution,
    feedbackList,
    shareUrl,
  } = data;

  const [isPending, startTransition] = useTransition();
  const [notifyResult, setNotifyResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: event.title, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }

  function handleSendFeedbackRequest() {
    startTransition(async () => {
      setNotifyResult(null);
      const res = await fetch(`/api/events/${event.id}/send-feedback-request`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        setNotifyResult(`✓ ${json.sent ?? 0}名にアンケート依頼を送信しました`);
      } else {
        setNotifyResult(`エラー: ${json.error ?? "送信に失敗しました"}`);
      }
    });
  }

  const statusRows = [
    { label: "申込済", count: statusCounts.applied, color: "bg-blue-100 text-blue-800" },
    { label: "確定", count: statusCounts.confirmed, color: "bg-teal-100 text-teal-800" },
    { label: "キャンセル待ち", count: statusCounts.waitlisted, color: "bg-amber-100 text-amber-800" },
    { label: "参加済", count: statusCounts.attended, color: "bg-green-100 text-green-800" },
    { label: "不参加", count: statusCounts.no_show, color: "bg-red-100 text-red-700" },
    { label: "キャンセル", count: statusCounts.cancelled, color: "bg-stone-100 text-stone-500" },
  ];

  return (
    <div className="space-y-5">
      {/* ── ヘッダー ── */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <p className="text-sm text-stone-500">{event.eventDate}</p>
        <h1 className="text-xl font-bold text-stone-800 mt-0.5">{event.title}</h1>
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-stone-500">
          <span>{event.category}</span>
          {event.startTime && (
            <span>
              {event.startTime}〜{event.endTime}
            </span>
          )}
          {event.capacity && <span>定員 {event.capacity}名</span>}
          <span>{event.fee === 0 ? "無料" : `¥${event.fee.toLocaleString()}`}</span>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <button
            onClick={handleShare}
            className="text-xs px-3 py-1.5 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 transition-colors"
          >
            {copied ? "✓ URLをコピーしました" : "🔗 SNS共有 / URLコピー"}
          </button>
          {event.status === "COMPLETED" && (
            <button
              onClick={handleSendFeedbackRequest}
              disabled={isPending}
              className="text-xs px-3 py-1.5 bg-amber-700 text-white rounded-lg hover:bg-amber-800 disabled:opacity-50 transition-colors"
            >
              {isPending ? "送信中…" : "📩 アンケート依頼を送信"}
            </button>
          )}
        </div>
        {notifyResult && (
          <p
            className={`text-xs mt-2 ${
              notifyResult.startsWith("✓") ? "text-teal-600" : "text-red-600"
            }`}
          >
            {notifyResult}
          </p>
        )}
      </div>

      {/* ── KPIカード ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="申込総数" value={`${kpi.total}名`} />
        <KpiCard label="有効参加" value={`${kpi.active}名`} />
        <KpiCard
          label="充足率"
          value={kpi.fillRate != null ? `${kpi.fillRate}%` : "—"}
          sub={event.capacity ? `定員 ${event.capacity}名` : undefined}
        />
        <KpiCard
          label="平均評価"
          value={kpi.avgScore != null ? `${kpi.avgScore} / 5` : "—"}
          sub={kpi.feedbackCount > 0 ? `${kpi.feedbackCount}件の回答` : "回答なし"}
        />
      </div>

      {/* ── ステータス内訳 ── */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <h2 className="text-sm font-semibold text-stone-700 mb-3">参加状況の内訳</h2>
        <div className="flex flex-wrap gap-2">
          {statusRows.map((row) => (
            <div key={row.label} className={`px-3 py-1.5 rounded-lg ${row.color}`}>
              <span className="text-xs font-medium">{row.label}</span>
              <span className="ml-1.5 font-bold">{row.count}</span>
              <span className="text-xs ml-0.5">名</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 申込推移 ── */}
      <section className="bg-white rounded-xl border border-stone-200 p-4">
        <h2 className="text-sm font-semibold text-stone-700 mb-3">申込の推移（日別）</h2>
        {dailyTrend.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-6">まだデータがありません</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                labelFormatter={(v) => `${v}`}
                formatter={(v) => [`${v}名`, "申込数"]}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#b45309"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* ── 流入経路 + 会員種別 ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <section className="bg-white rounded-xl border border-stone-200 p-4">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">流入経路</h2>
          {referralBreakdown.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-6">まだデータがありません</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={referralBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={72} />
                <Tooltip formatter={(v) => [`${v}名`, "人数"]} />
                <Bar dataKey="count" fill="#b45309" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

        <section className="bg-white rounded-xl border border-stone-200 p-4">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">会員種別</h2>
          {memberTypeBreakdown.every((m) => m.count === 0) ? (
            <p className="text-sm text-stone-400 text-center py-6">まだデータがありません</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={memberTypeBreakdown}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={65}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                >
                  {memberTypeBreakdown.map((_entry, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v}名`]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      {/* ── フィードバック集計 ── */}
      <section className="bg-white rounded-xl border border-stone-200 p-4">
        <h2 className="text-sm font-semibold text-stone-700 mb-3">
          フィードバック集計（{kpi.feedbackCount}件）
        </h2>
        {kpi.feedbackCount === 0 ? (
          <p className="text-sm text-stone-400 text-center py-4">まだ回答がありません</p>
        ) : (
          <>
            {/* 平均スコア */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl font-bold text-amber-600">{kpi.avgScore}</span>
              <div>
                <div className="text-amber-400 text-lg leading-none">
                  {"★".repeat(Math.round(kpi.avgScore ?? 0))}
                  {"☆".repeat(5 - Math.round(kpi.avgScore ?? 0))}
                </div>
                <p className="text-xs text-stone-400">{kpi.feedbackCount}件の回答</p>
              </div>
            </div>

            {/* スコア分布 */}
            <div className="mb-4">
              <ResponsiveContainer width="100%" height={120}>
                <BarChart
                  data={scoreDistribution}
                  margin={{ top: 0, right: 8, left: -20, bottom: 0 }}
                >
                  <XAxis
                    dataKey="star"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `★${v}`}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(v) => [`${v}件`, "回答数"]}
                    labelFormatter={(v) => `★${v}`}
                  />
                  <Bar dataKey="count" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* コメント一覧 */}
            {feedbackList.some((f) => f.comment) && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-stone-500 mb-2">コメント（新しい順）</p>
                {feedbackList.map((f, i) => (
                  <div key={i} className="border border-stone-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-amber-400 text-sm">
                        {"★".repeat(f.score)}{"☆".repeat(5 - f.score)}
                      </span>
                      <span className="text-xs text-stone-400">{f.name}</span>
                    </div>
                    {f.comment && (
                      <p className="text-sm text-stone-600 leading-relaxed">{f.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-2xl font-bold text-stone-800 mt-1">{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
    </div>
  );
}
