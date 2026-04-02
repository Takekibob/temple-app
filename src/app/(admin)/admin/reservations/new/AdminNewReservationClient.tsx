"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const TYPE_OPTIONS = [
  { value: "ANNUAL_MEMORIAL", label: "年忌法要" },
  { value: "MONTHLY_MEMORIAL", label: "月命日" },
  { value: "NIBON", label: "初盆・お盆" },
  { value: "KUYO", label: "供養" },
  { value: "FUNERAL", label: "葬儀" },
  { value: "OTHER", label: "その他" },
];

const DURATION_OPTIONS = [
  { value: 30, label: "30分" },
  { value: 60, label: "60分" },
  { value: 90, label: "90分" },
  { value: 120, label: "120分" },
  { value: 180, label: "180分" },
];

interface Member {
  id: string;
  name: string;
  familyName: string;
  deceasedPersons: { id: string; name: string }[];
}

export default function AdminNewReservationClient({ members }: { members: Member[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [memberId, setMemberId] = useState("");
  const [type, setType] = useState("ANNUAL_MEMORIAL");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [durationMin, setDurationMin] = useState(60);
  const [deceasedPersonId, setDeceasedPersonId] = useState("");
  const [attendees, setAttendees] = useState("");
  const [notes, setNotes] = useState("");
  const [purificationRequired, setPurificationRequired] = useState(false);
  const [flowerOrder, setFlowerOrder] = useState(false);
  const [flowerDetail, setFlowerDetail] = useState("");
  const [cateringOrder, setCateringOrder] = useState(false);
  const [cateringCount, setCateringCount] = useState("");
  const [cateringDetail, setCateringDetail] = useState("");

  const selectedMember = members.find((m) => m.id === memberId);

  function handleSubmit() {
    if (!memberId || !type || !date || !time) {
      setErrorMsg("檀家・種別・日付・時間は必須です");
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          type,
          scheduledAt: `${date}T${time}:00`,
          durationMin,
          deceasedPersonId: deceasedPersonId || null,
          attendees: attendees ? Number(attendees) : null,
          notes: notes || null,
          purificationRequired,
          flowerOrder,
          flowerDetail: flowerOrder ? flowerDetail : null,
          cateringOrder,
          cateringCount: cateringOrder ? cateringCount : null,
          cateringDetail: cateringOrder ? cateringDetail : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "予約の登録に失敗しました");
      } else {
        router.push(`/admin/reservations/${data.reservation.id}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
        {/* 檀家選択 */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            檀家 <span className="text-red-500">*</span>
          </label>
          <select
            value={memberId}
            onChange={(e) => { setMemberId(e.target.value); setDeceasedPersonId(""); }}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="">選択してください</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}（{m.familyName}家）
              </option>
            ))}
          </select>
        </div>

        {/* 種別 */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">
            法要種別 <span className="text-red-500">*</span>
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* 故人 */}
        {selectedMember && selectedMember.deceasedPersons.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">故人</label>
            <select
              value={deceasedPersonId}
              onChange={(e) => setDeceasedPersonId(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">選択しない</option>
              {selectedMember.deceasedPersons.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* 日付・時刻 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              日付 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1.5">
              開始時刻 <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        {/* 所要時間 */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">所要時間</label>
          <select
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {DURATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* 参加人数 */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">参加人数</label>
          <input
            type="number"
            min={1}
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="例：5"
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* オプション */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-stone-700 mb-1">オプション</label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={purificationRequired} onChange={(e) => setPurificationRequired(e.target.checked)} className="accent-amber-700" />
            <span className="text-sm text-stone-700">おはらい</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={flowerOrder} onChange={(e) => setFlowerOrder(e.target.checked)} className="accent-amber-700" />
            <span className="text-sm text-stone-700">花注文</span>
          </label>
          {flowerOrder && (
            <input
              type="text"
              value={flowerDetail}
              onChange={(e) => setFlowerDetail(e.target.value)}
              placeholder="花の詳細"
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm ml-6 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={cateringOrder} onChange={(e) => setCateringOrder(e.target.checked)} className="accent-amber-700" />
            <span className="text-sm text-stone-700">お斎（食事）</span>
          </label>
          {cateringOrder && (
            <div className="ml-6 space-y-2">
              <input
                type="number"
                min={1}
                value={cateringCount}
                onChange={(e) => setCateringCount(e.target.value)}
                placeholder="人数"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <input
                type="text"
                value={cateringDetail}
                onChange={(e) => setCateringDetail(e.target.value)}
                placeholder="詳細"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          )}
        </div>

        {/* 備考 */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1.5">備考</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="特記事項があれば入力してください"
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-y"
          />
        </div>
      </div>

      <p className="text-xs text-stone-400">
        ※ 代理入力された予約は自動的に「確定」ステータスで登録されます
      </p>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={isPending || !memberId || !type || !date || !time}
          className="px-6 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800 disabled:opacity-40 font-medium"
        >
          {isPending ? "登録中…" : "代理予約を登録"}
        </button>
      </div>
    </div>
  );
}
