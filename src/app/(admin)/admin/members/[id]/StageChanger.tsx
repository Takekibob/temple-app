"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MemberStage } from "@/generated/prisma/client";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/scoring";

const STAGES: MemberStage[] = ["GOEN", "PROSPECT", "DANKA_CANDIDATE", "DANKA"];

interface Props {
  memberId: string;
  currentStage: MemberStage;
}

export default function StageChanger({ memberId, currentStage }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const handleChange = async (toStage: MemberStage) => {
    if (toStage === currentStage) { setOpen(false); return; }
    setPending(true);
    try {
      await fetch("/api/members/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, toStage }),
      });
      router.refresh();
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
        <div className="absolute left-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-10 overflow-hidden min-w-[120px]">
          {STAGES.map((s) => (
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
        </div>
      )}
    </div>
  );
}
