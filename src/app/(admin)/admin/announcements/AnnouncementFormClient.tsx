"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AnnouncementData {
  id?: string;
  title: string;
  body: string;
  targetSegment: "ALL" | "DANKA" | "GOEN";
  publishedAt: string | null;
}

export default function AnnouncementFormClient({
  initial,
}: {
  initial?: AnnouncementData;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [targetSegment, setTargetSegment] = useState<"ALL" | "DANKA" | "GOEN">(
    initial?.targetSegment ?? "ALL"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sendPush, setSendPush] = useState(false);

  const isEdit = !!initial?.id;
  const isPublished = !!initial?.publishedAt;

  async function save(publish: boolean, unpublish?: boolean) {
    setErrorMsg(null);
    startTransition(async () => {
      const url = isEdit
        ? `/api/announcements/${initial!.id}`
        : "/api/announcements";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, targetSegment, publish, unpublish, sendPush: publish && sendPush }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "保存に失敗しました");
      } else {
        router.push("/admin/announcements");
        router.refresh();
      }
    });
  }

  async function handleDelete() {
    if (!confirm("このお知らせを削除しますか？")) return;
    startTransition(async () => {
      const res = await fetch(`/api/announcements/${initial!.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/admin/announcements");
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMsg(data.error ?? "削除に失敗しました");
      }
    });
  }

  return (
    <div className="max-w-2xl">
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-5">
        {/* 配信対象 */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">配信対象</label>
          <div className="flex gap-3">
            {(["ALL", "DANKA", "GOEN"] as const).map((seg) => (
              <label key={seg} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="segment"
                  value={seg}
                  checked={targetSegment === seg}
                  onChange={() => setTargetSegment(seg)}
                  className="accent-amber-700"
                />
                <span className="text-sm text-stone-700">
                  {seg === "ALL" ? "全員" : seg === "DANKA" ? "檀家のみ" : "ご縁さんのみ"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* タイトル */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：お盆法要のご案内"
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* 本文 */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            本文 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder="お知らせの内容を入力してください..."
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
          />
        </div>

        {/* プッシュ通知オプション */}
        {!isPublished && (
          <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
            <input
              type="checkbox"
              id="sendPush"
              checked={sendPush}
              onChange={(e) => setSendPush(e.target.checked)}
              className="accent-amber-700 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="sendPush" className="text-sm text-stone-700 cursor-pointer">
              プッシュ通知も送信する
              <span className="text-xs text-stone-400 ml-1">（公開時のみ）</span>
            </label>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-5">
        <div className="flex gap-2">
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-40"
            >
              削除
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {isEdit && isPublished && (
            <button
              type="button"
              onClick={() => save(false, true)}
              disabled={isPending}
              className="px-4 py-2 text-sm border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 disabled:opacity-40"
            >
              非公開に戻す
            </button>
          )}
          <button
            type="button"
            onClick={() => save(false)}
            disabled={isPending || !title.trim() || !body.trim()}
            className="px-4 py-2 text-sm border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50 disabled:opacity-40"
          >
            下書き保存
          </button>
          <button
            type="button"
            onClick={() => save(true)}
            disabled={isPending || !title.trim() || !body.trim()}
            className="px-4 py-2 text-sm bg-amber-700 text-white rounded-lg hover:bg-amber-800 disabled:opacity-40 font-medium"
          >
            {isPending ? "保存中…" : isPublished ? "更新して公開" : "公開する"}
          </button>
        </div>
      </div>
    </div>
  );
}
