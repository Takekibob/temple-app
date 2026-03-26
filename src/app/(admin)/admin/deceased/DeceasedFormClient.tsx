"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NENKI_DEFS } from "@/lib/nenki";

interface Member {
  id: string;
  familyName: string | null;
  user: { name: string };
}

interface InitialData {
  id: string;
  memberId: string;
  name: string;
  kaimyo: string | null;
  deathDate: string | null;
  age: number | null;
  relationship: string | null;
  notes: string | null;
}

interface Props {
  members: Member[];
  initial?: InitialData;
}

interface NenkiPreview {
  name: string;
  year: number;
  dateStr: string;
}

function calcNenkiPreview(deathDateStr: string): NenkiPreview[] {
  const deathDate = new Date(deathDateStr);
  if (isNaN(deathDate.getTime())) return [];
  return NENKI_DEFS.map(({ name, yearsAfter }) => {
    const d = new Date(deathDate);
    d.setFullYear(deathDate.getFullYear() + yearsAfter);
    return {
      name,
      year: d.getFullYear(),
      dateStr: d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" }),
    };
  });
}

export default function DeceasedFormClient({ members, initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [memberId, setMemberId] = useState(initial?.memberId ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [kaimyo, setKaimyo] = useState(initial?.kaimyo ?? "");
  const [deathDate, setDeathDate] = useState(
    initial?.deathDate ? initial.deathDate.split("T")[0] : ""
  );
  const [age, setAge] = useState(initial?.age?.toString() ?? "");
  const [relationship, setRelationship] = useState(initial?.relationship ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [nenkiPreview, setNenkiPreview] = useState<NenkiPreview[]>([]);

  const today = new Date().toISOString().split("T")[0];
  const isEdit = !!initial;

  useEffect(() => {
    if (deathDate) {
      setNenkiPreview(calcNenkiPreview(deathDate));
    } else {
      setNenkiPreview([]);
    }
  }, [deathDate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const payload = {
        memberId,
        name,
        kaimyo: kaimyo || null,
        deathDate,
        age: age || null,
        relationship: relationship || null,
        notes: notes || null,
      };

      const url = isEdit ? `/api/deceased/${initial.id}` : "/api/deceased";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "エラーが発生しました");
        return;
      }
      router.push("/admin/deceased");
      router.refresh();
    });
  }

  async function handleDelete() {
    if (!confirm(`「${name}」を削除しますか？この操作は取り消せません。`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/deceased/${initial!.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/admin/deceased");
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMsg(data.error ?? "削除に失敗しました");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  const currentYear = new Date().getFullYear();

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      {/* 所属会員 */}
      <div className="space-y-1.5">
        <Label htmlFor="memberId" className="text-stone-700">
          所属会員（檀家） <span className="text-red-500">*</span>
        </Label>
        <select
          id="memberId"
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          required
          className="w-full h-10 rounded-md border border-stone-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">-- 会員を選択 --</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.user.name}
              {m.familyName ? ` (${m.familyName}家)` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* 故人名・続柄 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-stone-700">
            故人名（俗名） <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={50}
            placeholder="山田 太郎"
            className="border-stone-200 focus-visible:ring-amber-500"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="relationship" className="text-stone-700">続柄</Label>
          <Input
            id="relationship"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="父、祖母 など"
            className="border-stone-200 focus-visible:ring-amber-500"
          />
        </div>
      </div>

      {/* 戒名 */}
      <div className="space-y-1.5">
        <Label htmlFor="kaimyo" className="text-stone-700">戒名</Label>
        <Input
          id="kaimyo"
          value={kaimyo}
          onChange={(e) => setKaimyo(e.target.value)}
          maxLength={100}
          placeholder="○○院○○居士 など（任意）"
          className="border-stone-200 focus-visible:ring-amber-500"
        />
      </div>

      {/* 没年月日・享年 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="deathDate" className="text-stone-700">
            没年月日 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="deathDate"
            type="date"
            value={deathDate}
            onChange={(e) => setDeathDate(e.target.value)}
            required
            max={today}
            className="border-stone-200 focus-visible:ring-amber-500"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="age" className="text-stone-700">享年</Label>
          <Input
            id="age"
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            min="1"
            max="150"
            placeholder="享年（歳）"
            className="border-stone-200 focus-visible:ring-amber-500"
          />
        </div>
      </div>

      {/* 備考 */}
      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-stone-700">備考</Label>
        <Input
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="メモ（任意）"
          className="border-stone-200 focus-visible:ring-amber-500"
        />
      </div>

      {/* 年忌プレビュー */}
      {nenkiPreview.length > 0 && (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-sm font-medium text-stone-700 mb-3">年忌一覧（自動計算）</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {nenkiPreview.map((n) => (
              <div
                key={n.name}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs ${
                  n.year === currentYear
                    ? "bg-amber-200 text-amber-900 font-semibold"
                    : "bg-white text-stone-600"
                }`}
              >
                <span>{n.name}</span>
                <span>{n.dateStr}</span>
                {n.year === currentYear && (
                  <span className="ml-1 text-amber-700">← 今年</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ボタン */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/deceased")}
          className="flex-1 border-stone-200 text-stone-600"
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-amber-700 hover:bg-amber-800 text-white"
        >
          {isPending ? "保存中…" : isEdit ? "変更を保存" : "登録する"}
        </Button>
      </div>

      {/* 削除ボタン（編集時のみ） */}
      {isEdit && (
        <div className="pt-2 border-t border-stone-100">
          <Button
            type="button"
            variant="outline"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full border-red-200 text-red-600 hover:bg-red-50"
          >
            {isDeleting ? "削除中…" : "この記録を削除する"}
          </Button>
        </div>
      )}
    </form>
  );
}
