"use client";

import { useState, useEffect } from "react";
import { Smartphone, Check } from "lucide-react";

type NotifyMode = "all" | "important" | "event_only" | "none";

interface Props {
  memberId: string;
  lineLinked: boolean;
  lineNotifyEnabled: boolean;
  notifyEvent: boolean;
  notifyAnnouncement: boolean;
  existingCode: string | null;
  codeExpiresAt: string | null;
}

const NOTIFY_MODES: { value: NotifyMode; label: string; desc: string; recommended?: boolean }[] = [
  {
    value: "all",
    label: "すべて受け取る",
    desc: "イベント関連通知とお寺からのお知らせ",
  },
  {
    value: "important",
    label: "重要なもののみ",
    desc: "将来設定予定（現在はすべてと同じ）",
  },
  {
    value: "event_only",
    label: "イベントのみ",
    desc: "参加予定の集いの通知のみ",
    recommended: true,
  },
  {
    value: "none",
    label: "受け取らない",
    desc: "LINE通知を全て無効化",
  },
];

function deriveMode(
  lineNotifyEnabled: boolean,
  notifyEvent: boolean,
  notifyAnnouncement: boolean
): NotifyMode {
  if (!lineNotifyEnabled) return "none";
  if (notifyEvent && notifyAnnouncement) return "all";
  if (notifyEvent && !notifyAnnouncement) return "event_only";
  return "event_only";
}

function modeToFields(mode: NotifyMode) {
  switch (mode) {
    case "all":
      return { lineNotifyEnabled: true, notifyEvent: true, notifyAnnouncement: true };
    case "important":
      return { lineNotifyEnabled: true, notifyEvent: true, notifyAnnouncement: true };
    case "event_only":
      return { lineNotifyEnabled: true, notifyEvent: true, notifyAnnouncement: false };
    case "none":
      return { lineNotifyEnabled: false, notifyEvent: false, notifyAnnouncement: false };
  }
}

