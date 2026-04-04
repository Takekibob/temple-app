"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { STANDARD_CATEGORY_OPTIONS } from "@/lib/eventCategories";

interface EventData {
  id?: string;
  title?: string;
  description?: string;
  category?: string;
  eventDate?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  capacity?: number | null;
  fee?: number;
  visibility?: string;
  imageUrl?: string;
  status?: string;
}

interface Props {
  initialData?: EventData;
  isEdit?: boolean;
  customCategories?: string[];
  hasActivePlan?: boolean;
}

const VISIBILITIES = [
  { value: "PUBLIC", label: "公開（誰でも）" },
  { value: "DANKA_ONLY", label: "檀家限定" },
  { value: "SUBSCRIBERS_ONLY", label: "会員プラン加入者限定" },
];

export default function EventFormClient({ initialData, isEdit, customCategories = [], hasActivePlan = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl ?? "");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  // Convert eventDate from Date string to YYYY-MM-DD
  const initialDate = initialData?.eventDate
    ? new Date(initialData.eventDate).toISOString().split("T")[0]
    : "";

  async function handleDelete() {
    if (!confirm("このイベントを削除しますか？この操作は取り消せません。")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/events/${initialData!.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "削除に失敗しました");
      } else {
        router.push("/admin/events");
      }
    } catch {
      setErrorMsg("通信エラーが発生しました");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploadError(null);
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/events/upload-image", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setImageUploadError(data.error ?? "アップロードに失敗しました");
      } else {
        setImageUrl(data.url);
      }
    } catch {
      setImageUploadError("通信エラーが発生しました");
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
      description: form.get("description"),
      category: form.get("category"),
      eventDate: form.get("eventDate"),
      startTime: form.get("startTime"),
      endTime: form.get("endTime"),
      location: form.get("location"),
      capacity: form.get("capacity") || null,
      fee: form.get("fee"),
      visibility: form.get("visibility"),
      imageUrl: imageUrl || null,
      status: publishStatus ?? (isEdit ? undefined : "DRAFT"),
    };

    startTransition(async () => {
      const url = isEdit ? `/api/events/${initialData!.id}` : "/api/events";
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
        router.push("/admin/events");
      }
    });
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <Link href="/admin/events" className="text-sm text-stone-400 hover:text-stone-600 mb-4 inline-block">
        ← イベント管理
      </Link>
      <h1 className="text-xl font-bold text-stone-800 mb-6">
        {isEdit ? "イベント編集" : "イベント作成"}
      </h1>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      <form onSubmit={(e) => handleSubmit(e)} className="space-y-5">
        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <h2 className="font-semibold text-stone-700">基本情報</h2>

          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-stone-700">タイトル <span className="text-red-500">*</span></Label>
            <Input
              id="title"
              name="title"
              defaultValue={initialData?.title ?? ""}
              required
              placeholder="例：はじめての坐禅体験会"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-stone-700">説明</Label>
            <textarea
              id="description"
              name="description"
              defaultValue={initialData?.description ?? ""}
              rows={4}
              placeholder="イベントの詳細を入力してください"
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-stone-700">カテゴリ <span className="text-red-500">*</span></Label>
              <select
                id="category"
                name="category"
                defaultValue={initialData?.category ?? "ZAZEN"}
                required
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <optgroup label="標準カテゴリ">
                  {STANDARD_CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </optgroup>
                {customCategories.length > 0 && (
                  <optgroup label="カスタムカテゴリ">
                    {customCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="visibility" className="text-stone-700">公開範囲 <span className="text-red-500">*</span></Label>
              <select
                id="visibility"
                name="visibility"
                defaultValue={initialData?.visibility ?? "PUBLIC"}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {VISIBILITIES.map((v) => (
                  <option
                    key={v.value}
                    value={v.value}
                    disabled={v.value === "SUBSCRIBERS_ONLY" && !hasActivePlan}
                  >
                    {v.value === "SUBSCRIBERS_ONLY" && !hasActivePlan
                      ? `${v.label}（要：会員プラン設定）`
                      : v.label}
                  </option>
                ))}
              </select>
              {!hasActivePlan && (
                <p className="text-xs text-amber-700 mt-1">
                  「会員プラン加入者限定」を使うには
                  <Link href="/admin/plans" className="underline font-semibold ml-1">会員プランの設定</Link>
                  が必要です。
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <h2 className="font-semibold text-stone-700">日時・会場</h2>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="eventDate" className="text-stone-700">開催日 <span className="text-red-500">*</span></Label>
              <Input
                id="eventDate"
                name="eventDate"
                type="date"
                defaultValue={initialDate}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startTime" className="text-stone-700">開始時間 <span className="text-red-500">*</span></Label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                defaultValue={initialData?.startTime ?? ""}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endTime" className="text-stone-700">終了時間 <span className="text-red-500">*</span></Label>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                defaultValue={initialData?.endTime ?? ""}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location" className="text-stone-700">会場</Label>
            <Input
              id="location"
              name="location"
              defaultValue={initialData?.location ?? ""}
              placeholder="例：本堂、客殿など"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <h2 className="font-semibold text-stone-700">定員・参加費</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="capacity" className="text-stone-700">定員（名）</Label>
              <Input
                id="capacity"
                name="capacity"
                type="number"
                min={1}
                defaultValue={initialData?.capacity ?? ""}
                placeholder="空欄=無制限"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fee" className="text-stone-700">参加費（円）</Label>
              <Input
                id="fee"
                name="fee"
                type="number"
                min={0}
                defaultValue={initialData?.fee ?? 0}
                placeholder="0=無料"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
          <h2 className="font-semibold text-stone-700">画像</h2>
          <div className="space-y-3">
            {imageUrl && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt="カバー画像"
                  className="w-full h-40 object-cover rounded-lg border border-stone-200"
                />
                <button
                  type="button"
                  onClick={() => setImageUrl("")}
                  className="absolute top-2 right-2 bg-white/80 hover:bg-white text-stone-600 rounded-full w-6 h-6 flex items-center justify-center text-xs border border-stone-200"
                >
                  ✕
                </button>
              </div>
            )}
            <label className="block">
              <span className="sr-only">画像を選択</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={imageUploading}
                className="block w-full text-sm text-stone-500
                  file:mr-3 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-amber-50 file:text-amber-700
                  hover:file:bg-amber-100
                  disabled:opacity-50"
              />
            </label>
            {imageUploading && (
              <p className="text-xs text-stone-400">アップロード中…</p>
            )}
            {imageUploadError && (
              <p className="text-xs text-red-600">{imageUploadError}</p>
            )}
            <p className="text-xs text-stone-400">JPG・PNG・HEIC など対応。最大5MB。</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={isPending}
            className="bg-stone-600 hover:bg-stone-700 text-white"
          >
            {isPending ? "保存中…" : "下書き保存"}
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={(e) => {
              const form = (e.currentTarget as HTMLButtonElement).closest("form") as HTMLFormElement;
              handleSubmit(
                { currentTarget: form, preventDefault: () => {} } as React.FormEvent<HTMLFormElement>,
                "PUBLISHED"
              );
            }}
            className="bg-amber-700 hover:bg-amber-800 text-white"
          >
            {isPending ? "保存中…" : "公開する"}
          </Button>
          <Link
            href="/admin/events"
            className="px-4 py-2 text-sm border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50"
          >
            キャンセル
          </Link>
        </div>

        {isEdit && (
          <div className="pt-2 border-t border-stone-100">
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={isDeleting || isPending}
              className="w-full border-red-200 text-red-600 hover:bg-red-50"
            >
              {isDeleting ? "削除中…" : "このイベントを削除する"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
