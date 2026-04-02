"use client";

import { useState, useEffect } from "react";

interface Props {
  memberId: string;
  lineLinked: boolean;
  lineNotifyEnabled: boolean;
  notifyReservation: boolean;
  notifyEvent: boolean;
  notifyAnniversary: boolean;
  notifyAnnouncement: boolean;
  existingCode: string | null;
  codeExpiresAt: string | null;
}

interface NotifyState {
  lineNotifyEnabled: boolean;
  notifyReservation: boolean;
  notifyEvent: boolean;
  notifyAnniversary: boolean;
  notifyAnnouncement: boolean;
}

const NOTIFY_ITEMS: { key: keyof Omit<NotifyState, "lineNotifyEnabled">; label: string }[] = [
  { key: "notifyReservation", label: "予約確認・変更" },
  { key: "notifyEvent", label: "イベントのご案内" },
  { key: "notifyAnniversary", label: "法事・記念日のお知らせ" },
  { key: "notifyAnnouncement", label: "お寺からのお知らせ" },
];

export default function LineSettingsClient({
  memberId,
  lineLinked: initLinked,
  lineNotifyEnabled: initNotifyEnabled,
  notifyReservation: initRes,
  notifyEvent: initEv,
  notifyAnniversary: initAnni,
  notifyAnnouncement: initAnn,
  existingCode: initCode,
  codeExpiresAt: initExpiresAt,
}: Props) {
  const [lineLinked] = useState(initLinked);
  const [notify, setNotify] = useState<NotifyState>({
    lineNotifyEnabled: initNotifyEnabled,
    notifyReservation: initRes,
    notifyEvent: initEv,
    notifyAnniversary: initAnni,
    notifyAnnouncement: initAnn,
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // コード生成
  const [code, setCode] = useState<string | null>(initCode);
  const [codeExpiresAt, setCodeExpiresAt] = useState<Date | null>(
    initExpiresAt ? new Date(initExpiresAt) : null
  );
  const [addUrl, setAddUrl] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [remainingSec, setRemainingSec] = useState<number>(0);

  // カウントダウン
  useEffect(() => {
    if (!codeExpiresAt) return;
    const tick = () => {
      const diff = Math.max(0, Math.floor((codeExpiresAt.getTime() - Date.now()) / 1000));
      setRemainingSec(diff);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [codeExpiresAt]);

  async function generateCode() {
    setGeneratingCode(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/line/generate-code", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "コード生成に失敗しました");
      } else {
        setCode(data.code);
        setCodeExpiresAt(new Date(Date.now() + 10 * 60 * 1000));
        setAddUrl(data.addUrl || null);
      }
    } catch {
      setErrorMsg("通信エラーが発生しました");
    } finally {
      setGeneratingCode(false);
    }
  }

  async function patchNotify(patch: Partial<NotifyState>) {
    const key = Object.keys(patch)[0];
    setSaving(key);
    setMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/members/${memberId}/line-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        setNotify((prev) => ({ ...prev, ...patch }));
        setMsg("保存しました");
        setTimeout(() => setMsg(null), 2000);
      } else {
        const d = await res.json();
        setErrorMsg(d.error ?? "保存に失敗しました");
      }
    } catch {
      setErrorMsg("通信エラーが発生しました");
    } finally {
      setSaving(null);
    }
  }

  const formatRemaining = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {msg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{msg}</div>
      )}
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{errorMsg}</div>
      )}

      {/* 連携状態 */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">💚</span>
          <p className="text-sm font-semibold text-stone-700">LINE連携</p>
          {lineLinked ? (
            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">連携済み</span>
          ) : (
            <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">未連携</span>
          )}
        </div>

        {!lineLinked && (
          <div className="space-y-3 pt-1">
            <p className="text-xs text-stone-500 leading-relaxed">
              LINEを連携すると予約確認・法事のリマインドなどをLINEで受け取れます。
            </p>

            {code && remainingSec > 0 ? (
              <div className="bg-stone-50 rounded-xl p-4 space-y-2 text-center">
                <p className="text-xs text-stone-500">連携コード（有効期限 {formatRemaining(remainingSec)}）</p>
                <p className="text-3xl font-mono font-bold tracking-widest text-stone-800">{code}</p>
                <p className="text-xs text-stone-400">このコードをLINEで送信してください</p>
              </div>
            ) : (
              code && remainingSec === 0 && (
                <p className="text-xs text-red-500">コードの有効期限が切れました。再生成してください。</p>
              )
            )}

            <div className="space-y-2">
              {addUrl && (
                <a
                  href={addUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#06C755] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
                >
                  <span>LINEで友達追加する</span>
                </a>
              )}
              <button
                type="button"
                onClick={generateCode}
                disabled={generatingCode}
                className="w-full py-2.5 border border-stone-200 text-stone-700 text-sm rounded-xl hover:bg-stone-50 disabled:opacity-40 transition-colors"
              >
                {generatingCode ? "生成中…" : code && remainingSec > 0 ? "コードを再生成する" : "連携コードを発行する"}
              </button>
            </div>

            <div className="bg-stone-50 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-medium text-stone-600">連携手順</p>
              <ol className="text-xs text-stone-500 space-y-1 list-decimal list-inside">
                <li>「LINEで友達追加する」をタップしてお寺のLINEを友達登録</li>
                <li>「連携コードを発行する」をタップして6桁のコードを取得</li>
                <li>LINEのトーク画面でコードを送信</li>
                <li>連携完了のメッセージが届いたら完了です</li>
              </ol>
            </div>
          </div>
        )}

        {lineLinked && (
          <p className="text-xs text-stone-500">LINEと連携済みです。下記の通知設定を変更できます。</p>
        )}
      </div>

      {/* 通知設定（LINE連携済みの場合のみ） */}
      {lineLinked && (
        <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-4">
          <p className="text-sm font-semibold text-stone-700">LINE通知設定</p>

          {/* LINE通知マスタートグル */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <p className="text-sm text-stone-700">LINE通知を受け取る</p>
              <p className="text-xs text-stone-400 mt-0.5">OFFにするとすべてのLINE通知が停止します</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notify.lineNotifyEnabled}
              disabled={saving === "lineNotifyEnabled"}
              onClick={() => patchNotify({ lineNotifyEnabled: !notify.lineNotifyEnabled })}
              className={`relative w-11 h-6 rounded-full transition-colors ${notify.lineNotifyEnabled ? "bg-[#06C755]" : "bg-stone-200"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notify.lineNotifyEnabled ? "translate-x-5" : ""}`}
              />
            </button>
          </div>

          {/* 個別通知トグル */}
          <div className={`space-y-3 ${!notify.lineNotifyEnabled ? "opacity-40 pointer-events-none" : ""}`}>
            {NOTIFY_ITEMS.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <p className="text-sm text-stone-700">{label}</p>
                <button
                  type="button"
                  role="switch"
                  aria-checked={notify[key]}
                  disabled={saving === key}
                  onClick={() => patchNotify({ [key]: !notify[key] } as Partial<NotifyState>)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${notify[key] ? "bg-amber-700" : "bg-stone-200"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${notify[key] ? "translate-x-5" : ""}`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
