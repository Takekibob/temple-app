"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
} from "recharts";

interface KPI {
  goenTotal: number;
  dankaTotal: number;
  candidateCount: number;
  promotedThisMonth: number;
}

interface Candidate {
  id: string;
  name: string;
  email: string;
  familyName: string;
  engagementScore: number;
  joinedDate: string;
  interestTags: string[];
  eventCount: number;
}

interface Props {
  kpi: KPI;
  scoreDistribution: { range: string; count: number }[];
  monthlyTrend: { month: string; count: number }[];
  candidates: Candidate[];
}

export default function ConversionClient({ kpi, scoreDistribution, monthlyTrend, candidates }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handlePromote(candidateId: string, name: string) {
    if (!confirm(`${name} さんを檀家に昇格しますか？`)) return;
    setPromotingId(candidateId);
    setErrorMsg(null);
    startTransition(async () => {
      const res = await fetch(`/api/members/${candidateId}/promote`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMsg(data.error ?? "昇格に失敗しました");
      }
      setPromotingId(null);
    });
  }

  const conversionRate = kpi.goenTotal + kpi.dankaTotal > 0
    ? Math.round((kpi.dankaTotal / (kpi.goenTotal + kpi.dankaTotal)) * 100)
    : 0;

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">転換管理</h1>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">ご縁さん</p>
          <p className="text-3xl font-bold text-teal-700">{kpi.goenTotal}</p>
          <p className="text-xs text-stone-400 mt-1">名</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">檀家</p>
          <p className="text-3xl font-bold text-amber-700">{kpi.dankaTotal}</p>
          <p className="text-xs text-stone-400 mt-1">名</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">転換候補（スコア70+）</p>
          <p className="text-3xl font-bold text-rose-600">{kpi.candidateCount}</p>
          <p className="text-xs text-stone-400 mt-1">名</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">今月の転換</p>
          <p className="text-3xl font-bold text-stone-800">{kpi.promotedThisMonth}</p>
          <p className="text-xs text-stone-400 mt-1">件 / 転換率 {conversionRate}%</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* スコア分布 */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-800 mb-4">ご縁さん スコア分布</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scoreDistribution} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="range" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}名`, "人数"]} />
              <Bar dataKey="count" fill="#0d9488" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 月別転換数 */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-800 mb-4">月別 転換数（直近12ヶ月）</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyTrend} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v) => [`${v}件`, "転換数"]} />
              <Line type="monotone" dataKey="count" stroke="#b45309" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 転換候補リスト */}
      <div className="bg-white rounded-xl border border-stone-200 p-5">
        <h2 className="font-semibold text-stone-800 mb-4">
          転換候補一覧
          <span className="ml-2 text-xs font-normal text-stone-400">（スコア70以上のご縁さん）</span>
        </h2>
        {candidates.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-6">転換候補はいません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-400 border-b border-stone-100">
                  <th className="pb-2 pr-4">名前</th>
                  <th className="pb-2 pr-4">スコア</th>
                  <th className="pb-2 pr-4">イベント参加</th>
                  <th className="pb-2 pr-4">登録日</th>
                  <th className="pb-2">興味タグ</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {candidates.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-stone-800">{c.name}</p>
                      <p className="text-xs text-stone-400">{c.familyName}家</p>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-rose-600">{c.engagementScore}</span>
                        <div className="w-16 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rose-400 rounded-full"
                            style={{ width: `${c.engagementScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-stone-600">{c.eventCount}回</td>
                    <td className="py-3 pr-4 text-stone-400 text-xs">
                      {new Date(c.joinedDate).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {c.interestTags.slice(0, 3).map((tag) => (
                          <span key={tag} className="px-1.5 py-0.5 bg-teal-50 text-teal-700 text-xs rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handlePromote(c.id, c.name)}
                        disabled={isPending && promotingId === c.id}
                        className="px-3 py-1 text-xs bg-amber-700 text-white rounded-lg hover:bg-amber-800 disabled:opacity-40 whitespace-nowrap"
                      >
                        {isPending && promotingId === c.id ? "処理中…" : "檀家に昇格"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
