"use client";

import { useState, useTransition } from "react";

type DisplayMode = "STANDARD" | "SIMPLE";
type FontSize = "MEDIUM" | "LARGE" | "XLARGE";

interface Props {
  displayMode: DisplayMode;
  fontSize: FontSize;
  highContrast: boolean;
}

const DISPLAY_MODE_LABELS: Record<DisplayMode, string> = {
  STANDARD: "標準",
  SIMPLE: "シンプル（大きめ文字・少ない情報量）",
};

const FONT_SIZE_LABELS: Record<FontSize, string> = {
  MEDIUM: "標準",
  LARGE: "大",
  XLARGE: "特大",
};

export default function DisplaySettingsClient({ displayMode: initMode, fontSize: initSize, highContrast: initContrast }: Props) {
  const [displayMode, setDisplayMode] = useState<DisplayMode>(initMode);
  const [fontSize, setFontSize] = useState<FontSize>(initSize);
  const [highContrast, setHighContrast] = useState(initContrast);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function save(patch: Partial<{ displayMode: DisplayMode; fontSize: FontSize; highContrast: boolean }>) {
    startTransition(async () => {
      setSavedMsg(null);
      const res = await fetch("/api/me/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        setSavedMsg("保存しました");
        setTimeout(() => setSavedMsg(null), 2000);
      }
    });
  }

  return (
    <div className="space-y-4">
      {savedMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{savedMsg}</div>
      )}

      {/* 表示モード */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-3">
        <p className="text-sm font-semibold text-stone-700">表示モード</p>
        {(["STANDARD", "SIMPLE"] as DisplayMode[]).map((mode) => (
          <label key={mode} className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="displayMode"
              checked={displayMode === mode}
              onChange={() => {
                setDisplayMode(mode);
                save({ displayMode: mode });
              }}
              disabled={isPending}
              className="accent-amber-700 mt-0.5"
            />
            <span className="text-sm text-stone-700">{DISPLAY_MODE_LABELS[mode]}</span>
          </label>
        ))}
      </div>

      {/* 文字サイズ */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5 space-y-3">
        <p className="text-sm font-semibold text-stone-700">文字サイズ</p>
        <div className="flex gap-2">
          {(["MEDIUM", "LARGE", "XLARGE"] as FontSize[]).map((size) => (
            <button
              key={size}
              type="button"
              disabled={isPending}
              onClick={() => {
                setFontSize(size);
                save({ fontSize: size });
              }}
              className={`flex-1 py-2 rounded-xl text-sm border transition-colors ${
                fontSize === size
                  ? "bg-amber-700 text-white border-amber-700"
                  : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
              }`}
            >
              {FONT_SIZE_LABELS[size]}
            </button>
          ))}
        </div>
      </div>

      {/* ハイコントラスト */}
      <div className="bg-white rounded-2xl border border-stone-100 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-700">ハイコントラスト</p>
            <p className="text-xs text-stone-400 mt-0.5">視認性を高めるため色を強調します</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={highContrast}
            disabled={isPending}
            onClick={() => {
              const next = !highContrast;
              setHighContrast(next);
              save({ highContrast: next });
            }}
            className={`relative w-11 h-6 rounded-full transition-colors ${highContrast ? "bg-amber-700" : "bg-stone-200"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${highContrast ? "translate-x-5" : ""}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
