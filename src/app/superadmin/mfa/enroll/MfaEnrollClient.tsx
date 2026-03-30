"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase";

type EnrollState = "loading" | "already_enrolled" | "show_qr" | "verify" | "done";

export default function MfaEnrollClient() {
  const router = useRouter();
  const [state, setState] = useState<EnrollState>("loading");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    (async () => {
      const supabase = createClient();

      // すでに MFA 登録済みか確認
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (factors?.totp && factors.totp.length > 0) {
        setState("already_enrolled");
        return;
      }

      // MFA 登録開始（QR コード発行）
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "SUPER_ADMIN",
      });

      if (error || !data) {
        setError("MFA の初期化に失敗しました");
        setState("show_qr");
        return;
      }

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setState("show_qr");
    })();
  }, []);

  function handleStartVerify() {
    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.challenge({ factorId });
      if (error || !data) {
        setError("チャレンジの発行に失敗しました");
        return;
      }
      setChallengeId(data.id);
      setState("verify");
    });
  }

  function handleVerify() {
    if (code.length !== 6) {
      setError("6桁のコードを入力してください");
      return;
    }
    setError("");

    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code });
      if (error) {
        setError("コードが正しくありません。もう一度お試しください");
        setCode("");
        return;
      }
      setState("done");
      setTimeout(() => {
        router.push("/superadmin");
        router.refresh();
      }, 1500);
    });
  }

  if (state === "loading") {
    return (
      <div className="text-stone-400 text-sm">読み込み中…</div>
    );
  }

  if (state === "already_enrolled") {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="text-4xl mb-3">✅</div>
        <p className="text-white font-semibold">MFA はすでに登録済みです</p>
        <button
          onClick={() => router.push("/superadmin")}
          className="mt-4 px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700"
        >
          ダッシュボードへ
        </button>
      </div>
    );
  }

  if (state === "done") {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="text-4xl mb-3">🎉</div>
        <p className="text-white font-semibold">MFA の設定が完了しました</p>
        <p className="text-stone-400 text-sm mt-1">ダッシュボードへ移動します…</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🔐</div>
        <h1 className="text-xl font-bold text-white">二段階認証を設定</h1>
        <p className="text-stone-400 text-sm mt-1">SUPER ADMIN アカウントを保護します</p>
      </div>

      <div className="bg-stone-900 rounded-2xl border border-stone-700 p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        {state === "show_qr" && (
          <div className="space-y-5">
            <div>
              <p className="text-sm text-stone-300 font-medium mb-3">
                1. 認証アプリで QR コードをスキャン
              </p>
              <p className="text-xs text-stone-500 mb-3">
                Google Authenticator、Authy、1Password などの認証アプリを使用してください
              </p>
              {qrCode ? (
                <div className="flex justify-center">
                  <div className="bg-white p-3 rounded-xl">
                    <Image src={qrCode} alt="MFA QR Code" width={180} height={180} unoptimized />
                  </div>
                </div>
              ) : (
                <div className="h-48 bg-stone-800 rounded-xl flex items-center justify-center text-stone-500 text-sm">
                  QR コードの生成に失敗しました
                </div>
              )}
            </div>

            {secret && (
              <div>
                <p className="text-xs text-stone-500 mb-1">QR が読めない場合は手動入力：</p>
                <code className="block bg-stone-800 text-amber-400 text-xs px-3 py-2 rounded-lg break-all">
                  {secret}
                </code>
              </div>
            )}

            <button
              onClick={handleStartVerify}
              disabled={isPending || !qrCode}
              className="w-full py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50"
            >
              {isPending ? "処理中…" : "2. コードを検証する →"}
            </button>
          </div>
        )}

        {state === "verify" && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-stone-300">認証アプリに表示された6桁のコードを入力</p>
            </div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              placeholder="000000"
              autoFocus
              className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-3 text-2xl text-white placeholder-stone-600 text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              onClick={handleVerify}
              disabled={isPending || code.length !== 6}
              className="w-full py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50"
            >
              {isPending ? "検証中…" : "設定を完了する"}
            </button>
            <button
              onClick={() => { setState("show_qr"); setCode(""); setError(""); }}
              className="w-full text-xs text-stone-500 hover:text-stone-300"
            >
              ← QR コードに戻る
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
