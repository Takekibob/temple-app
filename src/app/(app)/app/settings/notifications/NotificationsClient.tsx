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
        <div
          className={`p-3 font-serif text-sm ${
            pushStatus === "error" ? "text-ink" : "text-ink-secondary"
          } bg-paper-soft`}
          style={{ border: "0.5px solid var(--color-border)" }}
        >
          {pushMsg}
        </div>
      )}

      {/* 通知種別 */}
      {memberId && (
        <div style={{ border: "0.5px solid var(--color-border)" }}>
          <ToggleRow
            label="イベント通知"
            description="新しいイベントや申込確認の通知"
            checked={notifyEvent}
            onChange={(v) => updateMemberSetting("notifyEvent", v)}
          />
          <div style={{ borderTop: "0.5px solid var(--color-border-thin)" }}>
            <ToggleRow
              label="お知らせ通知"
              description="お寺からのお知らせの通知"
              checked={notifyAnnouncement}
              onChange={(v) => updateMemberSetting("notifyAnnouncement", v)}
            />
          </div>
        </div>
      )}

      {/* プッシュ通知 */}
      {supported ? (
        <div
          className="bg-paper px-4 py-3.5"
          style={{ border: "0.5px solid var(--color-border)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-serif text-sm text-ink font-light">プッシュ通知</p>
              <p className="font-serif text-xs text-ink-tertiary mt-0.5">ブラウザへのリアルタイム通知</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isSubscribed}
              disabled={pushStatus === "loading"}
              onClick={isSubscribed ? handleDisable : handleEnable}
              className={`relative w-11 h-6 transition-colors disabled:opacity-40 ${
                isSubscribed ? "bg-ink" : "bg-paper-soft"
              }`}
              style={!isSubscribed ? { border: "0.5px solid var(--color-border)" } : undefined}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-paper transition-transform ${
                  isSubscribed ? "translate-x-5" : ""
                }`}
                style={{ border: "0.5px solid var(--color-border)" }}
              />
            </button>
          </div>
          {!isSubscribed && (
            <p className="font-serif text-xs text-ink-tertiary mt-3 leading-relaxed">
              スイッチをオンにするとブラウザの通知許可が求められます。
            </p>
          )}
        </div>
      ) : (
        <div
          className="bg-paper-soft p-5 font-serif text-sm text-ink-tertiary"
          style={{ border: "0.5px solid var(--color-border)" }}
        >
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
    <div className="flex items-center justify-between bg-paper px-4 py-3.5">
      <div>
        <p className="font-serif text-sm text-ink font-light">{label}</p>
        <p className="font-serif text-xs text-ink-tertiary mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 transition-colors shrink-0 ml-4 ${
          checked ? "bg-ink" : "bg-paper-soft"
        }`}
        style={!checked ? { border: "0.5px solid var(--color-border)" } : undefined}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-paper transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
          style={{ border: "0.5px solid var(--color-border)" }}
        />
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
