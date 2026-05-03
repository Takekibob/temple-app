"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

type Stage = { name: string; order: number };

export default function MembershipTypeNewPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pricingModel, setPricingModel] = useState("FREE");
  const [stages, setStages] = useState<Stage[]>([]);

  function addStage() {
    setStages((prev) => [...prev, { name: "", order: prev.length }]);
  }

  function updateStage(index: number, name: string) {
    setStages((prev) =>
      prev.map((s, i) => (i === index ? { ...s, name } : s))
    );
  }

  function removeStage(index: number) {
    setStages((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i }))
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name") as string,
      description: form.get("description") as string,
      pricingModel,
      priceJpy: pricingModel !== "FREE" ? Number(form.get("priceJpy")) || null : null,
      billingCycle: pricingModel === "SUBSCRIPTION" ? (form.get("billingCycle") as string) : null,
      isPublic: form.get("isPublic") === "true",
      stages: stages.filter((s) => s.name.trim()),
    };

    startTransition(async () => {
      setErrorMsg(null);
      const res = await fetch("/api/membership-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error ?? "作成に失敗しました");
        return;
      }
      router.push("/admin/memberships");
    });
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <Link href="/admin/memberships" className="text-sm text-stone-400 hover:text-stone-600 mb-4 inline-block">
        ← 関わり方の設計に戻る
      </Link>
      <h1 className="text-xl font-bold text-stone-800 mb-6">関わり方を追加</h1>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{errorMsg}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">種別名 *</Label>
          <Input id="name" name="name" required placeholder="例: ご縁さん、檀家、月額サポーター" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">説明</Label>
          <textarea
            id="description"
            name="description"
            rows={2}
            placeholder="この種別の説明（任意）"
            className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* 料金モデル */}
        <div className="space-y-1.5">
          <Label>料金モデル</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { value: "FREE", label: "無料" },
              { value: "ONE_TIME", label: "一括払い" },
              { value: "SUBSCRIPTION", label: "サブスク" },
              { value: "DONATION", label: "寄付" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPricingModel(opt.value)}
                className={`px-3 py-2 rounded-lg text-sm border transition-colors ${
                  pricingModel === opt.value
                    ? "bg-amber-700 text-white border-transparent"
                    : "border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {pricingModel !== "FREE" && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="priceJpy">金額（円）</Label>
              <Input id="priceJpy" name="priceJpy" type="number" min={0} placeholder="500" />
            </div>
            {pricingModel === "SUBSCRIPTION" && (
              <div className="space-y-1.5">
                <Label htmlFor="billingCycle">請求サイクル</Label>
                <select
                  id="billingCycle"
                  name="billingCycle"
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="MONTHLY">毎月</option>
                  <option value="YEARLY">毎年</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* 公開設定 */}
        <div className="space-y-1.5">
          <Label>利用者画面への表示</Label>
          <select
            name="isPublic"
            defaultValue="true"
            className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          >
            <option value="true">公開（利用者が確認できる）</option>
            <option value="false">非公開（管理者のみ）</option>
          </select>
        </div>

        {/* ステージ設定 */}
        <div className="space-y-2">
          <Label>ステージ（任意）</Label>
          <p className="text-xs text-stone-400">加入後の進行段階を設定します。例: 新規 → アクティブ → コア</p>
          {stages.map((stage, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={stage.name}
                onChange={(e) => updateStage(i, e.target.value)}
                placeholder={`ステージ ${i + 1} の名前`}
              />
              <button
                type="button"
                onClick={() => removeStage(i)}
                className="shrink-0 text-stone-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addStage}
            className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-800 font-medium"
          >
            <Plus size={12} />
            ステージを追加
          </button>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending} className="bg-amber-700 hover:bg-amber-800 text-white">
            {isPending ? "作成中…" : "作成する"}
          </Button>
          <Link
            href="/admin/memberships"
            className="px-4 py-2 text-sm border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
