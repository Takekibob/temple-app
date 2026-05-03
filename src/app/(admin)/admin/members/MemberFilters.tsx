"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface MembershipType {
  id: string;
  name: string;
}

interface Props {
  currentType?: string;
  currentSearch: string;
  currentTag?: string;
  currentMembershipTypeId?: string;
  currentEnrollment?: string;
  membershipTypes?: MembershipType[];
  membershipEnabled?: boolean;
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

export default function MemberFilters({
  currentSearch,
  currentTag,
  currentMembershipTypeId,
  currentEnrollment,
  membershipTypes = [],
  membershipEnabled = false,
}: Props) {
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

  const isNeutral = !currentMembershipTypeId && !currentEnrollment;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-3">
        {/* メンバーシップフィルター（membershipEnabled=true のみ） */}
        {membershipEnabled && (
          <div className="flex flex-wrap gap-1 bg-white border border-stone-200 rounded-lg p-1">
            <button
              onClick={() => updateParams({ membershipTypeId: "", enrollment: "" })}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                isNeutral ? "bg-amber-700 text-white font-medium" : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              全員
            </button>
            <button
              onClick={() => updateParams({ enrollment: "enrolled", membershipTypeId: "" })}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                currentEnrollment === "enrolled"
                  ? "bg-teal-600 text-white font-medium"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              関わり方あり
            </button>
            <button
              onClick={() => updateParams({ enrollment: "not_enrolled", membershipTypeId: "" })}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                currentEnrollment === "not_enrolled"
                  ? "bg-stone-600 text-white font-medium"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              未設定
            </button>
            {membershipTypes.map((mt) => (
              <button
                key={mt.id}
                onClick={() => updateParams({ membershipTypeId: mt.id, enrollment: "" })}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  currentMembershipTypeId === mt.id
                    ? "bg-amber-700 text-white font-medium"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                {mt.name}
              </button>
            ))}
          </div>
        )}

        {/* 氏名検索 */}
        <input
          type="search"
          defaultValue={currentSearch}
          placeholder="氏名・家名で検索"
          className="flex-1 max-w-xs px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          onChange={(e) => {
            const v = e.target.value;
            clearTimeout((window as Window & { _searchTimer?: number })._searchTimer);
            (window as Window & { _searchTimer?: number })._searchTimer = window.setTimeout(
              () => updateParams({ search: v }),
              400
            );
          }}
        />
      </div>

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
