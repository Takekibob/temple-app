"use client";

import {
  LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

interface AnalyticsData {
  event: { id: string; title: string; eventDate: string; capacity: number | null };
  kpi: {
    total: number;
    confirmed: number;
    feedbackCount: number;
    avgScore: number | null;
    fillRate: number | null;
  };
  dailyTrend: { date: string; count: number }[];
  referralBreakdown: { source: string; label: string; count: number }[];
  memberTypeBreakdown: { type: string; label: string; count: number }[];
  feedbackList: { name: string; score: number; comment: string | null }[];
}

const PIE_COLORS = ["#92400e", "#d97706", "#fbbf24", "#fde68a"];

export default function EventDetailAnalyticsClient({ data }: { data: AnalyticsData }) {
  const { event, kpi, dailyTrend, referralBreakdown, memberTypeBreakdown, feedbackList } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-stone-500">{event.eventDate}</p>
        <h1 className="text-2xl font-bold text-stone-800">{event.title}</h1>
        <p className="text-sm text-stone-400 mt-1">イベント別分析</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="申込総数" value={`${kpi.total}名`} />
        <KpiCard label="有効参加" value={`${kpi.confirmed}名`} />
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

      {/* Daily signup trend */}
      <section className="bg-white rounded-xl border border-stone-200 p-4">
        <h2 className="text-sm font-semibold text-stone-700 mb-3">申込の推移（日別）</h2>
        {dailyTrend.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-6">データなし</p>
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

      {/* Referral + Member type */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Referral source */}
        <section className="bg-white rounded-xl border border-stone-200 p-4">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">流入経路</h2>
          {referralBreakdown.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-6">データなし</p>
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

        {/* Member type breakdown */}
        <section className="bg-white rounded-xl border border-stone-200 p-4">
          <h2 className="text-sm font-semibold text-stone-700 mb-3">会員種別</h2>
          {memberTypeBreakdown.every((m) => m.count === 0) ? (
            <p className="text-sm text-stone-400 text-center py-6">データなし</p>
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

      {/* Feedback list */}
      <section className="bg-white rounded-xl border border-stone-200 p-4">
        <h2 className="text-sm font-semibold text-stone-700 mb-3">
          感想・評価（{feedbackList.length}件）
        </h2>
        {feedbackList.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-6">感想の投稿はまだありません</p>
        ) : (
          <div className="space-y-3">
            {feedbackList.map((f, i) => (
              <div key={i} className="border border-stone-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-amber-500">{"★".repeat(f.score)}{"☆".repeat(5 - f.score)}</span>
                  <span className="text-xs text-stone-500">{f.name}</span>
                </div>
                {f.comment && (
                  <p className="text-sm text-stone-600 leading-relaxed">{f.comment}</p>
                )}
              </div>
            ))}
          </div>
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
