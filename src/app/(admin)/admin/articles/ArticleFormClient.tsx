"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ARTICLE_CATEGORIES, generateSlug } from "@/lib/articleCategories";
import ArticleRenderer from "@/components/teralog/ArticleRenderer";

interface ArticleData {
  id?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  category?: string;
  coverImage?: string | null;
  status?: string;
}

interface Props {
  initialData?: ArticleData;
  isEdit?: boolean;
  articleId?: string; // for image upload endpoint
}

export default function ArticleFormClient({ initialData, isEdit, articleId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [excerpt, setExcerpt] = useState(initialData?.excerpt ?? "");
  const [body, setBody] = useState(initialData?.body ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "PARTICIPATION");
  const [coverImage, setCoverImage] = useState(initialData?.coverImage ?? "");
  const [coverUploading, setCoverUploading] = useState(false);
  const [imgUploading, setImgUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // タイトルからslug自動生成
  function handleTitleBlur() {
    if (!slug && title) setSlug(generateSlug(title));
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const endpointId = articleId ?? "temp";
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/articles/${endpointId}/cover`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setCoverImage(data.url);
      else setErrorMsg(data.error ?? "カバー画像のアップロードに失敗しました");
    } catch { setErrorMsg("通信エラーが発生しました"); }
    finally { setCoverUploading(false); }
  }

  async function handleBodyImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !articleId) return;
    setImgUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/admin/articles/${articleId}/images`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        const markdown = `\n![説明文](${data.url})\n`;
        const el = bodyRef.current;
        if (el) {
          const start = el.selectionStart;
          const end = el.selectionEnd;
          const newVal = body.slice(0, start) + markdown + body.slice(end);
          setBody(newVal);
          setTimeout(() => { el.selectionStart = el.selectionEnd = start + markdown.length; el.focus(); }, 0);
        } else {
          setBody((b) => b + markdown);
        }
      } else {
        setErrorMsg(data.error ?? "画像アップロードに失敗しました");
      }
    } catch { setErrorMsg("通信エラーが発生しました"); }
    finally {
      setImgUploading(false);
      if (imgInputRef.current) imgInputRef.current.value = "";
    }
  }

  function handleSave(publishStatus?: "PUBLISHED" | "DRAFT" | "ARCHIVED") {
    if (!title.trim() || !excerpt.trim() || !body.trim()) {
      setErrorMsg("タイトル・概要・本文を入力してください");
      return;
    }
    setErrorMsg(null);

    const payload = {
      title: title.trim(),
      slug: slug.trim() || generateSlug(title),
      excerpt: excerpt.trim(),
      content: body.trim(),
      category,
      coverImage: coverImage || undefined,
      ...(publishStatus ? { status: publishStatus } : {}),
    };

    startTransition(async () => {
      const url = isEdit ? `/api/admin/articles/${initialData!.id}` : "/api/admin/articles";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) setErrorMsg(data.error ?? "保存に失敗しました");
      else router.push("/admin/articles");
    });
  }

  async function handleDelete() {
    if (!confirm("この記事を削除しますか？")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/articles/${initialData!.id}`, { method: "DELETE" });
      if (res.ok) router.push("/admin/articles");
      else { const d = await res.json(); setErrorMsg(d.error ?? "削除に失敗しました"); }
    } catch { setErrorMsg("通信エラーが発生しました"); }
    finally { setIsDeleting(false); }
  }

  return (
    <div className="p-6 max-w-4xl">
      <Link href="/admin/articles" className="font-serif text-sm text-ink-tertiary hover:text-ink mb-4 inline-block">
        ← 学びの記事
      </Link>
      <h1 className="font-serif text-xl text-ink font-light mb-6">
        {isEdit ? "記事を編集" : "新しく書く"}
      </h1>

      {errorMsg && (
        <div className="mb-4 p-3 bg-paper-soft border-[0.5px] border-border font-serif text-sm text-ink">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* エディタ側 */}
        <div className="space-y-5">
          {/* タイトル */}
          <div>
            <label className="font-serif text-[11px] text-ink-tertiary tracking-section block mb-1.5">
              タ イ ト ル <span className="text-ink">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="例：坐禅の基本作法"
              className="w-full bg-transparent border-b-[0.5px] border-border focus:border-ink focus:outline-none py-2 text-sm font-serif text-ink placeholder:text-ink-tertiary"
            />
          </div>

          {/* slug */}
          <div>
            <label className="font-serif text-[11px] text-ink-tertiary tracking-section block mb-1.5">
              URL スラグ
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.replace(/\s+/g, "-"))}
              placeholder="zazen-kihon-saho"
              className="w-full bg-transparent border-b-[0.5px] border-border focus:border-ink focus:outline-none py-2 text-xs font-sans text-ink-secondary placeholder:text-ink-tertiary"
            />
          </div>

          {/* カテゴリ */}
          <div>
            <label className="font-serif text-[11px] text-ink-tertiary tracking-section block mb-1.5">
              カ テ ゴ リ
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-transparent border-b-[0.5px] border-border focus:border-ink focus:outline-none py-2 text-sm font-serif text-ink"
            >
              {ARTICLE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* 概要 */}
          <div>
            <label className="font-serif text-[11px] text-ink-tertiary tracking-section block mb-1.5">
              概 要 <span className="text-ink">*</span>
            </label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              placeholder="この記事の概要を2〜3文で…"
              className="w-full bg-transparent border-b-[0.5px] border-border focus:border-ink focus:outline-none py-2 text-sm font-serif text-ink resize-none placeholder:text-ink-tertiary"
              style={{ lineHeight: "1.8" }}
            />
          </div>

          {/* カバー画像 */}
          <div>
            <label className="font-serif text-[11px] text-ink-tertiary tracking-section block mb-1.5">
              カバー画像
            </label>
            {coverImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImage} alt="" className="w-full h-32 object-cover mb-2" />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
              disabled={coverUploading}
              className="block text-xs text-ink-tertiary file:mr-2 file:py-1 file:px-3 file:border-[0.5px] file:border-border file:text-xs file:font-serif file:bg-paper file:text-ink"
            />
            {coverUploading && <p className="text-xs text-ink-tertiary mt-1">アップロード中…</p>}
          </div>

          {/* 本文 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-serif text-[11px] text-ink-tertiary tracking-section">
                本 文（Markdown） <span className="text-ink">*</span>
              </label>
              <div className="flex items-center gap-3">
                {articleId && (
                  <>
                    <input
                      ref={imgInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleBodyImageUpload}
                      className="hidden"
                      id="body-img-upload"
                    />
                    <label
                      htmlFor="body-img-upload"
                      className="font-serif text-[11px] text-ink-tertiary tracking-section cursor-pointer border-b-[0.5px] border-dashed border-border"
                    >
                      {imgUploading ? "挿入中…" : "+ 画像を挿入"}
                    </label>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setPreview((v) => !v)}
                  className="font-serif text-[11px] text-ink-tertiary tracking-section border-b-[0.5px] border-border"
                >
                  {preview ? "編集に戻る" : "プレビュー"}
                </button>
              </div>
            </div>
            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={20}
              placeholder="## はじめに&#10;&#10;坐禅は..."
              className="w-full bg-transparent border-[0.5px] border-border focus:border-ink focus:outline-none p-3 text-sm font-sans text-ink resize-none placeholder:text-ink-tertiary"
              style={{ lineHeight: "1.8", display: preview ? "none" : "block" }}
            />
          </div>
        </div>

        {/* プレビュー側 */}
        <div className={`${preview ? "" : "hidden lg:block"} border-[0.5px] border-border-thin p-6 overflow-y-auto`} style={{ maxHeight: "80vh" }}>
          <p className="font-serif text-[11px] text-ink-tertiary tracking-section mb-4">プレビュー</p>
          {title && <h1 className="font-serif text-2xl text-ink font-medium leading-snug mb-4">{title}</h1>}
          {excerpt && <p className="font-serif text-sm text-ink-secondary font-light mb-6" style={{ lineHeight: "2" }}>{excerpt}</p>}
          {body && <ArticleRenderer content={body} />}
        </div>
      </div>

      {/* アクション */}
      <div className="flex items-center gap-4 mt-8 pt-4" style={{ borderTop: "0.5px solid #E5E5E5" }}>
        <button
          type="button"
          onClick={() => handleSave("DRAFT")}
          disabled={isPending}
          className="font-serif text-sm text-ink font-light px-5 py-2.5 border-[0.5px] border-border disabled:opacity-40"
        >
          {isPending ? "保存中…" : "下書き保存"}
        </button>
        <button
          type="button"
          onClick={() => handleSave("PUBLISHED")}
          disabled={isPending}
          className="bg-ink text-white font-serif font-light px-6 py-2.5 text-sm tracking-button disabled:opacity-40"
        >
          {isPending ? "保存中…" : "公開する"}
        </button>
        {isEdit && (
          <button
            type="button"
            onClick={() => handleSave("ARCHIVED")}
            disabled={isPending}
            className="font-serif text-sm text-ink-tertiary font-light"
          >
            アーカイブ
          </button>
        )}
        <Link href="/admin/articles" className="font-serif text-sm text-ink-tertiary font-light">
          キャンセル
        </Link>
      </div>

      {isEdit && (
        <div className="mt-4 pt-4" style={{ borderTop: "0.5px solid #F0F0F0" }}>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || isPending}
            className="font-serif text-sm text-ink-tertiary font-light border-b-[0.5px] border-ink-tertiary disabled:opacity-40"
          >
            {isDeleting ? "削除中…" : "この記事を削除する"}
          </button>
        </div>
      )}
    </div>
  );
}
