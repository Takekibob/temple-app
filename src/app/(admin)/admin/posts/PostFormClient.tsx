"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PhotoItem {
  url: string;
  caption: string;
  uploading?: boolean;
  error?: string;
}

interface PostData {
  id?: string;
  title?: string | null;
  body?: string;
  photos?: Array<{ url: string; caption: string | null }>;
}

interface Props {
  initialData?: PostData;
  isEdit?: boolean;
}

export default function PostFormClient({ initialData, isEdit }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [body, setBody] = useState(initialData?.body ?? "");
  const [photos, setPhotos] = useState<PhotoItem[]>(
    initialData?.photos?.map((p) => ({ url: p.url, caption: p.caption ?? "" })) ?? []
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (photos.length + files.length > 4) {
      setErrorMsg("写真は最大4枚までです");
      return;
    }

    for (const file of files.slice(0, 4 - photos.length)) {
      const placeholder: PhotoItem = { url: "", caption: "", uploading: true };
      setPhotos((prev) => [...prev, placeholder]);

      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/admin/posts/photos", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setPhotos((prev) =>
            prev.map((p, i) =>
              i === prev.length - 1 && p.uploading ? { ...p, uploading: false, error: data.error ?? "失敗" } : p
            )
          );
        } else {
          setPhotos((prev) =>
            prev.map((p, i) =>
              i === prev.length - 1 && p.uploading ? { url: data.url, caption: "", uploading: false } : p
            )
          );
        }
      } catch {
        setPhotos((prev) => prev.filter((p) => !p.uploading));
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  function movePhoto(idx: number, dir: -1 | 1) {
    setPhotos((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function updateCaption(idx: number, caption: string) {
    setPhotos((prev) => prev.map((p, i) => (i === idx ? { ...p, caption } : p)));
  }

  function handleSubmit() {
    if (!body.trim()) { setErrorMsg("本文を入力してください"); return; }
    setErrorMsg(null);

    const payload = {
      title: title.trim() || undefined,
      content: body.trim(),
      photos: photos
        .filter((p) => p.url && !p.uploading)
        .map((p, i) => ({ url: p.url, caption: p.caption || undefined, order: i })),
    };

    startTransition(async () => {
      const url = isEdit ? `/api/admin/posts/${initialData!.id}` : "/api/admin/posts";
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
        router.push("/admin/posts");
      }
    });
  }

  async function handleDelete() {
    if (!confirm("この投稿を削除しますか？この操作は取り消せません。")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/posts/${initialData!.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error ?? "削除に失敗しました");
      } else {
        router.push("/admin/posts");
      }
    } catch {
      setErrorMsg("通信エラーが発生しました");
    } finally {
      setIsDeleting(false);
    }
  }

  const isUploading = photos.some((p) => p.uploading);

  return (
    <div className="p-6 max-w-2xl">
      <Link href="/admin/posts" className="font-serif text-sm text-ink-tertiary hover:text-ink mb-4 inline-block">
        ← お寺の声
      </Link>
      <h1 className="font-serif text-xl text-ink font-light mb-6">
        {isEdit ? "投稿を編集" : "新しく書く"}
      </h1>

      {errorMsg && (
        <div className="mb-4 p-3 bg-paper-soft border-[0.5px] border-border font-serif text-sm text-ink">
          {errorMsg}
        </div>
      )}

      <div className="space-y-6">
        {/* タイトル */}
        <div>
          <label className="font-serif text-[11px] text-ink-tertiary tracking-section block mb-2">
            見 出 し（任意）
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例：今朝の境内"
            className="w-full bg-transparent border-b-[0.5px] border-border focus:border-ink focus:outline-none py-2 text-sm font-serif text-ink placeholder:text-ink-tertiary"
          />
        </div>

        {/* 本文 */}
        <div>
          <label className="font-serif text-[11px] text-ink-tertiary tracking-section block mb-2">
            本 文 <span className="text-ink">*</span>
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            placeholder="今日の様子や気づきを書いてください…"
            className="w-full bg-transparent border-b-[0.5px] border-border focus:border-ink focus:outline-none py-2 text-sm font-serif text-ink leading-[2] resize-none placeholder:text-ink-tertiary"
          />
        </div>

        {/* 写真 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="font-serif text-[11px] text-ink-tertiary tracking-section">
              写 真（最大4枚）
            </label>
            <span className="font-sans text-[11px] text-ink-tertiary">{photos.length} / 4</span>
          </div>

          {/* アップロード済み写真 */}
          <div className="space-y-3">
            {photos.map((photo, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-paper-soft" style={{ border: "0.5px solid #F0F0F0" }}>
                {photo.uploading ? (
                  <div className="w-16 h-16 bg-paper-cream flex items-center justify-center shrink-0">
                    <span className="font-sans text-[10px] text-ink-tertiary">...</span>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo.url} alt="" className="w-16 h-16 object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={photo.caption}
                    onChange={(e) => updateCaption(i, e.target.value)}
                    placeholder="キャプション（任意）"
                    className="w-full bg-transparent border-b-[0.5px] border-border-thin focus:border-ink focus:outline-none py-1 text-xs font-serif text-ink placeholder:text-ink-tertiary"
                  />
                  {photo.error && (
                    <p className="text-xs text-ink mt-1">{photo.error}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button type="button" onClick={() => movePhoto(i, -1)} disabled={i === 0} className="font-sans text-xs text-ink-tertiary disabled:opacity-30">↑</button>
                  <button type="button" onClick={() => movePhoto(i, 1)} disabled={i === photos.length - 1} className="font-sans text-xs text-ink-tertiary disabled:opacity-30">↓</button>
                  <button type="button" onClick={() => removePhoto(i)} className="font-sans text-xs text-ink-tertiary">✕</button>
                </div>
              </div>
            ))}
          </div>

          {/* 追加ボタン */}
          {photos.length < 4 && (
            <div className="mt-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoAdd}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="inline-block font-serif text-sm text-ink-tertiary tracking-section cursor-pointer border-b-[0.5px] border-dashed border-border pb-0.5"
              >
                + 写真を追加
              </label>
            </div>
          )}
        </div>

        {/* アクション */}
        <div className="flex items-center gap-4 pt-4" style={{ borderTop: "0.5px solid #E5E5E5" }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending || isUploading}
            className="bg-ink text-white font-serif font-light px-6 py-3 text-sm tracking-button disabled:opacity-40"
          >
            {isPending ? "保存中…" : isEdit ? "更新する" : "公開する"}
          </button>
          <Link
            href="/admin/posts"
            className="font-serif text-sm text-ink-tertiary font-light"
          >
            キャンセル
          </Link>
        </div>

        {isEdit && (
          <div style={{ borderTop: "0.5px solid #F0F0F0" }} className="pt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting || isPending}
              className="font-serif text-sm text-ink-tertiary font-light border-b-[0.5px] border-ink-tertiary disabled:opacity-40"
            >
              {isDeleting ? "削除中…" : "この投稿を削除する"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
