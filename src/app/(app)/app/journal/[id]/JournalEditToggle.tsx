"use client";

import { useState } from "react";
import JournalFormClient from "../JournalFormClient";
import type { MoodValue } from "@/lib/journalMoods";

interface Props {
  journalId: string;
  initialData: {
    id: string;
    title: string | null;
    content: string;
    mood: string | null;
    tags: string[];
    entryDate: Date | string;
    relatedEventId: string | null;
  };
  recentEvents: { id: string; title: string; eventDate: Date | string }[];
}

export default function JournalEditToggle({ journalId, initialData, recentEvents }: Props) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <JournalFormClient
        isEdit
        recentEvents={recentEvents}
        initialData={{
          ...initialData,
          mood: initialData.mood as MoodValue | null,
        }}
      />
    );
  }

  return (
    <div className="mt-10 pt-4 flex gap-4" style={{ borderTop: "0.5px solid #E5E5E5" }}>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="font-serif text-sm text-ink font-light border-b-[0.5px] border-ink"
      >
        編集する
      </button>
      {/* Phase 27 で実装予定 */}
      <button
        type="button"
        disabled
        className="font-serif text-sm text-ink-tertiary font-light opacity-30"
        title="Phase 27 で実装予定"
      >
        画像として保存
      </button>
    </div>
  );
}
