"use client";

import { useState, useEffect } from "react";

interface Props {
  pushEnabled: boolean;
}

export default function NotificationsClient({ pushEnabled: initEnabled }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(initEnabled);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }

    // 現在のブラウザサブスクリプション状態を確認
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    });
  }, []);

  async function handleEnable() {
    setStatus("loading");
    setMsg(null);

    try {
      // ブラウザの通知許可を要求
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMsg("通知が許可されていません。ブラウザの設定から許可してください。");
        setStatus("error");
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setMsg("プッシュ通知の設定が完了していません。");
        setStatus("error");
        return;
      }

      // ServiceWorker 登録を取得
      const reg = await navigator.serviceWorker.ready;

      // 既存サブスクリプションがあれば削除（再登録）
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();

      // VAPID 公開鍵を ArrayBuffer に変換してサブスクライブ
      const applicationServerKey = urlBase64ToArrayBuffer(vapidPublicKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });

      const json = subscription.toJSON();
      const keys = json.keys as { p256dh: string; auth: string };

      // サーバーにサブスクリプションを登録
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        }),
      });

      if (!res.ok) throw new Error("サーバーへの登録に失敗しました");

      setIsSubscribed(true);
      setMsg("プッシュ通知を有効にしました");
      setStatus("success");
      setTimeout(() => setMsg(null), 2500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "エラーが発生しました";
      setMsg(message);
      setStatus("error");
    }
  }

  async function handleDisable() {
    setStatus("loading");
    setMsg(null);

    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        await fetch("/api/push/unsubscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      setMsg("プッシュ通知を無効にしました");
      setStatus("success");
      setTimeout(() => setMsg(null), 2500);
    } catch {
      setMsg("無効化に失敗しました");
      setStatus("error");
    }
  }

  if (!supported) {
    return (
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 text-sm text-stone-500">
        このブラウザはプッシュ通知に対応していません。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className={`p-3 border rounded-lg text-sm ${status === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
          {msg}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-100 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-700">プッシュ通知</p>
            <p className="text-xs text-stone-400 mt-0.5">お知らせ・予約確認などを通知します</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isSubscribed}
            disabled={status === "loading"}
            onClick={isSubscribed ? handleDisable : handleEnable}
            className={`relative w-11 h-6 rounded-full transition-colors ${isSubscribed ? "bg-amber-700" : "bg-stone-200"} disabled:opacity-40`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isSubscribed ? "translate-x-5" : ""}`}
            />
          </button>
        </div>
      </div>

      {!isSubscribed && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-xs text-amber-800 leading-relaxed">
            スイッチをオンにするとブラウザの通知許可が求められます。<br />
            許可することでお知らせや予約確認をリアルタイムに受け取れます。
          </p>
        </div>
      )}
    </div>
  );
}

/** URL-safe Base64 を ArrayBuffer に変換（Web Push 標準） */
function urlBase64ToArrayBuffer(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}
