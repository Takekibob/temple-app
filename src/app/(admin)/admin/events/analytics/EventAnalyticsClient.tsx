"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface MonthlyKpis {
  currentCount: number;
  prevCount: number;
  currentAttended: number;
  prevAttended: number;
  currentAvgRate: number | null;
  prevAvgRate: number | null;
  newGoenCount: number;
  prevNewGoenCount: number;
}

interface PerformanceEvent {
  id: string;
  title: string;
  date: string;
  category: string;
  capacity: number | null;
  applied: number;
  attended: number;
  participationRate: number | null;
  avgRating: number | null;
}

interface Props {
  monthlyKpis: MonthlyKpis;
  monthlyTrend: { month: string; events: number; participants: number }[];
  categoryRanking: { category: string; count: number }[];
  repeaterData: { label: string; value: number }[];
  performanceEvents: PerformanceEvent[];
  acquisitionData: { label: string; count: number }[];
}

type SortKey = "date" | "rate" | "rating";

const PIE_COLORS = ["#b45309", "#d97706", "#fde68a"];

function MoMBadge({ current, prev }: { current: number | null; prev: number | null }) {
  if (current == null || prev == null || prev === 0) return null;
  const diff = current - prev;
  const pct = Math.round((diff / prev) * 100);
  if (pct === 0) return null;
  return (
    <span
      className={`text-xs font-medium ml-1 ${pct > 0 ? "text-teal-600" : "text-red-500"}`}
    >
      {pct > 0 ? "↑" : "↓"}{Math.abs(pct)}%
    </span>
  );
}

