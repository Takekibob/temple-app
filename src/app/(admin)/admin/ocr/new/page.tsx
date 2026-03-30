"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewOcrPage() {
  const router = useRouter();
  const [requestType, setRequestType] = useState("KAKOCHO");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    // 実際の実装ではSupabase Storageに画像をアップロードしてfileUrlsを取得
    // ここではプレースホルダーとして空配列で申請（実運用時に画像アップロード機能を追加）
    const res = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestType,
        fileUrls: ["placeholder"],
        notes,
      }),
    });

    if (res.ok) {
      router.push("/admin/ocr");
    } else {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-stone-800 mb-2">紙データ取り込み申請</h1>
      <p className="text-sm text-stone-500 mb-6">
        過去帳・檀家名簿などの紙書類をデジタル化します。
        スキャン画像をスタッフが確認し、データを入力いたします。
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">取り込み種別</label>
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="KAKOCHO">過去帳</option>
            <option value="MEIBO">檀家名簿</option>
            <option value="OTHER">その他</option>
          </select>
        </div>

        <div className="bg-stone-50 rounded-xl p-5 border-2 border-dashed border-stone-200 text-center">
          <p className="text-stone-500 text-sm mb-2">画像ファイルをここにドロップ</p>
          <p className="text-xs text-stone-400">
            ※ 現在はサポートへの直接送付にてデータ化を行います
          </p>
          <p className="text-xs text-stone-400 mt-1">対応形式: JPG, PNG, PDF</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">補足・メモ（任意）</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
            placeholder="件数の目安、優先度、特記事項など"
          />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          申請後、担当スタッフより3営業日以内にご連絡いたします。
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-amber-700 text-white px-6 py-2 rounded-lg text-sm hover:bg-amber-800 disabled:opacity-50"
          >
            {saving ? "申請中..." : "申請する"}
          </button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-stone-500">
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
