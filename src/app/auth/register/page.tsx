"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { registerWithEmail, resendConfirmationEmail } from "@/app/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isResending, startResend] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setErrorMsg(null);
      const result = await registerWithEmail(formData);
      if (result?.error) {
        setErrorMsg(result.error);
      } else if (result?.success) {
        setSentEmail(result.email as string);
      }
    });
  }

  if (sentEmail) {
    return (
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🏛</div>
          <h1 className="text-2xl font-bold text-stone-800">てらログ</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 text-center space-y-3">
          <div className="text-3xl">✅</div>
          <p className="font-semibold text-stone-800">確認メールを送信しました</p>
          <p className="text-sm text-stone-500">
            <span className="font-medium text-stone-700">{sentEmail}</span> 宛に確認メールをお送りしました。
            <br />
            メール内のリンクをクリックして登録を完了してください。
          </p>
          <p className="text-xs text-stone-400 pt-2">
            メールが届かない場合は迷惑メールフォルダもご確認ください。
          </p>
          <div className="pt-3 border-t border-stone-100">
            {resendMsg ? (
              <p className="text-xs text-teal-600">{resendMsg}</p>
            ) : (
              <button
                type="button"
                disabled={isResending}
                onClick={() => {
                  startResend(async () => {
                    const result = await resendConfirmationEmail(sentEmail!);
                    setResendMsg(result?.error ?? "再送信しました。メールをご確認ください。");
                  });
                }}
                className="text-xs text-amber-700 hover:text-amber-800 disabled:opacity-50"
              >
                {isResending ? "送信中…" : "メールが届かない場合は再送信する"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🏛</div>
        <h1 className="text-2xl font-bold text-stone-800">てらログ</h1>
        <p className="text-stone-500 text-sm mt-1">新規会員登録</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errorMsg}
          </div>
        )}

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

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-stone-700">
              パスワード（8文字以上） <span className="text-red-500">*</span>
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

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white mt-2"
          >
            {isPending ? "送信中…" : "登録する"}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-stone-500 mt-5">
        既にアカウントをお持ちの方は{" "}
        <Link
          href="/"
          className="text-amber-700 hover:text-amber-800 font-medium"
        >
          ログインはこちら
        </Link>
      </p>

      <p className="text-center text-xs text-stone-400 mt-3 px-2">
        住職・スタッフの方は、寺院の管理者から招待を受けてください
      </p>
    </div>
  );
}
