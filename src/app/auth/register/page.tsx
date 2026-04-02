"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { registerWithEmail, resendConfirmationEmail, verifySignupOtp } from "@/app/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sentEmail, setSentEmail] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isResending, startResend] = useTransition();
  const [isVerifying, startVerify] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      setErrorMsg(null);
      try {
        const result = await registerWithEmail(formData);
        if (result?.error) {
          setErrorMsg(result.error);
        } else if (result?.success) {
          setSentEmail(result.email as string);
        }
      } catch {
        setErrorMsg("通信エラーが発生しました。再度お試しください。");
      }
    });
  }

  function handleOtpSubmit(formData: FormData) {
    const token = (formData.get("token") as string).trim();
    startVerify(async () => {
      setOtpError(null);
      try {
        const result = await verifySignupOtp(sentEmail!, token);
        if (result?.error) setOtpError(result.error);
      } catch {
        setOtpError("通信エラーが発生しました。再度お試しください。");
      }
    });
  }

  // OTP入力画面
  if (sentEmail) {
    return (
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🏛</div>
          <h1 className="text-2xl font-bold text-stone-800">てらログ</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 space-y-5">
          <div className="text-center">
            <p className="font-semibold text-stone-800">確認コードを入力してください</p>
            <p className="text-sm text-stone-500 mt-1">
              <span className="font-medium text-stone-700">{sentEmail}</span>
              <br />に送信した8桁のコードを入力してください
            </p>
          </div>

          {otpError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {otpError}
            </div>
          )}

          <form action={handleOtpSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="token" className="text-stone-700">確認コード（8桁）</Label>
              <Input
                id="token"
                name="token"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                placeholder="00000000"
                required
                autoFocus
                className="text-center text-2xl tracking-[0.5em] border-stone-200 focus-visible:ring-amber-500"
              />
            </div>
            <Button
              type="submit"
              disabled={isVerifying}
              className="w-full bg-amber-700 hover:bg-amber-800 text-white disabled:opacity-40"
            >
              {isVerifying ? "確認中…" : "確認する"}
            </Button>
          </form>

          <div className="text-center pt-2 border-t border-stone-100">
            {resendMsg ? (
              <p className="text-xs text-teal-600">{resendMsg}</p>
            ) : (
              <button
                type="button"
                disabled={isResending}
                onClick={() => {
                  setResendMsg(null);
                  startResend(async () => {
                    const result = await resendConfirmationEmail(sentEmail);
                    setResendMsg(result?.error ?? "コードを再送信しました。メールをご確認ください。");
                  });
                }}
                className="text-xs text-amber-700 hover:text-amber-800 disabled:opacity-50"
              >
                {isResending ? "送信中…" : "コードが届かない場合は再送信する"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 登録フォーム画面
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

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-stone-300 accent-amber-700 cursor-pointer"
            />
            <span className="text-xs text-stone-500 leading-relaxed">
              <Link href="/terms" target="_blank" className="text-amber-700 hover:underline font-medium">利用規約</Link>
              および
              <Link href="/privacy" target="_blank" className="text-amber-700 hover:underline font-medium mx-1">プライバシーポリシー</Link>
              に同意します
            </span>
          </label>

          <Button
            type="submit"
            disabled={isPending || !agreed}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white disabled:opacity-40 mt-1"
          >
            {isPending ? "送信中…" : "登録する"}
          </Button>
        </form>
      </div>

      <p className="text-center text-sm text-stone-500 mt-5">
        既にアカウントをお持ちの方は{" "}
        <Link href="/" className="text-amber-700 hover:text-amber-800 font-medium">
          ログインはこちら
        </Link>
      </p>

      <p className="text-center text-xs text-stone-400 mt-2 px-2">
        住職・スタッフの方は、寺院の管理者から招待を受けてください
      </p>
    </div>
  );
}
