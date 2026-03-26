"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface DeceasedPerson {
  id: string;
  name: string;
  relationship: string | null;
}

interface Props {
  deceasedPersons: DeceasedPerson[];
  initialDeceasedPersonId?: string;
  initialType?: string;
}

interface Slot {
  time: string;
  available: boolean;
}

const RESERVATION_TYPES = [
  { value: "ANNUAL_MEMORIAL", label: "年忌法要", desc: "一周忌・三回忌など" },
  { value: "MONTHLY_MEMORIAL", label: "月命日", desc: "毎月の命日法要" },
  { value: "NIBON", label: "初盆・お盆", desc: "盆の法要" },
  { value: "KUYO", label: "供養", desc: "回忌以外の法要・供養" },
  { value: "FUNERAL", label: "葬儀", desc: "葬儀・告別式" },
  { value: "OTHER", label: "その他", desc: "上記に当てはまらない法要" },
] as const;

const DURATION_OPTIONS = [30, 60, 90, 120, 180, 240];

export default function NewReservationClient({ deceasedPersons, initialDeceasedPersonId, initialType }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(initialType ? 2 : 1);

  // Form state
  const [type, setType] = useState(initialType ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(60);
  const [deceasedPersonId, setDeceasedPersonId] = useState(initialDeceasedPersonId ?? "");
  const [notes, setNotes] = useState("");

  // Slot loading
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  async function loadSlots(d: string, dur: number) {
    setSlotsLoading(true);
    setSlots([]);
    setTime("");
    try {
      const res = await fetch(`/api/reservations/available?date=${d}&duration=${dur}`);
      const data = await res.json();
      setSlots(data.slots ?? []);
    } finally {
      setSlotsLoading(false);
    }
  }

  function handleDateChange(d: string) {
    setDate(d);
    if (d) loadSlots(d, duration);
  }

  function handleDurationChange(d: number) {
    setDuration(d);
    if (date) loadSlots(date, d);
  }

  function handleSubmit() {
    setErrorMsg(null);
    startTransition(async () => {
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          scheduledAt,
          durationMin: duration,
          deceasedPersonId: deceasedPersonId || null,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "予約の登録に失敗しました");
        setStep(3);
      } else {
        router.push("/app/reservations?success=1");
      }
    });
  }

  const STEP_LABELS = ["種別", "日時", "詳細", "確認"];

  const selectedType = RESERVATION_TYPES.find((t) => t.value === type);

  return (
    <div className="p-4 max-w-lg mx-auto">
      <Link href="/app/reservations" className="text-sm text-stone-400 hover:text-stone-600 mb-4 inline-block">
        ← 法要予約
      </Link>
      <h1 className="text-xl font-bold text-stone-800 mb-1">法要予約</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6 mt-3">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex items-center gap-1 flex-1">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                step > i + 1
                  ? "bg-amber-700 text-white"
                  : step === i + 1
                  ? "bg-amber-700 text-white ring-2 ring-amber-200"
                  : "bg-stone-200 text-stone-400"
              }`}
            >
              {step > i + 1 ? "✓" : i + 1}
            </div>
            <span className={`text-xs ${step === i + 1 ? "text-amber-700 font-medium" : "text-stone-400"}`}>
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <div className={`flex-1 h-px mx-1 ${step > i + 1 ? "bg-amber-300" : "bg-stone-200"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Type */}
      {step === 1 && (
        <div>
          <p className="text-sm text-stone-500 mb-4">法要の種別を選んでください</p>
          <div className="grid grid-cols-1 gap-2">
            {RESERVATION_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setType(t.value);
                  setStep(2);
                }}
                className={`w-full text-left p-4 rounded-xl border transition-colors ${
                  type === t.value
                    ? "border-amber-500 bg-amber-50"
                    : "border-stone-200 bg-white hover:bg-stone-50"
                }`}
              >
                <p className="font-medium text-stone-800">{t.label}</p>
                <p className="text-xs text-stone-400 mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Date & Time */}
      {step === 2 && (
        <div>
          <p className="text-sm text-stone-500 mb-4">
            <span className="font-medium text-stone-700">{selectedType?.label}</span> の日時を選んでください
          </p>

          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">所要時間</label>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => handleDurationChange(d)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      duration === d
                        ? "border-amber-500 bg-amber-50 text-amber-800 font-medium"
                        : "border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    {d >= 60 ? `${d / 60}時間` : `${d}分`}
                    {d > 60 && d % 60 > 0 ? `${d % 60}分` : ""}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">日付</label>
              <input
                type="date"
                min={today}
                value={date}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {date && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">時間</label>
                {slotsLoading ? (
                  <p className="text-sm text-stone-400">空き時間を確認中…</p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-stone-400">この日は空きがありません</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((s) => (
                      <button
                        key={s.time}
                        disabled={!s.available}
                        onClick={() => setTime(s.time)}
                        className={`py-2 rounded-lg text-sm border transition-colors ${
                          time === s.time
                            ? "border-amber-500 bg-amber-50 text-amber-800 font-medium"
                            : s.available
                            ? "border-stone-200 text-stone-700 hover:bg-stone-50"
                            : "border-stone-100 text-stone-300 cursor-not-allowed bg-stone-50"
                        }`}
                      >
                        {s.time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-sm border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50"
            >
              戻る
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!date || !time}
              className="flex-1 px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Details */}
      {step === 3 && (
        <div>
          <p className="text-sm text-stone-500 mb-4">詳細情報を入力してください</p>

          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-4">
            {deceasedPersons.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  対象の故人（任意）
                </label>
                <select
                  value={deceasedPersonId}
                  onChange={(e) => setDeceasedPersonId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">選択しない</option>
                  {deceasedPersons.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.relationship ? `（${p.relationship}）` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                備考・要望（任意）
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="ご要望やご質問があればご記入ください"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errorMsg}
            </div>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 text-sm border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50"
            >
              戻る
            </button>
            <button
              onClick={() => setStep(4)}
              className="flex-1 px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800"
            >
              確認へ
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div>
          <p className="text-sm text-stone-500 mb-4">以下の内容で予約します</p>

          <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-stone-500">種別</span>
              <span className="font-medium text-stone-800">{selectedType?.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">日付</span>
              <span className="font-medium text-stone-800">
                {new Date(`${date}T00:00:00`).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "short",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">時間</span>
              <span className="font-medium text-stone-800">{time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">所要時間</span>
              <span className="font-medium text-stone-800">
                {duration >= 60 ? `${Math.floor(duration / 60)}時間` : ""}
                {duration % 60 > 0 ? `${duration % 60}分` : ""}
              </span>
            </div>
            {deceasedPersonId && (
              <div className="flex justify-between">
                <span className="text-stone-500">対象</span>
                <span className="font-medium text-stone-800">
                  {deceasedPersons.find((p) => p.id === deceasedPersonId)?.name}
                </span>
              </div>
            )}
            {notes && (
              <div>
                <span className="text-stone-500 block mb-1">備考</span>
                <span className="text-stone-700 text-xs">{notes}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-stone-400 mt-3">
            ※ご予約後、お寺より確認のご連絡をさせていただきます。
          </p>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setStep(3)}
              disabled={isPending}
              className="px-4 py-2 text-sm border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 disabled:opacity-40"
            >
              戻る
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800 disabled:opacity-40"
            >
              {isPending ? "送信中…" : "予約を確定する"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
