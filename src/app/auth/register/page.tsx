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
          <h1 className="font-serif text-4xl text-ink">てらログ</h1>
        </div>
        <div className="bg-paper p-6 space-y-5" style={{ border: "0.5px solid var(--color-border)" }}>
          <div className="text-center">
            <p className="font-serif text-sm font-medium text-ink">確認コードを入力してください</p>
            <p className="font-serif text-sm text-ink-secondary mt-1">
              <span className="font-medium text-ink">{sentEmail}</span>
              <br />に送信した8桁のコードを入力してください
            </p>
          </div>

          {otpError && (
            <div className="p-3 bg-paper-soft font-serif text-sm text-ink" style={{ border: "0.5px solid var(--color-border)" }}>
              {otpError}
            </div>
          )}

          <form action={handleOtpSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="token" className="font-serif text-sm text-ink-secondary">確認コード（8桁）</Label>
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
                className="text-center font-sans text-2xl tracking-[0.5em] border-border focus-visible:ring-1 focus-visible:ring-ink"
              />
            </div>
            <Button
              type="submit"
              disabled={isVerifying}
              className="w-full bg-ink text-paper hover:opacity-90 disabled:opacity-40 font-sans"
            >
              {isVerifying ? "確認中…" : "確認する"}
            </Button>
          </form>

          <div className="text-center pt-2" style={{ borderTop: "0.5px solid var(--color-border-thin)" }}>
            {resendMsg ? (
              <p className="font-serif text-xs text-ink-secondary">{resendMsg}</p>
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
                className="font-serif text-xs text-ink-secondary hover:text-ink disabled:opacity-50"
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
        <h1 className="font-serif text-4xl text-ink">てらログ</h1>
        <p className="font-serif text-sm text-ink-secondary mt-2">新規会員登録</p>
      </div>

      <div className="bg-paper p-6" style={{ border: "0.5px solid var(--color-border)" }}>
        {errorMsg && (
          <div className="mb-4 p-3 bg-paper-soft font-serif text-sm text-ink" style={{ border: "0.5px solid var(--color-border)" }}>
            {errorMsg}
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="font-serif text-sm text-ink-secondary">
              メールアドレス <span className="text-ink-secondary">*</span>
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="example@temple.jp"
              className="border-border focus-visible:ring-1 focus-visible:ring-ink font-sans"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="font-serif text-sm text-ink-secondary">
              パスワード（8文字以上） <span className="text-ink-secondary">*</span>
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              placeholder="8文字以上"
              className="border-border focus-visible:ring-1 focus-visible:ring-ink font-sans"
            />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 border-border accent-ink cursor-pointer"
            />
            <span className="font-serif text-xs text-ink-secondary leading-relaxed">
              <Link href="/terms" target="_blank" className="text-ink underline hover:text-ink-secondary">利用規約</Link>
              および
              <Link href="/privacy" target="_blank" className="text-ink underline hover:text-ink-secondary mx-1">プライバシーポリシー</Link>
              に同意します
            </span>
          </label>

          <Button
            type="submit"
            disabled={isPending || !agreed}
            className="w-full bg-ink text-paper hover:opacity-90 disabled:opacity-40 font-sans mt-1"
          >
            {isPending ? "送信中…" : "登録する"}
          </Button>
        </form>
      </div>

      <p className="font-serif text-center text-sm text-ink-tertiary mt-5">
        既にアカウントをお持ちの方は{" "}
        <Link href="/" className="text-ink-secondary underline hover:text-ink">
          ログインはこちら
        </Link>
      </p>

      <p className="font-serif text-center text-xs text-ink-tertiary mt-2 px-2">
        住職・スタッフの方は、寺院の管理者から招待を受けてください
      </p>
    </div>
  );
}
