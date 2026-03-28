"use client";

import { useState } from "react";

interface ExportButtonProps {
  href: string;
  label?: string;
  filename: string;
}

export default function ExportButton({ href, label = "CSVダウンロード", filename }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error("エクスポートに失敗しました");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("CSVのダウンロードに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
    >
      {loading ? (
        <span className="inline-block w-3.5 h-3.5 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
      ) : (
        <span>↓</span>
      )}
      {loading ? "準備中…" : label}
    </button>
  );
}
