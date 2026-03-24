"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface Props {
  currentType?: string;
  currentSearch: string;
}

export default function MemberFilters({ currentType, currentSearch }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      params.delete("page");
      router.push(`/admin/members?${params.toString()}`);
    },
    [router, searchParams]
  );

  const TYPE_FILTERS = [
    { value: "", label: "全員" },
    { value: "DANKA", label: "檀家" },
    { value: "GOEN", label: "ご縁さん" },
  ];

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      {/* タイプフィルター */}
      <div className="flex gap-1 bg-white border border-stone-200 rounded-lg p-1">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => updateParams({ type: f.value })}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              (currentType ?? "") === f.value
                ? "bg-amber-700 text-white font-medium"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 氏名検索 */}
      <input
        type="search"
        defaultValue={currentSearch}
        placeholder="氏名・家名で検索"
        className="flex-1 max-w-xs px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
        onChange={(e) => {
          const v = e.target.value;
          // 入力が落ち着いたらURL更新
          clearTimeout((window as Window & { _searchTimer?: number })._searchTimer);
          (window as Window & { _searchTimer?: number })._searchTimer = window.setTimeout(
            () => updateParams({ search: v }),
            400
          );
        }}
      />
    </div>
  );
}
