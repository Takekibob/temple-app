"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface InitialData {
  id: string;
  title: string;
  body: string;
  coverImageUrl: string | null;
  isSubscriberOnly: boolean;
  status: string;
}

interface Props {
  initial?: InitialData;
}

export default function BlogFormClient({ initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState(initial?.coverImageUrl ?? "");
  const [imageUploading, setImageUploading] = useState(false);

  const isEdit = !!initial;

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/events/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setImageUrl(data.url);
    } finally {
      setImageUploading(false);
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>, publishStatus?: string) {
    e.preventDefault();
    setErrorMsg(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      title: form.get("title"),
      body: form.get("body"),
      coverImageUrl: imageUrl || null,
      isSubscriberOnly: form.get("isSubscriberOnly") === "on",
      status: publishStatus ?? (isEdit ? undefined : "DRAFT"),
    };

    startTransition(async () => {
      const url = isEdit ? `/api/blog/${initial!.id}` : "/api/blog";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "保存に失敗しました");
      } else {
        router.push("/admin/blog");
        router.refresh();
      }
    });
  }

  async function handleDelete() {
    if (!confirm("この記事を削除しますか？")) return;
    setIsDeleting(true);
    try {
      await fetch(`/api/blog/${initial!.id}`, { method: "DELETE" });
      router.push("/admin/blog");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <Link href="/admin/blog" className="text-sm text-stone-400 hover:text-stone-600 mb-4 inline-block">
        ← ブログ管理
      </Link>
      <h1 className="text-xl font-bold text-stone-800 mb-6">
        {isEdit ? "記事編集" : "記事作成"}
      </h1>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e)} className="space-y-5">
        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-stone-700 font-medium">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              name="title"
              required
              defaultValue={initial?.title ?? ""}
              placeholder="記事タイトルを入力"
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-stone-700 font-medium">本文</label>
            <textarea
              name="body"
              rows={12}
              defaultValue={initial?.body ?? ""}
              placeholder="記事の内容を入力してください"
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <h2 className="font-semibold text-stone-700">カバー画像</h2>
          {imageUrl && (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="w-full h-40 object-cover rounded-lg border border-stone-200" />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="absolute top-2 right-2 bg-white/80 hover:bg-white text-stone-600 rounded-full w-6 h-6 flex items-center justify-center text-xs border border-stone-200"
              >
                ✕
              </button>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={imageUploading}
            className="block w-full text-sm text-stone-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100 disabled:opacity-50"
          />
          {imageUploading && <p className="text-xs text-stone-400">アップロード中…</p>}
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h2 className="font-semibold text-stone-700 mb-3">公開設定</h2>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="isSubscriberOnly"
              defaultChecked={initial?.isSubscriberOnly ?? false}
              className="w-4 h-4 accent-amber-700"
            />
            <span className="text-sm text-stone-700">会員プラン加入者のみ閲覧可</span>
          </label>
          <p className="text-xs text-stone-400 mt-1 ml-6">
            チェックすると、月払い・年払いいずれかに加入中の会員のみが閲覧できます
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-stone-600 hover:bg-stone-700 text-white text-sm rounded-lg disabled:opacity-40"
          >
            {isPending ? "保存中…" : "下書き保存"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={(e) => {
              const form = (e.currentTarget as HTMLButtonElement).closest("form") as HTMLFormElement;
              handleSubmit(
                { currentTarget: form, preventDefault: () => {} } as React.FormEvent<HTMLFormElement>,
                "PUBLISHED"
              );
            }}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-sm rounded-lg disabled:opacity-40"
          >
            {isPending ? "保存中…" : "公開する"}
          </button>
          <Link
            href="/admin/blog"
            className="px-4 py-2 text-sm border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50"
          >
            キャンセル
          </Link>
        </div>

        {isEdit && (
          <div className="pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isPending}
              className="w-full py-2 text-sm border border-red-200 text-red-600 hover:bg-red-50 rounded-lg"
            >
              {isDeleting ? "削除中…" : "この記事を削除する"}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
