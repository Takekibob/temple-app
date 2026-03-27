"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { registerWithEmail } from "@/app/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type MemberTypeSelection = "DANKA" | "GOEN" | null;

export default function RegisterPage() {
  const [memberType, setMemberType] = useState<MemberTypeSelection>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    if (!memberType) {
      setErrorMsg("会員種別を選択してください。");
      return;
    }
    formData.set("memberType", memberType);
    startTransition(async () => {
      setErrorMsg(null);
      const result = await registerWithEmail(formData);
      if (result?.error) setErrorMsg(result.error);
    });
  }

  return (
    <div className="w-full max-w-sm">
      {/* ヘッダー */}
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🏛</div>
        <h1 className="text-2xl font-bold text-stone-800">てらログ</h1>
        <p className="text-stone-500 text-sm mt-1">新規会員登録</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
        {/* エラーメッセージ */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errorMsg}
          </div>
        )}

        {/* ステップ 1: 会員種別選択 */}
        <div className="mb-6">
          <p className="text-sm font-medium text-stone-700 mb-3">会員種別を選択してください</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMemberType("GOEN")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                memberType === "GOEN"
                  ? "border-amber-600 bg-amber-50"
                  : "border-stone-200 hover:border-stone-300"
              }`}
            >
              <div className="text-xl mb-1">🙏</div>
              <div className="font-medium text-stone-800 text-sm">ご縁さん</div>
              <div className="text-xs text-stone-500 mt-0.5">一般会員・イベント参加</div>
            </button>

            <button
              type="button"
              onClick={() => setMemberType("DANKA")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                memberType === "DANKA"
                  ? "border-amber-600 bg-amber-50"
                  : "border-stone-200 hover:border-stone-300"
              }`}
            >
              <div className="text-xl mb-1">🏠</div>
              <div className="font-medium text-stone-800 text-sm">檀家</div>
              <div className="text-xs text-stone-500 mt-0.5">法要予約・過去帳管理</div>
            </button>
          </div>
        </div>

        {/* フォーム */}
        {memberType && (
          <form action={handleSubmit} className="space-y-4">
            {/* 共通フィールド */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-stone-700">
                お名前 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                type="text"
                required
                placeholder="山田 太郎"
                className="border-stone-200 focus-visible:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-stone-700">
                メールアドレス <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="example@temple.jp"
                className="border-stone-200 focus-visible:ring-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-stone-700">
                パスワード <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="8文字以上"
                className="border-stone-200 focus-visible:ring-amber-500"
              />
            </div>

            {/* 檀家専用フィールド */}
            {memberType === "DANKA" && (
              <>
                <div className="pt-2 pb-1 border-t border-stone-100">
                  <p className="text-xs text-stone-500">
                    檀家登録には以下の情報が必要です
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="familyName" className="text-stone-700">
                    家名（苗字・屋号） <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="familyName"
                    name="familyName"
                    type="text"
                    required
                    placeholder="山田家"
                    className="border-stone-200 focus-visible:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-stone-700">
                    住所 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    required
                    placeholder="東京都千代田区〇〇 1-2-3"
                    className="border-stone-200 focus-visible:ring-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-stone-700">
                    電話番号 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    placeholder="090-0000-0000"
                    className="border-stone-200 focus-visible:ring-amber-500"
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-amber-700 hover:bg-amber-800 text-white mt-2"
            >
              {isPending ? "登録中…" : "登録する"}
            </Button>
          </form>
        )}
      </div>

      {/* ログインリンク */}
      <p className="text-center text-sm text-stone-500 mt-5">
        既にアカウントをお持ちの方は{" "}
        <Link
          href="/auth/login"
          className="text-amber-700 hover:text-amber-800 font-medium"
        >
          ログインはこちら
        </Link>
      </p>

      {/* 管理者向け案内 */}
      <p className="text-center text-xs text-stone-400 mt-3 px-2">
        住職・スタッフの方は、寺院の管理者から招待を受けてください
      </p>
    </div>
  );
}
