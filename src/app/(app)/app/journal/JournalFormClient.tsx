"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MOODS, type MoodValue } from "@/lib/journalMoods";
import ArticleRenderer from "@/components/teralog/ArticleRenderer";

interface RecentEvent {
  id: string;
  title: string;
  eventDate: Date | string;
}

interface JournalData {
  id?: string;
  title?: string | null;
  content?: string;
  mood?: MoodValue | null;
  tags?: string[];
  entryDate?: Date | string;
  relatedEventId?: string | null;
}

interface Props {
  initialData?: JournalData;
  isEdit?: boolean;
  recentEvents?: RecentEvent[];
}

const STORAGE_KEY = "journal_draft";

export default function JournalFormClient({ initialData, isEdit, recentEvents = [] }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [content, setContent] = useState(initialData?.content ?? "");
  const [mood, setMood] = useState<MoodValue | "">(initialData?.mood ?? "");
  const [tags, setTags] = useState<string[]>(initialData?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [entryDate, setEntryDate] = useState(
    initialData?.entryDate
      ? new Date(initialData.entryDate).toISOString().split("T")[0]
      : today
  );
  const [relatedEventId, setRelatedEventId] = useState(initialData?.relatedEventId ?? "");
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  // localStorage 下書き復元（新規作成のみ）
  useEffect(() => {
    if (isEdit) return;
    const draft = localStorage.getItem(STORAGE_KEY);
    if (draft) {
      try {
        const d = JSON.parse(draft);
        if (d.content) setContent(d.content);
        if (d.title) setTitle(d.title);
        if (d.mood) setMood(d.mood);
        if (d.tags) setTags(d.tags);
        if (d.entryDate) setEntryDate(d.entryDate);
      } catch { /* ignore */ }
    }
  }, [isEdit]);

  // localStorage 自動保存（新規作成のみ）
  useEffect(() => {
    if (isEdit) return;
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ title, content, mood, tags, entryDate }));
    }, 1000);
    return () => clearTimeout(timer);
  }, [title, content, mood, tags, entryDate, isEdit]);

  // タグサジェスト取得
  useEffect(() => {
    fetch("/api/journal/tags")
      .then((r) => r.json())
      .then((data) => setSuggestedTags(data.tags?.map((t: { tag: string }) => t.tag) ?? []))
      .catch(() => {});
  }, []);

  function addTag(tag: string) {
    const t = tag.trim();
    if (!t || tags.includes(t) || tags.length >= 10) return;
    setTags([...tags, t]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  function handleSave() {
    if (!content.trim()) {
      setErrorMsg("本文を入力してください");
      return;
    }
    setErrorMsg(null);

    const payload = {
      title: title.trim() || null,
      content: content.trim(),
      mood: mood || null,
      tags,
      entryDate,
      relatedEventId: relatedEventId || null,
    };

    startTransition(async () => {
      const url = isEdit ? `/api/journal/${initialData!.id}` : "/api/journal";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "保存に失敗しました");
        return;
      }
      if (!isEdit) localStorage.removeItem(STORAGE_KEY);
      router.push("/app/journal");
    });
  }

  async function handleDelete() {
    if (!confirm("この日記を削除しますか？")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/journal/${initialData!.id}`, { method: "DELETE" });
      if (res.ok) router.push("/app/journal");
      else { const d = await res.json(); setErrorMsg(d.error ?? "削除に失敗しました"); }
    } catch { setErrorMsg("通信エラーが発生しました"); }
    finally { setIsDeleting(false); }
  }

  const charCount = content.length;

  return (
    <div className="p-5 max-w-2xl mx-auto pb-28">
      <Link href="/app/journal" className="font-serif text-[11px] text-ink-tertiary tracking-section block mb-4">
        ← 学びの日記
      </Link>
      <h1 className="font-serif text-xl text-ink font-light mb-5">
        {isEdit ? "記録を編集" : "記録する"}
      </h1>

      {errorMsg && (
        <div className="mb-4 p-3 bg-paper-soft border-[0.5px] border-border font-serif text-sm text-ink">
          {errorMsg}
        </div>
      )}

      <div className="space-y-5">
        {/* 日付 */}
        <div>
          <label className="font-serif text-[11px] text-ink-tertiary tracking-section block mb-1.5">
            日 付 <span className="text-ink">*</span>
          </label>
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
            max={today}
            className="bg-transparent border-b-[0.5px] border-border focus:border-ink focus:outline-none py-2 text-sm font-sans text-ink"
          />
        </div>

        {/* タイトル（任意） */}
        <div>
          <label className="font-serif text-[11px] text-ink-tertiary tracking-section block mb-1.5">
            タ イ ト ル（任意）
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            placeholder="今日の一言（省略可）"
            className="w-full bg-transparent border-b-[0.5px] border-border focus:border-ink focus:outline-none py-2 text-sm font-serif text-ink placeholder:text-ink-tertiary"
          />
        </div>

        {/* mood セレクタ */}
        <div>
          <label className="font-serif text-[11px] text-ink-tertiary tracking-section block mb-2">
            こ こ ろ の 状 態（任意）
          </label>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMood(mood === m.value ? "" : m.value as MoodValue)}
                className={`font-serif text-sm px-3 py-1.5 border-[0.5px] transition-colors ${
                  mood === m.value
                    ? "bg-ink text-white border-ink"
                    : "text-ink border-border"
                }`}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* タグ */}
        <div>
          <label className="font-serif text-[11px] text-ink-tertiary tracking-section block mb-1.5">
            タ グ（最大10個、Enterで追加）
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="font-sans text-xs text-ink-secondary bg-paper-soft px-2 py-0.5 flex items-center gap-1"
              >
                {tag}
                <button type="button" onClick={() => removeTag(tag)} className="text-ink-tertiary hover:text-ink">×</button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
            placeholder="タグを入力…"
            disabled={tags.length >= 10}
            className="w-full bg-transparent border-b-[0.5px] border-border focus:border-ink focus:outline-none py-1.5 text-sm font-sans text-ink placeholder:text-ink-tertiary disabled:opacity-40"
          />
          {/* サジェスト */}
          {suggestedTags.filter((t) => !tags.includes(t) && t.includes(tagInput) && tagInput).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {suggestedTags
                .filter((t) => !tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase()) && tagInput)
                .slice(0, 8)
                .map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addTag(t)}
                    className="font-sans text-[11px] text-ink-tertiary border-[0.5px] border-dashed border-border px-2 py-0.5"
                  >
                    + {t}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* 関連イベント */}
        {recentEvents.length > 0 && (
          <div>
            <label className="font-serif text-[11px] text-ink-tertiary tracking-section block mb-1.5">
              関 連 イ ベ ン ト（任意）
            </label>
            <select
              value={relatedEventId}
              onChange={(e) => setRelatedEventId(e.target.value)}
              className="w-full bg-transparent border-b-[0.5px] border-border focus:border-ink focus:outline-none py-2 text-sm font-serif text-ink"
            >
              <option value="">選択しない</option>
              {recentEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {new Date(ev.eventDate).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })} {ev.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 本文エディタ */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-serif text-[11px] text-ink-tertiary tracking-section">
              本 文（Markdown） <span className="text-ink">*</span>
            </label>
            <div className="flex items-center gap-3">
              <span className={`font-sans text-[10px] ${charCount > 9000 ? "text-amber-600" : "text-ink-tertiary"}`}>
                {charCount.toLocaleString()} / 10,000
              </span>
              <button
                type="button"
                onClick={() => setPreview((v) => !v)}
                className="font-serif text-[11px] text-ink-tertiary tracking-section border-b-[0.5px] border-border"
              >
                {preview ? "編集に戻る" : "プレビュー"}
              </button>
            </div>
          </div>

          {preview ? (
            <div className="border-[0.5px] border-border-thin p-4 min-h-64">
              {content ? (
                <ArticleRenderer content={content} />
              ) : (
                <p className="font-serif text-sm text-ink-tertiary font-light">本文を入力してください</p>
              )}
            </div>
          ) : (
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              maxLength={10000}
              placeholder="今日の気づきを書き留める…"
              className="w-full bg-transparent border-[0.5px] border-border focus:border-ink focus:outline-none p-3 text-sm font-sans text-ink resize-none placeholder:text-ink-tertiary"
              style={{ lineHeight: "1.8" }}
            />
          )}
        </div>
      </div>

      {/* アクション */}
      <div className="flex items-center gap-4 mt-8 pt-4" style={{ borderTop: "0.5px solid #E5E5E5" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="bg-ink text-white font-serif font-light px-6 py-2.5 text-sm tracking-button disabled:opacity-40"
        >
          {isPending ? "保存中…" : "保存する"}
        </button>
        <Link href="/app/journal" className="font-serif text-sm text-ink-tertiary font-light">
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
            {isDeleting ? "削除中…" : "この記録を削除する"}
          </button>
        </div>
      )}
    </div>
  );
}
