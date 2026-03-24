"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "./actions";
import { logout } from "@/app/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const INTEREST_TAGS = [
  { value: "坐禅", label: "坐禅" },
  { value: "写経", label: "写経" },
  { value: "ヨガ", label: "ヨガ" },
  { value: "マインドフルネス", label: "マインドフルネス" },
  { value: "仏教講座", label: "仏教講座" },
  { value: "供養", label: "供養" },
];

interface Props {
  user: {
    name: string;
    email: string;
    phone: string;
    pushEnabled: boolean;
    role: string;
  };
  member: {
    type: string;
    familyName: string;
    address: string;
    interestTags: string[];
  } | null;
}

export default function MypageClient({ user, member }: Props) {
  const [isPending, startTransition] = useTransition();
  const [isLogoutPending, startLogoutTransition] = useTransition();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pushEnabled, setPushEnabled] = useState(user.pushEnabled);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    new Set(member?.interestTags ?? [])
  );

  function toggleTag(tag: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function handleSubmit(formData: FormData) {
    formData.set("pushEnabled", String(pushEnabled));
    selectedTags.forEach((tag) => formData.set(`tag_${tag}`, "on"));

    startTransition(async () => {
      setSuccessMsg(null);
      setErrorMsg(null);
      const result = await updateProfile(formData);
      if (result?.error) {
        setErrorMsg(result.error);
      } else {
        setSuccessMsg("プロフィールを更新しました。");
      }
    });
  }

  const memberTypeLabel =
    member?.type === "DANKA" ? "檀家" : member?.type === "GOEN" ? "ご縁さん" : "—";

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-stone-800">マイページ</h1>
        <button
          onClick={() =>
            startLogoutTransition(async () => {
              await logout();
            })
          }
          disabled={isLogoutPending}
          className="text-sm text-stone-500 hover:text-stone-700"
        >
          {isLogoutPending ? "…" : "ログアウト"}
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* 会員情報カード */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold text-lg">
              {user.name.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-stone-800">{user.name}</p>
              <p className="text-sm text-stone-500">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-medium">
              {memberTypeLabel}
            </span>
          </div>
        </div>

        {/* プロフィール編集フォーム */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4">
          <h2 className="font-semibold text-stone-800 mb-4">プロフィール編集</h2>

          {successMsg && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errorMsg}
            </div>
          )}

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-stone-700">
                お名前 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name}
                required
                className="border-stone-200 focus-visible:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-stone-700">
                電話番号
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={user.phone}
                placeholder="090-0000-0000"
                className="border-stone-200 focus-visible:ring-amber-500"
              />
            </div>

            {/* 興味・関心タグ */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-stone-700">興味・関心</p>
              <div className="grid grid-cols-2 gap-2">
                {INTEREST_TAGS.map((tag) => (
                  <label
                    key={tag.value}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedTags.has(tag.value)}
                      onCheckedChange={() => toggleTag(tag.value)}
                      className="border-stone-300 data-[state=checked]:bg-amber-700 data-[state=checked]:border-amber-700"
                    />
                    <span className="text-sm text-stone-700">{tag.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 通知設定 */}
            <div className="flex items-center justify-between py-2 border-t border-stone-100">
              <div>
                <p className="text-sm font-medium text-stone-700">プッシュ通知</p>
                <p className="text-xs text-stone-500">法要・イベントのお知らせを受け取る</p>
              </div>
              <button
                type="button"
                onClick={() => setPushEnabled((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  pushEnabled ? "bg-amber-700" : "bg-stone-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    pushEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-amber-700 hover:bg-amber-800 text-white"
            >
              {isPending ? "保存中…" : "変更を保存"}
            </Button>
          </form>
        </div>

        {/* 檀家専用：住所情報 */}
        {member?.type === "DANKA" && (
          <div className="bg-white rounded-2xl border border-stone-100 p-4">
            <h2 className="font-semibold text-stone-800 mb-3">檀家情報</h2>
            <div className="space-y-2 text-sm">
              <div className="flex gap-2">
                <span className="text-stone-500 w-16 shrink-0">家名</span>
                <span className="text-stone-800">{member.familyName}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-stone-500 w-16 shrink-0">住所</span>
                <span className="text-stone-800">{member.address || "—"}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
