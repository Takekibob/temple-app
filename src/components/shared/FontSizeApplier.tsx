"use client";

import { useEffect } from "react";

const FONT_SIZE_MAP = {
  MEDIUM: "16px",
  LARGE: "18px",
  XLARGE: "22px",
} as const;

export default function FontSizeApplier({
  fontSize,
}: {
  fontSize: "MEDIUM" | "LARGE" | "XLARGE";
}) {
  useEffect(() => {
    const prev = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = FONT_SIZE_MAP[fontSize];
    return () => {
      document.documentElement.style.fontSize = prev;
    };
  }, [fontSize]);

  return null;
}
