"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MonthlyData {
  month: number;
  label: string;
  total: number;
  HOUYO: number;
  GOJIKAI: number;
  KIFU: number;
  EVENT_FEE: number;
  OTHER: number;
}

interface AnnualData {
  year: number;
  label: string;
  total: number;
  HOUYO: number;
  GOJIKAI: number;
  KIFU: number;
  EVENT_FEE: number;
  OTHER: number;
}

const TYPE_COLORS = {
  HOUYO: "#92400e",
  GOJIKAI: "#d97706",
  KIFU: "#059669",
  EVENT_FEE: "#7c3aed",
  OTHER: "#9ca3af",
};

const TYPE_LABELS = {
  HOUYO: "法要",
  GOJIKAI: "護持会費",
  KIFU: "寄付",
  EVENT_FEE: "イベント参加費",
  OTHER: "その他",
};

function formatYen(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(0)}万`;
  return `¥${value.toLocaleString()}`;
}

export default function ReportsClient() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [annualData, setAnnualData] = useState<AnnualData[]>([]);
  const [yearTotal, setYearTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/reports/monthly?year=${selectedYear}`).then((r) => r.json()),
      fetch("/api/reports/annual?years=5").then((r) => r.json()),
    ]).then(([monthly, annual]) => {
      setMonthlyData(monthly.data ?? []);
      setYearTotal(monthly.yearTotal ?? 0);
      setAnnualData(annual.data ?? []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedYear]);

  return (
    <div className="space-y-8">
      {/* 年度選択 */}
      <div className="flex gap-2 items-center">
        <span className="text-sm text-stone-500">年度:</span>
        <div className="flex gap-1 bg-white border border-stone-200 rounded-lg p-1">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                selectedYear === y
                  ? "bg-amber-700 text-white font-medium"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {y}年
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40 text-stone-400 text-sm">
          読み込み中…
        </div>
      ) : (
        <>
          {/* 月次集計 */}
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-stone-800">{selectedYear}年 月次集計</h2>
              <p className="text-sm text-stone-500">
                合計: <span className="font-bold text-stone-800">¥{yearTotal.toLocaleString()}</span>
              </p>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#78716c" }} />
                <YAxis tickFormatter={formatYen} tick={{ fontSize: 11, fill: "#78716c" }} width={52} />
                <Tooltip
                  formatter={(value) => `¥${Number(value ?? 0).toLocaleString()}`}
                  labelStyle={{ color: "#292524" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {Object.entries(TYPE_COLORS).map(([key, color]) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={TYPE_LABELS[key as keyof typeof TYPE_LABELS]}
                    stackId="a"
                    fill={color}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 年次推移 */}
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="text-lg font-bold text-stone-800 mb-4">年次推移（過去5年）</h2>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={annualData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#78716c" }} />
                <YAxis tickFormatter={formatYen} tick={{ fontSize: 11, fill: "#78716c" }} width={52} />
                <Tooltip
                  formatter={(value) => `¥${Number(value ?? 0).toLocaleString()}`}
                  labelStyle={{ color: "#292524" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {Object.entries(TYPE_COLORS).map(([key, color]) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={TYPE_LABELS[key as keyof typeof TYPE_LABELS]}
                    stackId="a"
                    fill={color}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* 月次テーブル */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100">
              <h2 className="text-base font-bold text-stone-800">{selectedYear}年 月次明細</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50">
                    <th className="text-left px-4 py-3 text-stone-500 font-medium">月</th>
                    <th className="text-right px-4 py-3 text-stone-500 font-medium">法要</th>
                    <th className="text-right px-4 py-3 text-stone-500 font-medium">護持会費</th>
                    <th className="text-right px-4 py-3 text-stone-500 font-medium">寄付</th>
                    <th className="text-right px-4 py-3 text-stone-500 font-medium">イベント</th>
                    <th className="text-right px-4 py-3 text-stone-500 font-medium">その他</th>
                    <th className="text-right px-4 py-3 text-stone-500 font-medium">合計</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((row) => (
                    <tr key={row.month} className="border-b border-stone-50 hover:bg-stone-50">
                      <td className="px-4 py-2.5 text-stone-700 font-medium">{row.label}</td>
                      <td className="px-4 py-2.5 text-right text-stone-600">
                        {row.HOUYO > 0 ? `¥${row.HOUYO.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-stone-600">
                        {row.GOJIKAI > 0 ? `¥${row.GOJIKAI.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-stone-600">
                        {row.KIFU > 0 ? `¥${row.KIFU.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-stone-600">
                        {row.EVENT_FEE > 0 ? `¥${row.EVENT_FEE.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-stone-600">
                        {row.OTHER > 0 ? `¥${row.OTHER.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-stone-800">
                        {row.total > 0 ? `¥${row.total.toLocaleString()}` : "—"}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-stone-50 border-t border-stone-200">
                    <td className="px-4 py-3 font-bold text-stone-800">合計</td>
                    <td className="px-4 py-3 text-right font-medium text-stone-700">
                      ¥{monthlyData.reduce((s, r) => s + r.HOUYO, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-stone-700">
                      ¥{monthlyData.reduce((s, r) => s + r.GOJIKAI, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-stone-700">
                      ¥{monthlyData.reduce((s, r) => s + r.KIFU, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-stone-700">
                      ¥{monthlyData.reduce((s, r) => s + r.EVENT_FEE, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-stone-700">
                      ¥{monthlyData.reduce((s, r) => s + r.OTHER, 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-stone-800">
                      ¥{yearTotal.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
