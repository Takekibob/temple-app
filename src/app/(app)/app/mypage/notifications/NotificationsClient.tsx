"use client";

import { useState, useEffect } from "react";

interface Props {
  pushEnabled: boolean;
  memberId: string | null;
  notifyEvent: boolean;
  notifyAnnouncement: boolean;
}

export default function NotificationsClient({
  pushEnabled: initEnabled,
  memberId,
  notifyEvent: initNotifyEvent,
  notifyAnnouncement: initNotifyAnnouncement,
}: Props) {
  const [pushStatus, setPushStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(initEnabled);
  const [supported, setSupported] = useState(true);
  const [notifyEvent, setNotifyEvent] = useState(initNotifyEvent);
  const [notifyAnnouncement, setNotifyAnnouncement] = useState(initNotifyAnnouncement);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false);
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    });
  }, []);

  async function handleEnable() {
    setPushStatus("loading");
    setPushMsg(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushMsg("通知が許可されていません。ブラウザの設定から許可してください。");
        setPushStatus("error");
        return;
      }
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        setPushMsg("プッシュ通知の設定が完了していません。");
        setPushStatus("error");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) await existing.unsubscribe();
      const applicationServerKey = urlBase64ToArrayBuffer(vapidPublicKey);
      const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      const json = subscription.toJSON();
      const keys = json.keys as { p256dh: string; auth: string };
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint, p256dh: keys.p256dh, auth: keys.auth }),
      });
      if (!res.ok) throw new Error("サーバーへの登録に失敗しました");
      setIsSubscribed(true);
      setPushMsg("プッシュ通知を有効にしました");
      setPushStatus("success");
      setTimeout(() => setPushMsg(null), 2500);
    } catch (err) {
      setPushMsg(err instanceof Error ? err.message : "エラーが発生しました");
      setPushStatus("error");
    }
  }

  async function handleDisable() {
    setPushStatus("loading");
    setPushMsg(null);
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
      setPushMsg("プッシュ通知を無効にしました");
      setPushStatus("success");
      setTimeout(() => setPushMsg(null), 2500);
    } catch {
      setPushMsg("無効化に失敗しました");
      setPushStatus("error");
    }
  }

  async function updateMemberSetting(key: "notifyEvent" | "notifyAnnouncement", value: boolean) {
    if (!memberId) return;
    if (key === "notifyEvent") setNotifyEvent(value);
    else setNotifyAnnouncement(value);
    await fetch("/api/me/member-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
  }

  return (
    <div className="space-y-4">
      {pushMsg && (
        <div className={`p-3 border rounded-lg text-sm ${pushStatus === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
          {pushMsg}
        </div>
      )}

      {/* 通知種別 */}
      {memberId && (
        <div className="bg-white rounded-2xl border border-stone-100 divide-y divide-stone-50">
          <div className="px-5 pt-4 pb-2">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">通知種別</p>
          </div>
          <ToggleRow
            label="イベント通知"
            description="新しいイベントや申込確認の通知"
            checked={notifyEvent}
            onChange={(v) => updateMemberSetting("notifyEvent", v)}
          />
          <ToggleRow
            label="お知らせ通知"
            description="お寺からのお知らせの通知"
            checked={notifyAnnouncement}
            onChange={(v) => updateMemberSetting("notifyAnnouncement", v)}
          />
        </div>
      )}

      {/* プッシュ通知 */}
      {supported ? (
        <div className="bg-white rounded-2xl border border-stone-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-stone-700">プッシュ通知</p>
              <p className="text-xs text-stone-400 mt-0.5">ブラウザへのリアルタイム通知</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isSubscribed}
              disabled={pushStatus === "loading"}
              onClick={isSubscribed ? handleDisable : handleEnable}
              className={`relative w-11 h-6 rounded-full transition-colors ${isSubscribed ? "bg-amber-700" : "bg-stone-200"} disabled:opacity-40`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isSubscribed ? "translate-x-5" : ""}`} />
            </button>
          </div>
          {!isSubscribed && (
            <p className="text-xs text-stone-400 mt-3 leading-relaxed">
              スイッチをオンにするとブラウザの通知許可が求められます。
            </p>
          )}
        </div>
      ) : (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 text-sm text-stone-500">
          このブラウザはプッシュ通知に対応していません。
        </div>
      )}
    </div>
  );
}

function ToggleRow({
  label, description, checked, onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5">
      <div>
        <p className="text-sm font-semibold text-stone-700">{label}</p>
        <p className="text-xs text-stone-400 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4 ${checked ? "bg-amber-700" : "bg-stone-200"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
      </button>
    </div>
  );
}

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