export default function EventAnalyticsClient({
  monthlyKpis,
  monthlyTrend,
  categoryRanking,
  repeaterData,
  performanceEvents,
  acquisitionData,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("date");

  const sortedEvents = [...performanceEvents].sort((a, b) => {
    if (sortKey === "date") return b.date.localeCompare(a.date);
    if (sortKey === "rate") {
      return (b.participationRate ?? -1) - (a.participationRate ?? -1);
    }
    return (b.avgRating ?? -1) - (a.avgRating ?? -1);
  });

  const totalRepeaters = repeaterData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="p-4 md:p-6 max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">イベント分析</h1>

      {/* ── KPIカード ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="今月の開催数"
          value={`${monthlyKpis.currentCount}回`}
          badge={<MoMBadge current={monthlyKpis.currentCount} prev={monthlyKpis.prevCount} />}
        />
        <KpiCard
          label="今月の総参加者数"
          value={`${monthlyKpis.currentAttended}名`}
          badge={<MoMBadge current={monthlyKpis.currentAttended} prev={monthlyKpis.prevAttended} />}
        />
        <KpiCard
          label="平均参加率"
          value={monthlyKpis.currentAvgRate != null ? `${monthlyKpis.currentAvgRate}%` : "—"}
          badge={
            <MoMBadge current={monthlyKpis.currentAvgRate} prev={monthlyKpis.prevAvgRate} />
          }
        />
        <KpiCard
          label="新規ご縁さん獲得"
          value={`${monthlyKpis.newGoenCount}名`}
          badge={
            <MoMBadge current={monthlyKpis.newGoenCount} prev={monthlyKpis.prevNewGoenCount} />
          }
        />
      </div>

      {/* ── 月次推移グラフ ── */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="font-semibold text-stone-800 mb-4">月次推移（直近6ヶ月）</h2>
        {monthlyTrend.every((d) => d.events === 0 && d.participants === 0) ? (
          <p className="text-sm text-stone-400 text-center py-8">まだデータがありません</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={monthlyTrend} margin={{ top: 4, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                formatter={(value, name) =>
                  name === "開催数"
                    ? [`${value}回`, name]
                    : [`${value}名`, name]
                }
              />
              <Legend />
              <Bar yAxisId="left" dataKey="events" name="開催数" fill="#d97706" opacity={0.7} radius={[2, 2, 0, 0]} />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="participants"
                name="参加者数"
                stroke="#0d9488"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── カテゴリ別 + リピーター ── */}
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-800 mb-4">カテゴリ別 参加者数（全期間）</h2>
          {categoryRanking.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-8">まだデータがありません</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={categoryRanking}
                layout="vertical"
                margin={{ top: 0, right: 24, left: 72, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={72} />
                <Tooltip formatter={(v) => [`${v}名`, "参加者数"]} />
                <Bar dataKey="count" fill="#b45309" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-800 mb-4">リピーター分析</h2>
          {totalRepeaters === 0 ? (
            <p className="text-sm text-stone-400 text-center py-8">まだデータがありません</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={repeaterData}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name} ${Math.round((percent ?? 0) * 100)}%`
                  }
                  labelLine={false}
                >
                  {repeaterData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v, name) => [`${v}名`, name]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── イベント別パフォーマンステーブル ── */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-stone-800">イベント別パフォーマンス</h2>
          <div className="flex items-center gap-1 text-xs text-stone-500">
            <span>並び替え:</span>
            {(["date", "rate", "rating"] as SortKey[]).map((key) => {
              const labels: Record<SortKey, string> = {
                date: "日付",
                rate: "参加率",
                rating: "評価",
              };
              return (
                <button
                  key={key}
                  onClick={() => setSortKey(key)}
                  className={`px-2 py-0.5 rounded ${
                    sortKey === key
                      ? "bg-amber-700 text-white"
                      : "text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {labels[key]}
                </button>
              );
            })}
          </div>
        </div>
        {performanceEvents.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-8">まだデータがありません</p>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50 text-xs text-stone-500">
                  <th className="text-left px-3 py-2 font-medium">イベント名</th>
                  <th className="text-left px-3 py-2 font-medium">日付</th>
                  <th className="text-left px-3 py-2 font-medium">カテゴリ</th>
                  <th className="text-right px-3 py-2 font-medium">定員</th>
                  <th className="text-right px-3 py-2 font-medium">申込</th>
                  <th className="text-right px-3 py-2 font-medium">参加</th>
                  <th className="text-right px-3 py-2 font-medium">参加率</th>
                  <th className="text-right px-3 py-2 font-medium">評価</th>
                </tr>
              </thead>
              <tbody>
                {sortedEvents.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-stone-50 hover:bg-stone-50 transition-colors"
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/events/${e.id}/analytics`}
                        className="text-amber-700 hover:underline font-medium"
                      >
                        {e.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-stone-600">{e.date}</td>
                    <td className="px-3 py-2 text-stone-500">{e.category}</td>
                    <td className="px-3 py-2 text-right text-stone-600">
                      {e.capacity ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-stone-600">{e.applied}</td>
                    <td className="px-3 py-2 text-right text-stone-600">{e.attended}</td>
                    <td className="px-3 py-2 text-right">
                      {e.participationRate != null ? (
                        <span
                          className={`font-medium ${
                            e.participationRate >= 80
                              ? "text-teal-700"
                              : e.participationRate >= 50
                              ? "text-stone-700"
                              : "text-red-600"
                          }`}
                        >
                          {e.participationRate}%
                        </span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {e.avgRating != null ? (
                        <span className="text-amber-600 font-medium">★{e.avgRating}</span>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 新規ご縁さん獲得チャネル ── */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="font-semibold text-stone-800 mb-1">新規ご縁さん 獲得チャネル</h2>
        <p className="text-xs text-stone-400 mb-4">直近12ヶ月の登録会員（ご縁さん）の流入元</p>
        {acquisitionData.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-8">まだデータがありません</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={acquisitionData}
              layout="vertical"
              margin={{ top: 0, right: 24, left: 56, bottom: 0 }}
            >
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={56} />
              <Tooltip formatter={(v) => [`${v}名`, "登録者数"]} />
              <Bar dataKey="count" fill="#0d9488" radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4">
      <p className="text-xs text-stone-500 mb-1">{label}</p>
      <div className="flex items-baseline gap-0.5">
        <p className="text-2xl font-bold text-stone-800">{value}</p>
        {badge}
      </div>
    </div>
  );
}
