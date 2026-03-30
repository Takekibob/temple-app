"use client";

import { useState } from "react";

type Temple = { name: string; description: string | null; coverImageUrl: string | null };
type Page = {
  id: string;
  slug: string;
  template: string;
  heroImageUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  isPublished: boolean;
};

const TEMPLATES = [
  { value: "CLASSIC", label: "クラシック", desc: "伝統的な落ち着いたデザイン" },
  { value: "MODERN", label: "モダン", desc: "スッキリとしたシンプルデザイン" },
  { value: "ZEN", label: "禅", desc: "余白を活かした瞑想的なデザイン" },
  { value: "NATURE", label: "自然", desc: "緑や木をモチーフにした温かいデザイン" },
];

export default function TemplePageEditor({
  temple,
  existingPage,
}: {
  temple: Temple | null;
  existingPage: Page | null;
}) {
  const [slug, setSlug] = useState(existingPage?.slug ?? "");
  const [template, setTemplate] = useState(existingPage?.template ?? "CLASSIC");
  const [heroImageUrl, setHeroImageUrl] = useState(existingPage?.heroImageUrl ?? "");
  const [seoTitle, setSeoTitle] = useState(existingPage?.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(existingPage?.seoDescription ?? "");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isPublished, setIsPublished] = useState(existingPage?.isPublished ?? false);
  const [pageExists, setPageExists] = useState(!!existingPage);
  const [error, setError] = useState("");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teralog.app";

  async function handleSave() {
    if (!slug.trim()) {
      setError("スラッグを入力してください");
      return;
    }
    setSaving(true);
    setError("");

    const res = await fetch("/api/temple-page", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, template, heroImageUrl: heroImageUrl || null, seoTitle: seoTitle || null, seoDescription: seoDescription || null }),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error === "SLUG_TAKEN" ? "このスラッグは既に使用されています" : "保存に失敗しました");
    } else {
      setPageExists(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  async function handlePublish() {
    setPublishing(true);
    const res = await fetch("/api/temple-page/publish", { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setIsPublished(d.isPublished);
    }
    setPublishing(false);
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">寺院LP編集</h1>
          <p className="text-sm text-stone-500 mt-0.5">{temple?.name}の公開ランディングページ</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-stone-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-stone-900 disabled:opacity-50"
          >
            {saving ? "保存中..." : saved ? "保存済み ✓" : "保存"}
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || !pageExists}
            className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
              isPublished
                ? "bg-stone-100 text-stone-700 hover:bg-stone-200"
                : "bg-amber-700 text-white hover:bg-amber-800"
            }`}
          >
            {publishing ? "処理中..." : isPublished ? "非公開にする" : "公開する"}
          </button>
        </div>
      </div>

      {isPublished && slug && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-5 text-sm text-green-800">
          公開中: <a href={`/temples/p/${slug}`} target="_blank" className="underline">{siteUrl}/temples/p/{slug}</a>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-5 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-800 mb-4">基本設定</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">URLスラッグ</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-stone-400">/temples/p/</span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm"
                  placeholder="my-temple"
                />
              </div>
              <p className="text-xs text-stone-400 mt-1">英数字とハイフンのみ使用可能</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">ヒーロー画像URL（任意）</label>
              <input
                value={heroImageUrl}
                onChange={(e) => setHeroImageUrl(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-800 mb-4">テンプレート</h2>
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTemplate(t.value)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  template === t.value
                    ? "border-amber-700 bg-amber-50"
                    : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <p className={`font-medium text-sm ${template === t.value ? "text-amber-800" : "text-stone-700"}`}>
                  {t.label}
                </p>
                <p className="text-xs text-stone-500 mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-800 mb-4">SEO設定</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">ページタイトル</label>
              <input
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                placeholder={`${temple?.name ?? "お寺"} | てらログ`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">ページ説明</label>
              <textarea
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                rows={2}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                placeholder={temple?.description ?? "お寺の紹介文"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
