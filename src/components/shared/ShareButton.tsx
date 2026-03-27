"use client";

import { useState } from "react";

interface ShareButtonProps {
  title: string;
  url?: string;
}

export default function ShareButton({ title, url }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch {
        // User cancelled or error — fall through to copy
      }
      return;
    }
    // Fallback: copy URL
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard API not available
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-stone-300 text-stone-600 rounded-lg hover:bg-stone-50 transition-colors"
    >
      <span className="text-base">{copied ? "✅" : "📤"}</span>
      <span>{copied ? "URLをコピーしました" : "シェアする"}</span>
    </button>
  );
}
