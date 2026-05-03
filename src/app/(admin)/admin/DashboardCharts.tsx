"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";

export interface ChartDataPoint {
  month: string;
  followers: number;
  events: number;
}

export default function DashboardCharts({ data }: { data: ChartDataPoint[] }) {
  return (
    <div className="grid lg:grid-cols-2 gap-6 mt-6">
      {/* フォロワー推移 */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="font-semibold text-stone-800 mb-4 text-sm">フォロワー推移（過去6ヶ月）</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#78716c" }} />
            <YAxis tick={{ fontSize: 11, fill: "#78716c" }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e7e5e4" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="followers" name="新規フォロワー" fill="#0d9488" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* イベント申込推移 */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="font-semibold text-stone-800 mb-4 text-sm">イベント申込推移（過去6ヶ月）</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#78716c" }} />
            <YAxis tick={{ fontSize: 11, fill: "#78716c" }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e7e5e4" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="events"
              name="申込"
              stroke="#b45309"
              strokeWidth={2}
              dot={{ r: 3, fill: "#b45309" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
