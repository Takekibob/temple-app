"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface Props {
  currentSearch: string;
  currentTag?: string;
}

const PRESET_TAGS = ["要フォロー", "要注意", "VIP", "体調注意", "遠方", "一人暮らし", "跡継ぎ不在"];

const TAG_COLORS: Record<string, string> = {
  要フォロー: "bg-amber-100 text-amber-800",
  要注意: "bg-red-100 text-red-700",
  VIP: "bg-green-100 text-green-800",
  体調注意: "bg-orange-100 text-orange-700",
  遠方: "bg-blue-100 text-blue-700",
  一人暮らし: "bg-purple-100 text-purple-700",
  跡継ぎ不在: "bg-stone-100 text-stone-600",
};

export default function MemberFilters({ currentSearch, currentTag }: Props) {
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

  return (
    <div className="flex flex-col gap-3">
      {/* 氏名検索 */}
      <input
        type="search"
        defaultValue={currentSearch}
        placeholder="氏名・家名で検索"
        className="max-w-xs px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
        onChange={(e) => {
          const v = e.target.value;
          clearTimeout((window as Window & { _searchTimer?: number })._searchTimer);
          (window as Window & { _searchTimer?: number })._searchTimer = window.setTimeout(
            () => updateParams({ search: v }),
            400
          );
        }}
      />

      {/* タグフィルター */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => updateParams({ tag: "" })}
          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
            !currentTag
              ? "bg-stone-800 text-white border-transparent"
              : "border-stone-200 text-stone-500 hover:bg-stone-50"
          }`}
        >
          タグ：すべて
        </button>
        {PRESET_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => updateParams({ tag: currentTag === tag ? "" : tag })}
            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              currentTag === tag
                ? (TAG_COLORS[tag] ?? "bg-stone-200 text-stone-700") + " border-transparent"
                : "border-stone-200 text-stone-500 hover:bg-stone-50"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
