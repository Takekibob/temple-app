"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MOODS, getMoodIcon, getMoodLabel } from "@/lib/journalMoods";

interface JournalItem {
  id: string;
  title: string | null;
  content: string;
  mood: string | null;
  tags: string[];
  entryDate: string;
  relatedEvent: { id: string; title: string } | null;
}

function formatEntryDate(dateStr: string): string {
  const d = new Date(dateStr);
  const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
  return `${d.getMonth() + 1}.${d.getDate()} ${DAYS[d.getDay()]}`;
}

// ── カレンダービュー ──────────────────────────────────────
function CalendarView({ journals }: { journals: JournalItem[] }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const entryDateSet = new Set(
    journals
      .filter((j) => {
        const d = new Date(j.entryDate);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map((j) => new Date(j.entryDate).getDate())
  );

  // 月移動
  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    const n = new Date();
    if (year > n.getFullYear() || (year === n.getFullYear() && month >= n.getMonth())) return;
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const dayEntries = journals
    .filter((j) => {
      const d = new Date(j.entryDate);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="font-sans text-ink-tertiary text-sm px-2">‹</button>
        <span className="font-serif text-sm text-ink">{year}年 {month + 1}月</span>
        <button onClick={nextMonth} className="font-sans text-ink-tertiary text-sm px-2">›</button>
      </div>

      {/* 曜日 */}
      <div className="grid grid-cols-7 mb-1">
        {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
          <div key={d} className={`text-center font-serif text-[10px] tracking-section py-1 ${i === 0 ? "text-rose-400" : i === 6 ? "text-sky-400" : "text-ink-tertiary"}`}>
            {d}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const hasEntry = entryDateSet.has(day);
          return (
            <div
              key={day}
              className={`aspect-square flex items-center justify-center ${hasEntry ? "bg-ink/5" : ""}`}
            >
              <span className={`font-serif text-sm ${hasEntry ? "text-ink font-medium" : "text-ink-tertiary"}`}>
                {day}
                {hasEntry && <span className="block w-1 h-1 bg-ink rounded-full mx-auto mt-0.5" />}
              </span>
            </div>
          );
        })}
      </div>

      {/* 当月の記録一覧 */}
      {dayEntries.length > 0 && (
        <div className="mt-5 space-y-2">
          {dayEntries.map((j) => (
            <JournalCard key={j.id} journal={j} />
          ))}
        </div>
      )}
      {dayEntries.length === 0 && (
        <p className="text-center font-serif text-sm text-ink-tertiary font-light mt-6">この月の記録はありません</p>
      )}
    </div>
  );
}

// ── 記録カード ──────────────────────────────────────
function JournalCard({ journal }: { journal: JournalItem }) {
  const excerpt = journal.content.replace(/[#*`>\-\[\]!\n]/g, " ").trim().slice(0, 120);
  return (
    <Link
      href={`/app/journal/${journal.id}`}
      className="block py-4"
      style={{ borderBottom: "0.5px solid var(--color-border-thin)" }}
    >
      <div className="flex items-baseline justify-between mb-1">
        <time className="font-sans text-[11px] text-ink-tertiary">
          {formatEntryDate(journal.entryDate)}
        </time>
        {journal.mood && (
          <span className="font-serif text-[11px] text-ink-tertiary">
            {getMoodIcon(journal.mood)} {getMoodLabel(journal.mood)}
          </span>
        )}
      </div>
      {journal.title && (
        <p className="font-serif text-sm text-ink font-light mb-1">{journal.title}</p>
      )}
      <p className="font-serif text-xs text-ink-secondary font-light leading-relaxed line-clamp-3">
        {excerpt || "（本文なし）"}
      </p>
      {journal.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {journal.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="font-sans text-[10px] text-ink-tertiary bg-paper-soft px-1.5 py-0.5">
              {tag}
            </span>
          ))}
          {journal.tags.length > 4 && (
            <span className="font-sans text-[10px] text-ink-tertiary">+{journal.tags.length - 4}</span>
          )}
        </div>
      )}
    </Link>
  );
}

