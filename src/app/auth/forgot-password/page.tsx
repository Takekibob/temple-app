"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { resetPassword } from "@/app/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setErrorMsg(null);
      const result = await resetPassword(formData);
      if (result?.error) {
        setErrorMsg(result.error);
      } else {
        setSent(true);
      }
    });
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🏛</div>
          <h1 className="text-2xl font-bold text-stone-800">てらログ</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 text-center space-y-3">
          <div className="text-3xl">✅</div>
          <p className="font-semibold text-stone-800">リセットメールを送信しました</p>
          <p className="text-sm text-stone-500">
            ご登録のメールアドレス宛にパスワード再設定用のリンクをお送りしました。
            <br />
            メール内のリンクをクリックしてください。
          </p>
          <p className="text-xs text-stone-400 pt-2">
            メールが届かない場合は迷惑メールフォルダもご確認ください。
          </p>
        </div>
        <p className="text-center text-sm text-stone-500 mt-5">
          <Link href="/" className="text-amber-700 hover:text-amber-800 font-medium">
            ログイン画面に戻る
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🏛</div>
        <h1 className="text-2xl font-bold text-stone-800">てらログ</h1>
        <p className="text-stone-500 text-sm mt-1">パスワードをお忘れの方</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errorMsg}
          </div>
        )}

        <p className="text-sm text-stone-500 mb-4">
          ご登録のメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
        </p>

        <form action={handleSubmit} className="space-y-4">
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

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white"
          >
            {isPending ? "送信中…" : "リセットメールを送る"}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-stone-500 mt-5">
        <Link href="/" className="text-amber-700 hover:text-amber-800 font-medium">
          ← ログイン画面に戻る
        </Link>
      </p>
    </div>
  );
}
