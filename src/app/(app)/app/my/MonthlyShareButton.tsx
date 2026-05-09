"use client";

import { useState } from "react";

interface Props {
  year: number;
  month: number;
  journalCount: number;
  eventCount: number;
  topTags: string[];
}

async function downloadOgImage(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("failed");
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
    window.open(url, "_blank");
  }
}

export default function MonthlyShareButton({ year, month, journalCount, eventCount, topTags }: Props) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  const tagLine = topTags.map((t) => `#${t}`).join(" ");
  const copyText = [
    `${month}月のてらログ`,
    `📿 学びの日記 ${journalCount}篇`,
    `🏯 集いに${eventCount}回参加`,
    "",
    ...(tagLine ? [tagLine] : []),
    "#てらログ #自分と向き合う",
  ].join("\n");

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadOgImage(
        `/api/og/my/monthly?year=${year}&month=${month}`,
        `teralog-${year}-${String(month).padStart(2, "0")}.png`
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
      // unavailable
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="font-serif text-[11px] text-ink-tertiary tracking-section border-b-[0.5px] border-dashed border-border"
      >
        {open ? "閉じる" : "今月のてらログを画像にする"}
      </button>

      {open && (
        <div className="mt-4 p-4 bg-paper-soft border-[0.5px] border-border space-y-5">
          {/* 画像 */}
          <div>
            <p className="font-serif text-[11px] text-ink-tertiary tracking-section mb-2">
              画 像（1080 × 1080）
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
              iOS Safari の場合は長押し → 写真に追加
            </p>
          </div>

          {/* コピーテキスト */}
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
