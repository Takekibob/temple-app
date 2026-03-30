"use client";

import { useState } from "react";

type Pack = {
  id: string;
  status: string;
  hearingDone: boolean;
  hearingDate: Date | null;
  dataEntryDone: boolean;
  dataEntryCount: number;
  lineSetupDone: boolean;
  trainingDone: boolean;
  supportEndsAt: Date | null;
  paidAmount: number | null;
  createdAt: Date;
};

const STATUS_STEPS: Record<string, { label: string; step: number }> = {
  REQUESTED: { label: "申込受付", step: 1 },
  IN_PROGRESS: { label: "ヒアリング中", step: 2 },
  DATA_ENTRY: { label: "データ入力中", step: 3 },
  LINE_SETUP: { label: "LINE設定中", step: 4 },
  TRAINING: { label: "研修中", step: 5 },
  SUPPORT_PERIOD: { label: "サポート期間中", step: 6 },
  COMPLETED: { label: "完了", step: 7 },
};

export default function OnboardingPackClient({ existingPack }: { existingPack: Pack | null }) {
  const [applying, setApplying] = useState(false);
  const [pack, setPack] = useState<Pack | null>(existingPack);

  async function handleApply() {
    setApplying(true);
    const res = await fetch("/api/onboarding-pack", { method: "POST" });
    const data = await res.json();
    setPack(data);
    setApplying(false);
  }

  if (!pack) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-stone-800 mb-2">導入おまかせパック</h1>
        <p className="text-sm text-stone-500 mb-6">
          初期データ移行・LINE設定・研修・30日サポートをすべておまかせいただけるサービスです。
        </p>

        <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
          <h2 className="font-semibold text-stone-800 mb-4">パック内容</h2>
          <ul className="space-y-2 text-sm text-stone-600">
            <li className="flex items-center gap-2">
              <span className="text-amber-600">✓</span> ヒアリング（現状確認・要件整理）
            </li>
            <li className="flex items-center gap-2">
              <span className="text-amber-600">✓</span> 既存データの入力代行（過去帳・名簿）
            </li>
            <li className="flex items-center gap-2">
              <span className="text-amber-600">✓</span> LINE公式アカウント連携設定
            </li>
            <li className="flex items-center gap-2">
              <span className="text-amber-600">✓</span> スタッフ向け操作研修（オンライン）
            </li>
            <li className="flex items-center gap-2">
              <span className="text-amber-600">✓</span> 30日間サポート（メール・チャット）
            </li>
          </ul>
          <p className="text-lg font-bold text-stone-800 mt-4">¥49,800〜（税込）</p>
          <p className="text-xs text-stone-400">内容により変動します。詳細はヒアリング時にご案内します。</p>
        </div>

        <button
          onClick={handleApply}
          disabled={applying}
          className="bg-amber-700 text-white px-8 py-3 rounded-lg text-sm font-medium hover:bg-amber-800 disabled:opacity-50"
        >
          {applying ? "申込中..." : "導入おまかせパックを申し込む"}
        </button>
      </div>
    );
  }

  const currentStep = STATUS_STEPS[pack.status] ?? { label: pack.status, step: 1 };

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-stone-800 mb-2">導入おまかせパック</h1>
      <p className="text-sm text-stone-500 mb-6">
        申込日: {new Date(pack.createdAt).toLocaleDateString("ja-JP")}
        {pack.paidAmount && ` / ¥${pack.paidAmount.toLocaleString()} 支払い済み`}
      </p>

      {/* ステップ表示 */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 mb-6">
        <h2 className="font-semibold text-stone-800 mb-4">進捗状況</h2>
        <div className="space-y-3">
          {Object.entries(STATUS_STEPS).map(([key, { label, step }]) => {
            const isCompleted = step < currentStep.step;
            const isCurrent = step === currentStep.step;
            return (
              <div key={key} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isCompleted ? "bg-green-500 text-white" : isCurrent ? "bg-amber-700 text-white" : "bg-stone-100 text-stone-400"
                }`}>
                  {isCompleted ? "✓" : step}
                </div>
                <span className={`text-sm ${isCurrent ? "font-medium text-stone-800" : isCompleted ? "text-stone-500" : "text-stone-400"}`}>
                  {label}
                  {key === "DATA_ENTRY" && pack.dataEntryCount > 0 && ` (${pack.dataEntryCount}件)`}
                  {key === "SUPPORT_PERIOD" && pack.supportEndsAt && ` (${new Date(pack.supportEndsAt).toLocaleDateString("ja-JP")}まで)`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
        ご不明な点は <strong>support@teralog.app</strong> までご連絡ください。
      </div>
    </div>
  );
}
