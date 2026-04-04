"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ImportResult {
  row: number;
  success: boolean;
  error?: string;
}

interface ImportResponse {
  results: ImportResult[];
  successCount: number;
  totalRows: number;
}

export default function ImportClient() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string[][] | null>(null);
  const [isPending, startTransition] = useTransition();
  const [response, setResponse] = useState<ImportResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = text.split("\n").slice(0, 6).map((r) => r.split(","));
      setPreview(rows);
      setResponse(null);
      setErrorMsg(null);
    };
    reader.readAsText(file, "utf-8");
  }

  function handleImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;

    startTransition(async () => {
      setErrorMsg(null);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/members/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "インポートに失敗しました");
      } else {
        setResponse(data);
      }
    });
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <Link href="/admin/members" className="text-sm text-stone-400 hover:text-stone-600 mb-4 inline-block">
        ← 会員一覧
      </Link>
      <h1 className="text-xl font-bold text-stone-800 mb-2">CSVインポート</h1>
      <p className="text-sm text-stone-500 mb-6">
        CSVファイルから会員データを一括登録します。
      </p>

      {/* CSV仕様 */}
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 mb-6 text-sm">
        <p className="font-medium text-stone-700 mb-2">CSVフォーマット（1行目はヘッダー）</p>
        <code className="text-xs text-stone-600 block">
          name,email,type,familyName,phone,address,postalCode,notes,joinedDate
        </code>
        <ul className="mt-2 space-y-1 text-xs text-stone-500">
          <li>・<strong>name, email, type, familyName</strong> は必須</li>
          <li>・type は <strong>DANKA</strong> または <strong>GOEN</strong></li>
          <li>・joinedDate は YYYY-MM-DD 形式（省略可）</li>
          <li>・文字コードは UTF-8</li>
        </ul>
        <a
          href="data:text/csv;charset=utf-8,name,email,type,familyName,phone,address,postalCode,notes,joinedDate%0A山田太郎,yamada@example.com,DANKA,山田家,090-0000-0000,東京都千代田区1-1,100-0001,,2024-01-01%0A佐藤花子,sato@example.com,GOEN,佐藤,,,,,,"
          download="import_template.csv"
          className="mt-2 inline-block text-xs text-amber-700 hover:underline"
        >
          テンプレートをダウンロード
        </a>
      </div>

      {/* ファイル選択 */}
      <div className="bg-white rounded-xl border border-stone-200 p-6 mb-4">
        <label className="block text-sm font-medium text-stone-700 mb-2">CSVファイル</label>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="block text-sm text-stone-600 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-stone-200 file:text-sm file:bg-white file:text-stone-700 hover:file:bg-stone-50"
        />
      </div>

      {/* プレビュー */}
      {preview && (
        <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
          <p className="text-sm font-medium text-stone-700 mb-2">プレビュー（先頭5行）</p>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className={i === 0 ? "bg-stone-50 font-medium" : ""}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-2 py-1 border border-stone-100 text-stone-700">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{errorMsg}</div>
      )}

      {/* インポート結果 */}
      {response && (
        <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">✅</span>
            <div>
              <p className="font-semibold text-stone-800">
                {response.successCount} / {response.totalRows} 件 インポート完了
              </p>
            </div>
          </div>
          {response.results.filter((r) => !r.success).length > 0 && (
            <div className="mt-3">
              <p className="text-sm font-medium text-red-700 mb-2">エラー行:</p>
              <ul className="space-y-1">
                {response.results
                  .filter((r) => !r.success)
                  .map((r) => (
                    <li key={r.row} className="text-xs text-red-600">
                      {r.row}行目: {r.error}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          onClick={handleImport}
          disabled={!preview || isPending}
          className="bg-amber-700 hover:bg-amber-800 text-white"
        >
          {isPending ? "インポート中…" : "インポート実行"}
        </Button>
        <Link
          href="/admin/members"
          className="px-4 py-2 text-sm border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50"
        >
          キャンセル
        </Link>
      </div>
    </div>
  );
}
