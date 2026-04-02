"use client";

import { useState, useTransition } from "react";

interface Template {
  key: string;
  name: string;
  description: string;
  interval: "YEARLY" | "MONTHLY" | "ONE_TIME";
  defaultPrice: number;
  benefits: string[];
  sortOrder: number;
}

interface PlanState {
  id: string;
  price: number;
  isActive: boolean;
  subscriberCount: number;
}

interface Props {
  templates: Template[];
  planMap: Record<string, PlanState>;
}

const INTERVAL_LABELS: Record<string, string> = {
  YEARLY: "年額",
  MONTHLY: "月額",
  ONE_TIME: "一回払い",
};

export default function PlanManageClient({ templates, planMap }: Props) {
  const [states, setStates] = useState<Record<string, PlanState>>({ ...planMap });
  const [prices, setPrices] = useState<Record<string, string>>(
    Object.fromEntries(
      templates.map((t) => [t.key, String(planMap[t.key]?.price ?? t.defaultPrice)])
    )
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  async function handleToggle(t: Template, enable: boolean) {
    const price = Number(prices[t.key]);
    if (enable && (!prices[t.key] || isNaN(price) || price < 0)) {
      setErrors((e) => ({ ...e, [t.key]: "有効な金額を入力してください" }));
      return;
    }
    setErrors((e) => ({ ...e, [t.key]: "" }));

    startTransition(async () => {
      const existing = states[t.key];
      if (existing?.id) {
        // 更新
        const res = await fetch(`/api/plans/${existing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: enable, price }),
        });
        if (res.ok) {
          setStates((s) => ({
            ...s,
            [t.key]: { ...existing, isActive: enable, price },
          }));
        }
      } else {
        // 新規作成
        const res = await fetch("/api/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            templateKey: t.key,
            name: t.name,
            description: t.description,
            price,
            interval: t.interval,
            benefits: t.benefits,
            sortOrder: t.sortOrder,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setStates((s) => ({
            ...s,
            [t.key]: { id: data.id, price: data.price, isActive: true, subscriberCount: 0 },
          }));
        }
      }
    });
  }

  async function handlePriceUpdate(t: Template) {
    const existing = states[t.key];
    if (!existing?.id) return;
    const price = Number(prices[t.key]);
    if (isNaN(price) || price < 0) {
      setErrors((e) => ({ ...e, [t.key]: "有効な金額を入力してください" }));
      return;
    }
    setErrors((e) => ({ ...e, [t.key]: "" }));

    startTransition(async () => {
      await fetch(`/api/plans/${existing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price }),
      });
      setStates((s) => ({ ...s, [t.key]: { ...existing, price } }));
    });
  }

  return (
    <div className="space-y-4">
      {templates.map((t) => {
        const state = states[t.key];
        const isActive = state?.isActive ?? false;

        return (
          <div
            key={t.key}
            className={`bg-white rounded-xl border p-5 ${
              isActive ? "border-amber-300" : "border-stone-200"
            }`}
          >
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="font-semibold text-stone-800">{t.name}</h2>
                <p className="text-xs text-stone-500 mt-0.5">{t.description}</p>
              </div>
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                {isActive && state?.subscriberCount != null && (
                  <span className="text-xs text-stone-400">加入者 {state.subscriberCount}名</span>
                )}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    isActive
                      ? "bg-teal-100 text-teal-700"
                      : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {isActive ? "有効" : "無効"}
                </span>
              </div>
            </div>

            <ul className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 mb-4">
              {t.benefits.map((b) => (
                <li key={b} className="text-xs text-stone-500 flex items-center gap-1">
                  <span className="text-amber-500">・</span>{b}
                </li>
              ))}
            </ul>

            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="text-xs text-stone-500 mb-1 block">
                  金額（{INTERVAL_LABELS[t.interval]}）
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-stone-500">¥</span>
                  <input
                    type="number"
                    min={0}
                    value={prices[t.key]}
                    onChange={(e) => setPrices((p) => ({ ...p, [t.key]: e.target.value }))}
                    className="w-28 px-2 py-1.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {isActive && (
                    <button
                      onClick={() => handlePriceUpdate(t)}
                      disabled={isPending}
                      className="px-3 py-1.5 text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg"
                    >
                      更新
                    </button>
                  )}
                </div>
                {errors[t.key] && (
                  <p className="text-xs text-red-600 mt-1">{errors[t.key]}</p>
                )}
              </div>

              <button
                onClick={() => handleToggle(t, !isActive)}
                disabled={isPending}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-stone-100 hover:bg-stone-200 text-stone-700"
                    : "bg-amber-700 hover:bg-amber-800 text-white"
                }`}
              >
                {isActive ? "無効にする" : "有効にする"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
