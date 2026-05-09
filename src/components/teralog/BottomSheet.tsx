"use client";

import { ReactNode, useEffect, useCallback } from "react";
import PrimaryButton from "./PrimaryButton";
import SecondaryButton from "./SecondaryButton";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  primaryAction: { label: string; onClick: () => void; loading?: boolean };
  secondaryAction?: { label: string; onClick: () => void };
};

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  primaryAction,
  secondaryAction,
}: Props) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-50"
        style={{ background: "rgba(0,0,0,0.35)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* シート本体 */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-paper"
        style={{
          borderRadius: "16px 16px 0 0",
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
        }}
      >
        {/* タイトル */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "0.5px solid var(--color-border)" }}>
          <h2 className="font-serif text-base text-ink font-light">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="font-sans text-ink-tertiary text-[18px] leading-none w-8 h-8 flex items-center justify-center"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {/* コンテンツ */}
        <div className="px-6 py-5">{children}</div>

        {/* アクション */}
        <div className="px-6 flex flex-col gap-3">
          <PrimaryButton
            onClick={primaryAction.onClick}
            loading={primaryAction.loading}
            className="w-full justify-center"
          >
            {primaryAction.label}
          </PrimaryButton>
          {secondaryAction && (
            <SecondaryButton
              onClick={() => { secondaryAction.onClick(); onClose(); }}
              className="w-full justify-center"
            >
              {secondaryAction.label}
            </SecondaryButton>
          )}
        </div>
      </div>
    </>
  );
}
