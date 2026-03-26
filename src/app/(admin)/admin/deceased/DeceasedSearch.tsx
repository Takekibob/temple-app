"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  currentSearch: string;
  currentTab: string;
}

export default function DeceasedSearch({ currentSearch, currentTab }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState(currentSearch);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams({ tab: currentTab });
    if (search) params.set("search", search);
    router.push(`/admin/deceased?${params.toString()}`);
  }

  function handleClear() {
    setSearch("");
    router.push(`/admin/deceased?tab=${currentTab}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-0">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="故人名・戒名で検索"
        className="flex-1 h-9 px-3 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
      <button
        type="submit"
        className="px-3 py-1.5 bg-stone-700 text-white text-sm rounded-lg hover:bg-stone-800"
      >
        検索
      </button>
      {currentSearch && (
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-1.5 border border-stone-200 text-stone-600 text-sm rounded-lg hover:bg-stone-50"
        >
          クリア
        </button>
      )}
    </form>
  );
}
