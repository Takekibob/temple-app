"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginWithEmail, getGoogleLoginUrl, getLineLoginUrl } from "@/app/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/app";

  const [errorMsg, setErrorMsg] = useState<string | null>(() => {
    const error = searchParams.get("error");
    if (error === "email_not_confirmed") return "メールアドレスの認証が完了していません。登録時に届いたメールのリンクをクリックしてください。";
    if (error) return "ログインに失敗しました。再度お試しください。";
    return null;
  });
  const [isPending, startTransition] = useTransition();
  const [oauthPending, setOauthPending] = useState<"google" | "line" | null>(null);

  // PWAスタンドアロンモードの検出（iOSのWebViewはGoogle OAuthを拒否するため）
  const [isStandalone, setIsStandalone] = useState(false);
  // LINE・Instagram等のアプリ内ブラウザ検出（Google OAuthがWebView判定で拒否される）
  const [isInAppBrowser, setIsInAppBrowser] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    const mq = window.matchMedia("(display-mode: standalone)").matches;
    const nav = (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(mq || nav);
    // Line/ で始まるUA = LINEアプリ内ブラウザ、他にFB/Instagram等も同様に検出
    setIsInAppBrowser(/Line\/|FBAN|FBAV|Instagram|MicroMessenger/i.test(ua));
  }, []);

  function handleEmailLogin(formData: FormData) {
    startTransition(async () => {
      setErrorMsg(null);
      const result = await loginWithEmail(formData);
      if (result?.error) setErrorMsg(result.error);
    });
  }

  async function handleGoogleLogin() {
    setOauthPending("google");
    setErrorMsg(null);

    if (isStandalone) {
      // iOS PWA対策:
      // ① ユーザー操作の瞬間（同期）に空のSafariウィンドウを開く
      //    → iOSは「ユーザー起因の操作」と判断してSafariを開く
      // ② 非同期でOAuth URLを取得してからウィンドウのURLをセット
      //    → window.open後のURLセットはユーザー操作内とみなされる
      const safariWindow = window.open("", "_blank");
      const result = await getGoogleLoginUrl("/auth/pwa-return");
      if (result.error || !result.url) {
        safariWindow?.close();
        setErrorMsg(result.error ?? "エラーが発生しました");
        setOauthPending(null);
      } else if (safariWindow) {
        safariWindow.location.href = result.url;
      } else {
        // ポップアップがブロックされた場合のフォールバック
        window.location.href = result.url;
      }
      return;
    }

    // 通常のブラウザ（Safari / Chrome / PC）
    const result = await getGoogleLoginUrl(next);
    if (result.error) {
      setErrorMsg(result.error);
      setOauthPending(null);
    } else if (result.url) {
      router.push(result.url);
    }
  }

  async function handleLineLogin() {
    setOauthPending("line");
    setErrorMsg(null);
    const result = await getLineLoginUrl(next);
    if (result.error) {
      setErrorMsg(result.error);
      setOauthPending(null);
    } else if (result.url) {
      router.push(result.url);
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* ヘッダー */}
      <div className="text-center mb-8">
        <div className="text-4xl mb-2">🏛</div>
        <h1 className="text-2xl font-bold text-stone-800">てらログ</h1>
        <p className="text-stone-500 text-sm mt-1">お寺のデジタル管理システム</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
        {/* エラーメッセージ */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errorMsg}
          </div>
        )}

        {/* メール + パスワードフォーム */}
        <form action={handleEmailLogin} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-stone-700">
              メールアドレス
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
              パスワード
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              className="border-stone-200 focus-visible:ring-amber-500"
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-amber-700 hover:bg-amber-800 text-white"
          >
            {isPending ? "ログイン中…" : "ログイン"}
          </Button>

          <div className="text-right">
            <Link href="/auth/forgot-password" className="text-xs text-stone-400 hover:text-amber-700">
              パスワードをお忘れの方はこちら
            </Link>
          </div>
        </form>

        {/* 区切り */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-stone-200" />
          </div>
          <div className="relative flex justify-center text-xs text-stone-400 bg-white px-2">
            または
          </div>
        </div>

        {/* LINE等のアプリ内ブラウザではGoogleログイン不可のため案内を表示 */}
        {isInAppBrowser ? (
          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <p className="font-medium mb-1">⚠️ Googleログインが使用できません</p>
            <p className="text-xs text-amber-700 mb-2">
              このブラウザでは Google ログインをご利用いただけません。
              Safari で開いてからログインしてください。
            </p>
            <p className="text-xs text-amber-600 font-medium">
              画面右下の「…」→「ブラウザで開く」をタップ
            </p>
          </div>
        ) : (
          <>
            {isStandalone && (
              <p className="text-xs text-stone-400 text-center mb-2">
                Googleログインはいったんブラウザが開きます
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={oauthPending === "google"}
              className="w-full border-stone-200 text-stone-700 hover:bg-stone-50 mb-3"
            >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.45 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          {oauthPending === "google" ? "リダイレクト中…" : "Google でログイン"}
        </Button>

        {/* LINE ログイン（準備中） */}
        <Button
          type="button"
          variant="outline"
          disabled
          className="w-full border-stone-200 text-stone-400 cursor-not-allowed"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="#9ca3af">
            <path d="M12 2C6.48 2 2 5.93 2 10.8c0 3.32 2.09 6.23 5.25 7.9-.22.83-.8 3.01-.92 3.47-.14.56.21.55.44.4.19-.13 2.97-1.96 4.17-2.76.35.05.7.08 1.06.08 5.52 0 10-3.93 10-8.79C22 5.93 17.52 2 12 2z" />
          </svg>
          LINE でログイン（準備中）
        </Button>
          </>
        )}
      </div>

      {/* 登録リンク */}
      <p className="text-center text-sm text-stone-500 mt-5">
        アカウントをお持ちでない方は{" "}
        <Link
          href="/auth/register"
          className="text-amber-700 hover:text-amber-800 font-medium"
        >
          新規登録はこちら
        </Link>
      </p>
    </div>
  );
}
