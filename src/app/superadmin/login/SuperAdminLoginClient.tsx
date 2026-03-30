"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

type Step = "password" | "mfa";

export default function SuperAdminLoginClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const mfaInputRef = useRef<HTMLInputElement>(null);

  // ── Step 1: メール + パスワードでログイン ──────────────────────────
  function handlePasswordSubmit() {
    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください");
      return;
    }
    setError("");

    startTransition(async () => {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError("メールアドレスまたはパスワードが正しくありません");
        return;
      }

      // MFA が必要か確認
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

      if (aalData?.nextLevel === "aal2" && aalData.currentLevel !== "aal2") {
        // MFA 登録済み → MFA コード入力ステップへ
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const totpFactor = factors?.totp?.[0];
        if (!totpFactor) {
          setError("MFA の設定が見つかりません");
          return;
        }

        const { data: challengeData, error: challengeError } =
          await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
        if (challengeError || !challengeData) {
          setError("MFA チャレンジの発行に失敗しました");
          return;
        }

        setFactorId(totpFactor.id);
        setChallengeId(challengeData.id);
        setStep("mfa");
        setTimeout(() => mfaInputRef.current?.focus(), 100);
      } else {
        // MFA 未登録 or 不要 → ロール確認
        await finishLogin(supabase);
      }
    });
  }

  // ── Step 2: MFA コードを検証 ───────────────────────────────────────
  function handleMfaSubmit() {
    if (mfaCode.length !== 6) {
      setError("6桁のコードを入力してください");
      return;
    }
    setError("");

    startTransition(async () => {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: mfaCode.trim(),
      });

      if (verifyError) {
        setError("コードが正しくありません。もう一度お試しください");
        setMfaCode("");
        return;
      }

      await finishLogin(supabase);
    });
  }

  // ── ロール確認 & リダイレクト ─────────────────────────────────────
  async function finishLogin(supabase: ReturnType<typeof createClient>) {
    const res = await fetch("/api/auth/me");
    const json = await res.json();
    if (json?.role !== "SUPER_ADMIN") {
      await supabase.auth.signOut();
      setError("このアカウントは SUPER_ADMIN ではありません");
      setStep("password");
      return;
    }
    router.push("/superadmin");
    router.refresh();
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">🔐</div>
        <h1 className="text-2xl font-bold text-white">てらログ</h1>
        <p className="text-stone-400 text-sm mt-1">SUPER ADMIN ログイン</p>
      </div>

      {/* ステップインジケーター */}
      <div className="flex items-center justify-center gap-3 mb-5">
        <div className={`flex items-center gap-1.5 text-xs font-medium ${step === "password" ? "text-amber-400" : "text-teal-400"}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step === "password" ? "bg-amber-600 text-white" : "bg-teal-800 text-teal-300"}`}>
            {step === "password" ? "1" : "✓"}
          </span>
          パスワード
        </div>
        <div className="w-6 h-px bg-stone-700" />
        <div className={`flex items-center gap-1.5 text-xs font-medium ${step === "mfa" ? "text-amber-400" : "text-stone-600"}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step === "mfa" ? "bg-amber-600 text-white" : "bg-stone-800 text-stone-500"}`}>
            2
          </span>
          認証コード
        </div>
      </div>

      <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {step === "password" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                placeholder="admin@example.com"
                autoComplete="email"
                className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                placeholder="パスワード"
                autoComplete="current-password"
                className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              onClick={handlePasswordSubmit}
              disabled={isPending}
              className="w-full py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50"
            >
              {isPending ? "確認中…" : "次へ →"}
            </button>
          </div>
        )}

        {step === "mfa" && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <p className="text-sm text-stone-300">認証アプリの6桁コードを入力</p>
              <p className="text-xs text-stone-500 mt-1">Google Authenticator / Authy など</p>
            </div>
            <div>
              <input
                ref={mfaInputRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleMfaSubmit()}
                placeholder="000000"
                className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-3 text-2xl text-white placeholder-stone-600 text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              onClick={handleMfaSubmit}
              disabled={isPending || mfaCode.length !== 6}
              className="w-full py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50"
            >
              {isPending ? "検証中…" : "ログイン"}
            </button>
            <button
              onClick={() => { setStep("password"); setMfaCode(""); setError(""); }}
              className="w-full text-xs text-stone-500 hover:text-stone-300"
            >
              ← パスワード入力に戻る
            </button>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-stone-600 mt-4">
        このページはプラットフォーム運営者専用です
      </p>
    </div>
  );
}
