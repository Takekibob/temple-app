"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const DISMISS_KEY = "goen_cta_dismissed";

export default function GoenCtaBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(DISMISS_KEY)) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="relative bg-gradient-to-r from-amber-50 to-stone-50 border border-amber-200 rounded-xl p-4 mb-5">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-stone-400 hover:text-stone-600 text-lg leading-none"
        aria-label="閉じる"
      >
        ✕
      </button>
      <p className="text-sm font-semibold text-stone-800 mb-1 pr-6">🎫 会員になりませんか？</p>
      <p className="text-xs text-stone-500 mb-3">限定イベントや限定ブログが読めるようになります</p>
      <Link
        href="/app/subscriptions"
        className="inline-block px-4 py-1.5 bg-amber-700 text-white text-xs rounded-lg hover:bg-amber-800 font-medium"
      >
        プランを見る →
      </Link>
    </div>
  );
}