// ── メインコンポーネント ──────────────────────────────────────
export default function JournalListClient() {
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [journals, setJournals] = useState<JournalItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // フィルタ
  const [filterMood, setFilterMood] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterHasEvent, setFilterHasEvent] = useState("");

  const buildUrl = useCallback((cursor?: string) => {
    const params = new URLSearchParams();
    if (filterMood) params.set("mood", filterMood);
    if (filterTag) params.set("tag", filterTag);
    if (filterYear) params.set("year", filterYear);
    if (filterMonth) params.set("month", filterMonth);
    if (filterHasEvent) params.set("hasEvent", filterHasEvent);
    if (cursor) params.set("cursor", cursor);
    return `/api/journal?${params.toString()}`;
  }, [filterMood, filterTag, filterYear, filterMonth, filterHasEvent]);

  const fetchJournals = useCallback(async () => {
    setLoading(true);
    setNextCursor(null);
    try {
      const res = await fetch(buildUrl());
      const data = await res.json();
      setJournals(data.journals ?? []);
      setNextCursor(data.nextCursor ?? null);
    } finally { setLoading(false); }
  }, [buildUrl]);

  useEffect(() => { fetchJournals(); }, [fetchJournals]);

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(nextCursor));
      const data = await res.json();
      setJournals((prev) => [...prev, ...(data.journals ?? [])]);
      setNextCursor(data.nextCursor ?? null);
    } finally { setLoadingMore(false); }
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  return (
    <div className="pb-28 max-w-lg mx-auto">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/app" className="font-serif text-[11px] text-ink-tertiary tracking-section block mb-1">
              ← ホーム
            </Link>
            <h1 className="font-serif text-xl text-ink font-light">学びの日記</h1>
          </div>
          <Link
            href="/app/journal/new"
            className="bg-ink text-white font-serif font-light px-4 py-2 text-sm tracking-button"
          >
            記録する
          </Link>
        </div>
      </div>

      {/* リスト / カレンダー切替 */}
      <div className="flex px-5 mb-4 gap-4" style={{ borderBottom: "0.5px solid var(--color-border)" }}>
        {(["list", "calendar"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode)}
            className={`font-serif text-[11px] tracking-section pb-3 ${
              viewMode === mode ? "text-ink border-b border-ink" : "text-ink-tertiary"
            }`}
          >
            {mode === "list" ? "リスト" : "カレンダー"}
          </button>
        ))}
      </div>

      {/* フィルタ（リストのみ） */}
      {viewMode === "list" && (
        <div className="px-5 mb-4 flex flex-wrap gap-2">
          {/* mood */}
          <select
            value={filterMood}
            onChange={(e) => setFilterMood(e.target.value)}
            className="font-serif text-[11px] text-ink-tertiary bg-transparent border-[0.5px] border-border px-2 py-1"
          >
            <option value="">すべての気持ち</option>
            {MOODS.map((m) => (
              <option key={m.value} value={m.value}>{m.icon} {m.label}</option>
            ))}
          </select>

          {/* 年月 */}
          <select
            value={filterYear}
            onChange={(e) => { setFilterYear(e.target.value); setFilterMonth(""); }}
            className="font-serif text-[11px] text-ink-tertiary bg-transparent border-[0.5px] border-border px-2 py-1"
          >
            <option value="">年を選択</option>
            {years.map((y) => <option key={y} value={String(y)}>{y}年</option>)}
          </select>
          {filterYear && (
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="font-serif text-[11px] text-ink-tertiary bg-transparent border-[0.5px] border-border px-2 py-1"
            >
              <option value="">月を選択</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={String(m)}>{m}月</option>
              ))}
            </select>
          )}

          {/* イベント */}
          <select
            value={filterHasEvent}
            onChange={(e) => setFilterHasEvent(e.target.value)}
            className="font-serif text-[11px] text-ink-tertiary bg-transparent border-[0.5px] border-border px-2 py-1"
          >
            <option value="">すべて</option>
            <option value="true">イベント紐付きのみ</option>
            <option value="false">紐付けなし</option>
          </select>
        </div>
      )}

      <div className="px-5">
        {loading ? (
          <p className="text-center font-serif text-sm text-ink-tertiary font-light py-12">読み込み中…</p>
        ) : viewMode === "calendar" ? (
          <CalendarView journals={journals} />
        ) : journals.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-serif text-sm text-ink-tertiary font-light mb-4">記録がありません</p>
            <Link href="/app/journal/new" className="font-serif text-sm text-ink font-light border-b-[0.5px] border-ink">
              最初の記録を書く
            </Link>
          </div>
        ) : (
          <>
            {journals.map((j) => <JournalCard key={j.id} journal={j} />)}
            {nextCursor && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full font-serif text-sm text-ink-tertiary font-light py-4 disabled:opacity-40"
              >
                {loadingMore ? "読み込み中…" : "さらに読み込む"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
