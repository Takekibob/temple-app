"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "../actions";

const INTEREST_TAGS = ["坐禅", "写経", "ヨガ", "マインドフルネス", "仏教講座", "供養"];

interface Props {
  user: { name: string; email: string; phone: string };
  member: { postalCode: string; address: string; interestTags: string[] } | null;
}

export default function ProfileEditClient({ user, member }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    new Set(member?.interestTags ?? [])
  );

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else next.add(tag);
      return next;
    });
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
        setTimeout(() => router.push("/app/mypage"), 1000);
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-4">
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{successMsg}</div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{errorMsg}</div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            お名前 <span className="text-red-500">*</span>
          </label>
          <input name="name" defaultValue={user.name} required
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">電話番号</label>
          <input name="phone" type="tel" defaultValue={user.phone} placeholder="090-0000-0000"
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">郵便番号</label>
          <input name="postalCode" defaultValue={member?.postalCode ?? ""} placeholder="000-0000"
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">住所</label>
          <input name="address" defaultValue={member?.address ?? ""} placeholder="東京都〇〇区..."
            className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>

        {member && (
          <div>
            <p className="text-sm font-medium text-stone-700 mb-2">興味・関心</p>
            <div className="grid grid-cols-2 gap-2">
              {INTEREST_TAGS.map((tag) => (
                <label key={tag} className="flex items-center gap-2 cursor-pointer py-1">
                  <input type="checkbox" checked={selectedTags.has(tag)} onChange={() => toggleTag(tag)}
                    className="accent-amber-700 w-4 h-4" />
                  <span className="text-sm text-stone-700">{tag}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="pt-1 border-t border-stone-100">
          <p className="text-xs text-stone-400 mb-1">メールアドレス</p>
          <p className="text-sm text-stone-600">{user.email}</p>
          <a href="/auth/forgot-password" className="text-xs text-amber-700 hover:underline mt-3 inline-block">
            パスワードを変更する →
          </a>
        </div>

        <button type="submit" disabled={isPending}
          className="w-full py-3 bg-amber-700 text-white text-sm font-medium rounded-xl hover:bg-amber-800 disabled:opacity-40 transition-colors">
          {isPending ? "保存中…" : "変更を保存"}
        </button>
      </form>
    </div>
  );
}
