"use client";

import Image from "next/image";
import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2 } from "lucide-react";
import { updateProfile } from "../actions";

const INTEREST_TAGS = ["坐禅", "写経", "ヨガ", "マインドフルネス", "仏教講座", "供養"];

interface Props {
  user: { name: string; email: string; phone: string };
  member: { postalCode: string; address: string; interestTags: string[] } | null;
  avatarUrl: string | null;
}

export default function ProfileEditClient({ user, member, avatarUrl: initialAvatarUrl }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    new Set(member?.interestTags ?? [])
  );
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/me/avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) setAvatarUrl(data.url);
      else setErrorMsg(data.error ?? "画像のアップロードに失敗しました");
    } finally {
      setAvatarUploading(false);
    }
  }

  function handleSubmit(formData: FormData) {
    selectedTags.forEach((tag) => formData.set(`tag_${tag}`, "on"));
    startTransition(async () => {
      setSuccessMsg(null);
      setErrorMsg(null);
      const result = await updateProfile(formData);
      if (result?.error) {
        setErrorMsg(result.error);
      } else {
        setSuccessMsg("プロフィールを更新しました");
        setTimeout(() => router.push("/app/settings"), 1000);
      }
    });
  }

  return (
    <div className="space-y-4">
      {successMsg && (
        <div className="p-3 bg-paper-soft font-serif text-sm text-ink-secondary" style={{ border: "0.5px solid var(--color-border)" }}>
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-paper-soft font-serif text-sm text-ink" style={{ border: "0.5px solid var(--color-border)" }}>
          {errorMsg}
        </div>
      )}

      {/* アバター */}
      <div
        className="bg-paper p-5 flex flex-col items-center gap-3"
        style={{ border: "0.5px solid var(--color-border)" }}
      >
        <div className="relative">
          <div className="w-20 h-20 overflow-hidden bg-paper-soft flex items-center justify-center">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="プロフィール画像" fill className="object-cover" />
            ) : (
              <span className="font-serif text-3xl text-ink-secondary">{user.name.charAt(0)}</span>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarUploading}
            className="absolute -bottom-1 -right-1 w-7 h-7 bg-ink hover:opacity-90 text-paper flex items-center justify-center transition-opacity disabled:opacity-40"
          >
            {avatarUploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />
        <p className="font-serif text-xs text-ink-tertiary">タップして写真を変更（3MB以下）</p>
      </div>

      {/* フォーム */}
      <div
        className="bg-paper p-5 space-y-4"
        style={{ border: "0.5px solid var(--color-border)" }}
      >
        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="font-serif block text-sm text-ink-secondary mb-1.5">
              お名前 <span className="text-ink-secondary">*</span>
            </label>
            <input
              name="name"
              defaultValue={user.name}
              required
              className="w-full px-3 py-2.5 font-sans text-sm text-ink bg-paper focus:outline-none focus:ring-1 focus:ring-ink"
              style={{ border: "0.5px solid var(--color-border)" }}
            />
          </div>

          <div>
            <label className="font-serif block text-sm text-ink-secondary mb-1.5">電話番号</label>
            <input
              name="phone"
              type="tel"
              defaultValue={user.phone}
              placeholder="090-0000-0000"
              className="w-full px-3 py-2.5 font-sans text-sm text-ink bg-paper focus:outline-none focus:ring-1 focus:ring-ink placeholder:text-ink-tertiary"
              style={{ border: "0.5px solid var(--color-border)" }}
            />
          </div>

          <div>
            <label className="font-serif block text-sm text-ink-secondary mb-1.5">郵便番号</label>
            <input
              name="postalCode"
              defaultValue={member?.postalCode ?? ""}
              placeholder="000-0000"
              className="w-full px-3 py-2.5 font-sans text-sm text-ink bg-paper focus:outline-none focus:ring-1 focus:ring-ink placeholder:text-ink-tertiary"
              style={{ border: "0.5px solid var(--color-border)" }}
            />
          </div>

          <div>
            <label className="font-serif block text-sm text-ink-secondary mb-1.5">住所</label>
            <input
              name="address"
              defaultValue={member?.address ?? ""}
              placeholder="東京都〇〇区..."
              className="w-full px-3 py-2.5 font-sans text-sm text-ink bg-paper focus:outline-none focus:ring-1 focus:ring-ink placeholder:text-ink-tertiary"
              style={{ border: "0.5px solid var(--color-border)" }}
            />
          </div>

          {member && (
            <div>
              <p className="font-serif text-sm text-ink-secondary mb-2">興味・関心</p>
              <div className="grid grid-cols-2 gap-2">
                {INTEREST_TAGS.map((tag) => (
                  <label key={tag} className="flex items-center gap-2 cursor-pointer py-1">
                    <input
                      type="checkbox"
                      checked={selectedTags.has(tag)}
                      onChange={() => toggleTag(tag)}
                      className="w-4 h-4"
                    />
                    <span className="font-serif text-sm text-ink font-light">{tag}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="pt-3" style={{ borderTop: "0.5px solid var(--color-border-thin)" }}>
            <p className="font-serif text-xs text-ink-tertiary mb-1">メールアドレス</p>
            <p className="font-serif text-sm text-ink-secondary">{user.email}</p>
            <a
              href="/auth/forgot-password"
              className="font-serif text-xs text-ink-tertiary hover:text-ink mt-3 inline-block border-b-[0.5px] border-border"
            >
              パスワードを変更する
            </a>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 bg-ink text-paper font-sans text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {isPending ? "保存中…" : "変更を保存"}
          </button>
        </form>
      </div>
    </div>
  );
}
