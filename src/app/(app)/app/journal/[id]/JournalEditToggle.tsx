"use client";

import { useState } from "react";
import JournalFormClient from "../JournalFormClient";
import type { MoodValue } from "@/lib/journalMoods";
import { getMoodIcon } from "@/lib/journalMoods";
import { stripMarkdown } from "@/lib/journal/excerpt";

interface Props {
  journalId: string;
  initialData: {
    id: string;
    title: string | null;
    content: string;
    mood: string | null;
    tags: string[];
    entryDate: Date | string;
    relatedEventId: string | null;
  };
  recentEvents: { id: string; title: string; eventDate: Date | string }[];
}

async function downloadOgImage(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("image generation failed");
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  } catch {
    // fallback: open in new tab (iOS Safari など)
    window.open(url, "_blank");
  }
}

export default function JournalEditToggle({ journalId, initialData, recentEvents }: Props) {
  const [editing, setEditing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (editing) {
    return (
      <JournalFormClient
        isEdit
        recentEvents={recentEvents}
        initialData={{ ...initialData, mood: initialData.mood as MoodValue | null }}
      />
    );
  }

  // コピー用テキスト生成
  const d = new Date(initialData.entryDate);
  const DAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;
  const dateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${DAYS[d.getDay()]}）`;
  const plainExcerpt = stripMarkdown(initialData.content).slice(0, 60) +
    (initialData.content.length > 60 ? "…" : "");

  const copyLines = [
    dateStr + "の気づき",
    ...(initialData.title ? [initialData.title] : []),
    plainExcerpt,
    "",
    ...(initialData.mood ? [getMoodIcon(initialData.mood)] : []),
    "#てらログ #自分と向き合う",
  ];
  const copyText = copyLines.filter((l) => l !== "" || copyLines.indexOf(l) !== copyLines.length - 2).join("\n");

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadOgImage(
        `/api/og/journal/${journalId}`,
        `teralog-journal-${journalId.slice(0, 8)}.png`
      );
    } finally {
      setDownloading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API not available
    }
  }

  return (
    <div className="mt-10">
      {/* アクション行 */}
      <div className="pt-4 flex flex-wrap gap-4" style={{ borderTop: "0.5px solid var(--color-border)" }}>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="font-serif text-sm text-ink font-light border-b-[0.5px] border-ink"
        >
          編集する
        </button>
        <button
          type="button"
          onClick={() => setShareOpen((v) => !v)}
          className="font-serif text-sm text-ink-tertiary font-light border-b-[0.5px] border-dashed border-border"
        >
          {shareOpen ? "閉じる" : "この記録を画像にする"}
        </button>
      </div>

      {/* シェアパネル */}
      {shareOpen && (
        <div className="mt-5 p-4 bg-paper-soft border-[0.5px] border-border space-y-5">
          {/* 画像ダウンロード */}
          <div>
            <p className="font-serif text-[11px] text-ink-tertiary tracking-section mb-2">
              画 像（1080 × 1350）
            </p>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="font-serif text-sm text-ink font-light border-[0.5px] border-border px-5 py-2 disabled:opacity-40"
            >
              {downloading ? "生成中…" : "画像をダウンロード"}
            </button>
            <p className="font-serif text-[10px] text-ink-tertiary mt-2">
              iOS Safari の場合は画面が開くので、長押し → 写真に追加 してください
            </p>
          </div>

          {/* コピー用テキスト */}
          <div>
            <p className="font-serif text-[11px] text-ink-tertiary tracking-section mb-2">
              投 稿 用 テ キ ス ト
            </p>
            <pre
              className="font-serif text-xs text-ink-secondary font-light whitespace-pre-wrap bg-paper border-[0.5px] border-border p-3 mb-2"
              style={{ lineHeight: "1.8" }}
            >
              {copyText}
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              className="font-serif text-[11px] tracking-section border-b-[0.5px] border-dashed border-border"
              style={{ color: copied ? "var(--color-ink)" : undefined }}
            >
              {copied ? "コピーしました ✓" : "テキストをコピー"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
