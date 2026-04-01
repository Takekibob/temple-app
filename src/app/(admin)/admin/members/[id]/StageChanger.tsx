"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MemberStage, MemberType } from "@/generated/prisma/client";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/scoringMeta";
import { allowedStages } from "@/lib/memberValidation";

interface Props {
  memberId: string;
  currentStage: MemberStage;
  memberType: MemberType;
}

export default function StageChanger({ memberId, currentStage, memberType }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validStages = allowedStages(memberType);

  // 檀家はステージ変更不要（常に DANKA）
  if (memberType === "DANKA") {
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[currentStage]}`}>
        {STAGE_LABELS[currentStage]}
      </span>
    );
  }

  const handleChange = async (toStage: MemberStage) => {
    if (toStage === currentStage) { setOpen(false); return; }
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/members/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, toStage }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "ステージ変更に失敗しました");
      } else {
        router.refresh();
      }
    } finally {
      setPending(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        className={`px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer ${STAGE_COLORS[currentStage]}`}
      >
        {STAGE_LABELS[currentStage]} ▾
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-10 overflow-hidden min-w-[140px]">
          {validStages.map((s) => (
            <button
              key={s}
              onClick={() => handleChange(s)}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-stone-50 transition-colors ${
                s === currentStage ? "font-semibold text-stone-800" : "text-stone-600"
              }`}
            >
              {STAGE_LABELS[s]}
            </button>
          ))}
          <div className="px-3 py-2 border-t border-stone-100">
            <p className="text-xs text-stone-400">
              ※「檀家」への変更は<br />「檀家に昇格」ボタンから
            </p>
          </div>
        </div>
      )}
      {error && (
        <p className="absolute left-0 top-full mt-1 text-xs text-red-600 bg-white border border-red-200 rounded-lg px-2 py-1 z-10 whitespace-nowrap">
          {error}
        </p>
      )}
    </div>
  );
}
