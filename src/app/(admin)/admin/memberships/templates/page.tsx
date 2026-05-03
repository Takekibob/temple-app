"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SETUP_TEMPLATES } from "@/lib/membershipTemplates";
import { ChevronRight, Check, ChevronLeft } from "lucide-react";

const PRICING_LABELS: Record<string, string> = {
  FREE: "無料",
  ONE_TIME: "一括払い",
  SUBSCRIPTION: "サブスクリプション",
  DONATION: "寄付",
};

export default function MembershipsTemplatesPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleApply() {
    if (!selected) return;
    startTransition(async () => {
      setErrorMsg(null);
      const res = await fetch("/api/membership-types/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateKey: selected }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error ?? "エラーが発生しました");
        return;
      }
      router.push("/admin/memberships");
    });
  }

  const selectedTemplate = SETUP_TEMPLATES.find((t) => t.key === selected);

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <Link href="/admin/memberships" className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 mb-4 transition-colors">
        <ChevronLeft size={14} />
        関わり方の設計に戻る
      </Link>
      <h1 className="text-2xl font-bold text-stone-800 tracking-tight mb-1">
        テンプレートから作る
      </h1>
      <p className="text-sm text-stone-400 mb-6">
        お寺に合うテンプレートを選んでください。後から自由に変更できます。
      </p>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      {/* テンプレート選択 */}
      <div className="grid gap-3 mb-8">
        {SETUP_TEMPLATES.filter((t) => t.key !== "custom").map((template) => {
          const isSelected = selected === template.key;
          return (
            <button
              key={template.key}
              onClick={() => setSelected((prev) => (prev === template.key ? null : template.key))}
              className={`text-left w-full bg-white rounded-2xl border-2 transition-all p-4 ${
                isSelected
                  ? "border-amber-500 shadow-md"
                  : "border-stone-100 hover:border-amber-200 hover:shadow-sm"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">{template.emoji}</span>
                    <span className="font-bold text-stone-800">{template.label}</span>
                    {isSelected && (
                      <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                        選択中
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-stone-500 mb-2">{template.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {template.useCases.map((uc) => (
                      <span key={uc} className="text-xs bg-stone-50 text-stone-500 border border-stone-200 px-2 py-0.5 rounded-full">
                        {uc}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  isSelected ? "border-amber-500 bg-amber-500" : "border-stone-300"
                }`}>
                  {isSelected && <Check size={12} strokeWidth={3} className="text-white" />}
                </div>
              </div>

              {isSelected && template.membershipTypes.length > 0 && (
                <div className="mt-3 pt-3 border-t border-stone-100 space-y-1.5">
                  <p className="text-xs font-semibold text-stone-600 mb-2">作成される関わり方：</p>
                  {template.membershipTypes.map((mt) => (
                    <div key={mt.name} className="flex items-center gap-2">
                      <div className="flex-1">
                        <span className="text-sm font-medium text-stone-800">{mt.name}</span>
                        {mt.description && (
                          <span className="text-xs text-stone-400 ml-2">{mt.description}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">
                          {PRICING_LABELS[mt.pricingModel]}
                          {mt.priceJpy != null && ` ¥${mt.priceJpy.toLocaleString()}`}
                        </span>
                        {mt.stages.length > 0 && (
                          <div className="flex items-center gap-0.5">
                            {mt.stages.map((s, i) => (
                              <span key={s.name} className="flex items-center gap-0.5">
                                <span className="text-[10px] text-stone-400">{s.name}</span>
                                {i < mt.stages.length - 1 && <ChevronRight size={8} className="text-stone-300" />}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={handleApply}
          disabled={!selected || isPending}
          className="flex items-center gap-2 px-6 py-2.5 bg-amber-700 text-white font-semibold rounded-xl hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? "作成中…" : selectedTemplate
            ? `「${selectedTemplate.label}」を適用する`
            : "テンプレートを選択してください"}
          {!isPending && selected && <ChevronRight size={16} />}
        </button>
        <Link
          href="/admin/memberships"
          className="px-4 py-2.5 text-sm border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50"
        >
          キャンセル
        </Link>
      </div>
    </div>
  );
}
