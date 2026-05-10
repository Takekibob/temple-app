"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, CheckCircle2 } from "lucide-react";
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
          <h1 className="font-serif text-4xl text-ink">てらログ</h1>
        </div>
        <div className="bg-paper p-6 text-center space-y-3" style={{ border: "0.5px solid var(--color-border)" }}>
          <CheckCircle2 size={28} className="text-ink-secondary mx-auto" />
          <p className="font-serif text-sm font-medium text-ink">リセットメールを送信しました</p>
          <p className="font-serif text-sm text-ink-secondary leading-relaxed">
            ご登録のメールアドレス宛にパスワード再設定用のリンクをお送りしました。
            <br />
            メール内のリンクをクリックしてください。
          </p>
          <p className="font-serif text-xs text-ink-tertiary pt-2">
            メールが届かない場合は迷惑メールフォルダもご確認ください。
          </p>
        </div>
        <p className="font-serif text-center text-sm text-ink-tertiary mt-5">
          <Link href="/" className="inline-flex items-center gap-1 text-ink-secondary hover:text-ink">
            <ChevronLeft size={14} />ログイン画面に戻る
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-6">
        <h1 className="font-serif text-4xl text-ink">てらログ</h1>
        <p className="font-serif text-sm text-ink-secondary mt-2">パスワードをお忘れの方</p>
      </div>

      <div className="bg-paper p-6" style={{ border: "0.5px solid var(--color-border)" }}>
        {errorMsg && (
          <div className="mb-4 p-3 bg-paper-soft font-serif text-sm text-ink" style={{ border: "0.5px solid var(--color-border)" }}>
            {errorMsg}
          </div>
        )}

        <p className="font-serif text-sm text-ink-secondary mb-4 leading-relaxed">
          ご登録のメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
        </p>

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

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-ink text-paper hover:opacity-90 disabled:opacity-40 font-sans"
          >
            {isPending ? "送信中…" : "リセットメールを送る"}
          </Button>
        </form>
      </div>

      <p className="font-serif text-center text-sm text-ink-tertiary mt-5">
        <Link href="/" className="inline-flex items-center gap-1 text-ink-secondary hover:text-ink">
          <ChevronLeft size={14} />ログイン画面に戻る
        </Link>
      </p>
    </div>
  );
}
