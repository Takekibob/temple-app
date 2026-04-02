"use client";

import { useState } from "react";
import { updatePushEnabled } from "../actions";

interface Props {
  pushEnabled: boolean;
}

export default function NotificationsClient({ pushEnabled: initEnabled }: Props) {
  const [pushEnabled, setPushEnabled] = useState(initEnabled);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function toggle() {
    setSaving(true);
    setMsg(null);
    const next = !pushEnabled;
    const result = await updatePushEnabled(next);
    if (result?.error) {
      setMsg(result.error);
    } else {
      setPushEnabled(next);
      setMsg(next ? "プッシュ通知を有効にしました" : "プッシュ通知を無効にしました");
      setTimeout(() => setMsg(null), 2500);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      {msg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{msg}</div>
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
            aria-checked={pushEnabled}
            disabled={saving}
            onClick={toggle}
            className={`relative w-11 h-6 rounded-full transition-colors ${pushEnabled ? "bg-amber-700" : "bg-stone-200"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${pushEnabled ? "translate-x-5" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
        <p className="text-xs text-amber-800 leading-relaxed">
          プッシュ通知を受け取るには、ブラウザの通知許可が必要です。<br />
          許可されていない場合はブラウザの設定から許可してください。
        </p>
      </div>
    </div>
  );
}
