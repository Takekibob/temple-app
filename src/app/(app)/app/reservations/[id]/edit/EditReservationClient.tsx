"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface DeceasedPerson {
  id: string;
  name: string;
  relationship: string | null;
}

interface ReservationData {
  id: string;
  type: string;
  scheduledAt: string;
  durationMin: number;
  deceasedPersonId: string;
  notes: string;
  attendees: number | null;
  purificationRequired: boolean;
  flowerOrder: boolean;
  flowerDetail: string;
  cateringOrder: boolean;
  cateringCount: number | null;
  cateringDetail: string;
}

const TYPE_LABELS: Record<string, string> = {
  ANNUAL_MEMORIAL: "年忌法要",
  MONTHLY_MEMORIAL: "月命日",
  NIBON: "初盆・お盆",
  KUYO: "供養",
  FUNERAL: "葬儀",
  OTHER: "その他",
};

export default function EditReservationClient({
  reservation,
  deceasedPersons,
}: {
  reservation: ReservationData;
  deceasedPersons: DeceasedPerson[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [deceasedPersonId, setDeceasedPersonId] = useState(reservation.deceasedPersonId);
  const [notes, setNotes] = useState(reservation.notes);
  const [attendees, setAttendees] = useState<string>(reservation.attendees?.toString() ?? "");
  const [purificationRequired, setPurificationRequired] = useState(reservation.purificationRequired);
  const [flowerOrder, setFlowerOrder] = useState(reservation.flowerOrder);
  const [flowerDetail, setFlowerDetail] = useState(reservation.flowerDetail);
  const [cateringOrder, setCateringOrder] = useState(reservation.cateringOrder);
  const [cateringCount, setCateringCount] = useState<string>(reservation.cateringCount?.toString() ?? "");
  const [cateringDetail, setCateringDetail] = useState(reservation.cateringDetail);

  const scheduledDate = new Date(reservation.scheduledAt);

  function handleSave() {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await fetch(`/api/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deceasedPersonId: deceasedPersonId || null,
          notes: notes || null,
          attendees: attendees ? Number(attendees) : null,
          purificationRequired,
          flowerOrder,
          flowerDetail: flowerOrder ? (flowerDetail || null) : null,
          cateringOrder,
          cateringCount: cateringOrder && cateringCount ? Number(cateringCount) : null,
          cateringDetail: cateringOrder ? (cateringDetail || null) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "更新に失敗しました");
      } else {
        router.push("/app/reservations");
      }
    });
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <Link href="/app/reservations" className="text-sm text-stone-400 hover:text-stone-600 mb-4 inline-block">
        ← 法要予約
      </Link>
      <h1 className="text-xl font-bold text-stone-800 mb-1">予約内容の変更</h1>
      <p className="text-xs text-stone-400 mb-5">確認待ちの予約のみ変更できます</p>

      {/* 変更不可の情報 */}
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 mb-5 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-stone-500">種別</span>
          <span className="font-medium text-stone-800">{TYPE_LABELS[reservation.type] ?? reservation.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">日時</span>
          <span className="font-medium text-stone-800">
            {scheduledDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}{" "}
            {scheduledDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-stone-500">所要時間</span>
          <span className="font-medium text-stone-800">
            {reservation.durationMin >= 60 ? `${Math.floor(reservation.durationMin / 60)}時間` : ""}
            {reservation.durationMin % 60 > 0 ? `${reservation.durationMin % 60}分` : ""}
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-5">
        {/* 故人 */}
        {deceasedPersons.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">対象の故人（任意）</label>
            <select
              value={deceasedPersonId}
              onChange={(e) => setDeceasedPersonId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">選択しない</option>
              {deceasedPersons.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.relationship ? `（${p.relationship}）` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 参列者数 */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">参列者数（任意）</label>
          <input
            type="number"
            min={1}
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="例：10"
            className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* お清め */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">お清め</label>
          <div className="flex gap-3">
            {[{ v: false, l: "なし" }, { v: true, l: "あり" }].map(({ v, l }) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setPurificationRequired(v)}
                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                  purificationRequired === v
                    ? "border-amber-500 bg-amber-50 text-amber-800 font-medium"
                    : "border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* お花 */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">お花の注文</label>
          <div className="flex gap-3 mb-2">
            {[{ v: false, l: "しない" }, { v: true, l: "する" }].map(({ v, l }) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setFlowerOrder(v)}
                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                  flowerOrder === v
                    ? "border-amber-500 bg-amber-50 text-amber-800 font-medium"
                    : "border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {flowerOrder && (
            <input
              type="text"
              value={flowerDetail}
              onChange={(e) => setFlowerDetail(e.target.value)}
              placeholder="種類・色・予算などをご記入ください"
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          )}
        </div>

        {/* 料理 */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">お料理の注文</label>
          <div className="flex gap-3 mb-2">
            {[{ v: false, l: "しない" }, { v: true, l: "する" }].map(({ v, l }) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setCateringOrder(v)}
                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                  cateringOrder === v
                    ? "border-amber-500 bg-amber-50 text-amber-800 font-medium"
                    : "border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          {cateringOrder && (
            <div className="space-y-2">
              <input
                type="number"
                min={1}
                value={cateringCount}
                onChange={(e) => setCateringCount(e.target.value)}
                placeholder="人数（例：10）"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <input
                type="text"
                value={cateringDetail}
                onChange={(e) => setCateringDetail(e.target.value)}
                placeholder="料理の種類・ご要望など"
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          )}
        </div>

        {/* 備考 */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">備考・要望（任意）</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="ご要望やご質問があればご記入ください"
            className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <Link
          href="/app/reservations"
          className="px-4 py-2 text-sm border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50"
        >
          キャンセル
        </Link>
        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex-1 px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800 disabled:opacity-40"
        >
          {isPending ? "保存中…" : "変更を保存する"}
        </button>
      </div>
    </div>
  );
}
