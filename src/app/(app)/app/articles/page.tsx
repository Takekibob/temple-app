"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ARTICLE_CATEGORIES } from "@/lib/articleCategories";
import ArticleCard, { type ArticleCardData } from "@/components/teralog/ArticleCard";

export default function ArticlesPage() {
  const [category, setCategory] = useState<string>("");
  const [articles, setArticles] = useState<ArticleCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = category ? `/api/articles?category=${category}` : "/api/articles";
    fetch(url)
      .then((r) => r.json())
      .then((data) => setArticles(data.articles ?? []))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <div className="pb-28 max-w-lg mx-auto">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4">
        <Link href="/app" className="font-serif text-[11px] text-ink-tertiary tracking-section block mb-3">
          ← ホーム
        </Link>
        <h1 className="font-serif text-xl text-ink font-light">学びの記事</h1>
      </div>

      {/* カテゴリタブ */}
      <div className="flex overflow-x-auto px-5 gap-4 pb-3" style={{ borderBottom: "0.5px solid var(--color-border)" }}>
        <button
          onClick={() => setCategory("")}
          className={`font-serif text-[11px] tracking-section whitespace-nowrap pb-2 ${
            category === "" ? "text-ink border-b border-ink" : "text-ink-tertiary"
          }`}
        >
          すべて
        </button>
        {ARTICLE_CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCategory(c.value)}
            className={`font-serif text-[11px] tracking-section whitespace-nowrap pb-2 ${
              category === c.value ? "text-ink border-b border-ink" : "text-ink-tertiary"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* 記事一覧 */}
      <div className="px-5 pt-4">
        {loading ? (
          <p className="font-serif text-sm text-ink-tertiary text-center py-12 font-light">読み込み中…</p>
        ) : articles.length === 0 ? (
          <p className="font-serif text-sm text-ink-tertiary text-center py-12 font-light">
            記事がありません
          </p>
        ) : (
          <div className="space-y-6">
            {articles.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
