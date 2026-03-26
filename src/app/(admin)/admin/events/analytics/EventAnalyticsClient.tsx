"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";

interface KPI {
  totalEvents: number;
  totalParticipants: number;
  totalUnique: number;
  repeaterRate: number;
  avgFeedbackScore: number | null;
}

interface Props {
  kpi: KPI;
  categoryRanking: { category: string; count: number }[];
  monthlyTrend: { month: string; count: number }[];
  repeaterBreakdown: { label: string; value: number }[];
}

const PIE_COLORS = ["#0d9488", "#d1fae5"];

export default function EventAnalyticsClient({ kpi, categoryRanking, monthlyTrend, repeaterBreakdown }: Props) {
  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">イベント分析</h1>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">総イベント数</p>
          <p className="text-3xl font-bold text-stone-800">{kpi.totalEvents}</p>
          <p className="text-xs text-stone-400 mt-1">件</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">総参加者数</p>
          <p className="text-3xl font-bold text-stone-800">{kpi.totalParticipants}</p>
          <p className="text-xs text-stone-400 mt-1">延べ名</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">ユニーク参加者</p>
          <p className="text-3xl font-bold text-teal-700">{kpi.totalUnique}</p>
          <p className="text-xs text-stone-400 mt-1">名</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">リピーター率</p>
          <p className="text-3xl font-bold text-amber-700">{kpi.repeaterRate}</p>
          <p className="text-xs text-stone-400 mt-1">%</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">平均評価</p>
          <p className="text-3xl font-bold text-stone-800">
            {kpi.avgFeedbackScore != null ? kpi.avgFeedbackScore : "—"}
          </p>
          <p className="text-xs text-stone-400 mt-1">/ 5</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* カテゴリ別参加者数 */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-800 mb-4">カテゴリ別 参加者数</h2>
          {categoryRanking.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-8">データなし</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryRanking} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(v) => [`${v}名`, "参加者"]} />
                <Bar dataKey="count" fill="#b45309" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* リピーター比率 */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-800 mb-4">リピーター vs 初回参加</h2>
          {kpi.totalUnique === 0 ? (
            <p className="text-sm text-stone-400 text-center py-8">データなし</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={repeaterBreakdown}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, percent }) => `${name} ${Math.round((percent ?? 0) * 100)}%`}
                  labelLine={false}
                >
                  {repeaterBreakdown.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 月別参加者数トレンド */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="font-semibold text-stone-800 mb-4">月別 参加者数トレンド（直近12ヶ月）</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyTrend} margin={{ top: 0, right: 20, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip formatter={(v) => [`${v}名`, "参加者"]} />
            <Line type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