export default function LineSettingsClient({
  memberId,
  lineLinked: initLinked,
  lineNotifyEnabled: initNotifyEnabled,
  notifyEvent: initEv,
  notifyAnnouncement: initAnn,
  existingCode: initCode,
  codeExpiresAt: initExpiresAt,
}: Props) {
  const [lineLinked] = useState(initLinked);
  const [notifyMode, setNotifyMode] = useState<NotifyMode>(
    deriveMode(initNotifyEnabled, initEv, initAnn)
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [code, setCode] = useState<string | null>(initCode);
  const [codeExpiresAt, setCodeExpiresAt] = useState<Date | null>(
    initExpiresAt ? new Date(initExpiresAt) : null
  );
  const [addUrl, setAddUrl] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [remainingSec, setRemainingSec] = useState<number>(0);

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

  async function selectMode(mode: NotifyMode) {
    setNotifyMode(mode);
    setSaving(true);
    setMsg(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/members/${memberId}/line-settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modeToFields(mode)),
      });
      if (res.ok) {
        setMsg("保存しました");
        setTimeout(() => setMsg(null), 2000);
      } else {
        const d = await res.json();
        setErrorMsg(d.error ?? "保存に失敗しました");
      }
    } catch {
      setErrorMsg("通信エラーが発生しました");
    } finally {
      setSaving(false);
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
        <div className="p-3 bg-paper-soft font-serif text-sm text-ink-secondary" style={{ border: "0.5px solid var(--color-border)" }}>
          {msg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3 bg-paper-soft font-serif text-sm text-ink" style={{ border: "0.5px solid var(--color-border)" }}>
          {errorMsg}
        </div>
      )}

      {/* 連携状態 */}
      <div className="bg-paper p-5 space-y-3" style={{ border: "0.5px solid var(--color-border)" }}>
        <div className="flex items-center gap-2">
          <Smartphone size={16} className="text-ink-tertiary" />
          <p className="font-serif text-sm text-ink font-medium">TeraLog 公式 LINE 連携</p>
          {lineLinked ? (
            <span className="ml-auto font-sans text-xs bg-paper-soft text-ink-secondary px-2 py-0.5">
              連携済み
            </span>
          ) : (
            <span className="ml-auto font-sans text-xs bg-paper-soft text-ink-tertiary px-2 py-0.5">
              未連携
            </span>
          )}
        </div>

        {!lineLinked && (
          <div className="space-y-3 pt-1">
            <p className="font-serif text-xs text-ink-tertiary leading-relaxed">
              TeraLog 公式 LINE と連携すると、参加する集いのリマインドが届きます。
            </p>

            {code && remainingSec > 0 ? (
              <div
                className="bg-paper-soft p-4 space-y-2 text-center"
                style={{ border: "0.5px solid var(--color-border-thin)" }}
              >
                <p className="font-sans text-xs text-ink-tertiary">
                  連携コード（有効期限 {formatRemaining(remainingSec)}）
                </p>
                <p className="font-sans text-3xl font-bold tracking-widest text-ink">{code}</p>
                <p className="font-sans text-xs text-ink-tertiary">このコードをLINEで送信してください</p>
              </div>
            ) : (
              code && remainingSec === 0 && (
                <p className="font-sans text-xs text-ink-tertiary">
                  コードの有効期限が切れました。再生成してください。
                </p>
              )
            )}

            <div className="space-y-2">
              {addUrl && (
                <a
                  href={addUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 text-white font-sans text-sm hover:opacity-90 transition-opacity"
                  style={{ background: "#06C755" }}
                >
                  TeraLog 公式 LINE を友だち追加する
                </a>
              )}
              <button
                type="button"
                onClick={generateCode}
                disabled={generatingCode}
                className="w-full py-2.5 bg-paper border-[0.5px] border-border font-sans text-sm text-ink-secondary hover:bg-paper-soft disabled:opacity-40 transition-colors"
              >
                {generatingCode
                  ? "生成中…"
                  : code && remainingSec > 0
                  ? "コードを再生成する"
                  : "連携コードを発行する"}
              </button>
            </div>

            <div
              className="bg-paper-soft p-3 space-y-1.5"
              style={{ border: "0.5px solid var(--color-border-thin)" }}
            >
              <p className="font-serif text-xs text-ink-secondary">連携手順</p>
              <ol className="font-sans text-xs text-ink-tertiary space-y-1 list-decimal list-inside">
                <li>「TeraLog 公式 LINE を友だち追加する」をタップ</li>
                <li>「連携コードを発行する」をタップして6桁のコードを取得</li>
                <li>LINEのトーク画面でコードを送信</li>
                <li>連携完了のメッセージが届いたら完了です</li>
              </ol>
            </div>
          </div>
        )}

        {lineLinked && (
          <p className="font-serif text-xs text-ink-tertiary">TeraLog 公式 LINE と連携済みです。下記の通知頻度を設定できます。</p>
        )}
      </div>

      {/* 通知頻度設定（LINE連携済みの場合のみ） */}
      {lineLinked && (
        <div className="bg-paper p-5 space-y-3" style={{ border: "0.5px solid var(--color-border)" }}>
          <p className="font-serif text-sm text-ink font-medium">通知頻度の設定</p>
          <div className="space-y-2" role="radiogroup" aria-label="通知頻度">
            {NOTIFY_MODES.map(({ value, label, desc, recommended }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={notifyMode === value}
                disabled={saving}
                onClick={() => selectMode(value)}
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors disabled:opacity-60 ${
                  notifyMode === value
                    ? "bg-paper-soft"
                    : "bg-paper hover:bg-paper-soft"
                }`}
                style={{
                  border: notifyMode === value
                    ? "0.5px solid var(--color-ink)"
                    : "0.5px solid var(--color-border)",
                }}
              >
                <span
                  className={`mt-0.5 w-4 h-4 shrink-0 flex items-center justify-center rounded-full transition-colors ${
                    notifyMode === value ? "bg-ink" : "bg-paper"
                  }`}
                  style={{
                    border: notifyMode === value
                      ? "0.5px solid var(--color-ink)"
                      : "0.5px solid var(--color-border)",
                  }}
                >
                  {notifyMode === value && <Check size={10} className="text-paper" />}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="font-serif text-sm text-ink font-light">
                    {label}
                    {recommended && (
                      <span className="ml-1.5 font-sans text-[10px] text-ink-tertiary">(おすすめ)</span>
                    )}
                  </span>
                  <p className="font-serif text-xs text-ink-tertiary mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
