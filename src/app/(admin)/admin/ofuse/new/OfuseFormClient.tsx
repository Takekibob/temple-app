"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Member {
  id: string;
  familyName: string | null;
  user: { name: string };
}

interface InitialData {
  id: string;
  memberId: string;
  type: string;
  amount: number;
  paidAt: string;
  paymentMethod: string;
  receiptIssued: boolean;
  notes: string | null;
}

interface Props {
  members: Member[];
  initial?: InitialData;
}

// 護持会費は GojikaiPayment で管理するため除外（二重計上防止）
const TYPE_OPTIONS = [
  { value: "HOUYO", label: "法要" },
  { value: "KIFU", label: "寄付" },
  { value: "EVENT_FEE", label: "イベント参加費" },
  { value: "OTHER", label: "その他" },
];

const PAYMENT_OPTIONS = [
  { value: "CASH", label: "現金" },
  { value: "TRANSFER", label: "振込" },
  { value: "ONLINE", label: "オンライン" },
];

export default function OfuseFormClient({ members, initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isEdit = !!initial;
  const today = new Date().toISOString().split("T")[0];
  const initialDate = initial?.paidAt ? new Date(initial.paidAt).toISOString().split("T")[0] : today;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    startTransition(async () => {
      setErrorMsg(null);
      try {
        const url = isEdit ? `/api/ofuse/${initial.id}` : "/api/ofuse";
        const method = isEdit ? "PATCH" : "POST";
        const body: Record<string, unknown> = {
          type: data.get("type"),
          amount: data.get("amount"),
          paidAt: data.get("paidAt"),
          paymentMethod: data.get("paymentMethod"),
          receiptIssued: data.get("receiptIssued") === "on",
          notes: data.get("notes") || null,
        };
        if (!isEdit) body.memberId = data.get("memberId");

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const json = await res.json();
          setErrorMsg(json.error ?? "エラーが発生しました");
          return;
        }
        router.push("/admin/ofuse");
        router.refresh();
      } catch {
        setErrorMsg("通信エラーが発生しました");
      }
    });
  }

  async function handleDelete() {
    if (!confirm("このお布施記録を削除しますか？この操作は取り消せません。")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/ofuse/${initial!.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/admin/ofuse");
        router.refresh();
      } else {
        const data = await res.json();
        setErrorMsg(data.error ?? "削除に失敗しました");
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      {!isEdit && (
        <div className="space-y-1.5">
          <Label htmlFor="memberId" className="text-stone-700">
            会員 <span className="text-red-500">*</span>
          </Label>
          <select
            id="memberId"
            name="memberId"
            required
            className="w-full h-10 rounded-md border border-stone-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">-- 会員を選択 --</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.user.name}{m.familyName ? ` (${m.familyName}家)` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="type" className="text-stone-700">
            種別 <span className="text-red-500">*</span>
          </Label>
          <select
            id="type"
            name="type"
            required
            defaultValue={initial?.type ?? "HOUYO"}
            className="w-full h-10 rounded-md border border-stone-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="paymentMethod" className="text-stone-700">
            支払方法 <span className="text-red-500">*</span>
          </Label>
          <select
            id="paymentMethod"
            name="paymentMethod"
            required
            defaultValue={initial?.paymentMethod ?? "CASH"}
            className="w-full h-10 rounded-md border border-stone-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {PAYMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="amount" className="text-stone-700">
            金額（円） <span className="text-red-500">*</span>
          </Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min="1"
            required
            defaultValue={initial?.amount ?? ""}
            placeholder="10000"
            className="border-stone-200 focus-visible:ring-amber-500"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="paidAt" className="text-stone-700">
            支払日 <span className="text-red-500">*</span>
          </Label>
          <Input
            id="paidAt"
            name="paidAt"
            type="date"
            required
            max={today}
            defaultValue={initialDate}
            className="border-stone-200 focus-visible:ring-amber-500"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-stone-700">備考</Label>
        <Input
          id="notes"
          name="notes"
          type="text"
          defaultValue={initial?.notes ?? ""}
          placeholder="メモ（任意）"
          className="border-stone-200 focus-visible:ring-amber-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="receiptIssued"
          name="receiptIssued"
          type="checkbox"
          defaultChecked={initial?.receiptIssued ?? false}
          className="rounded border-stone-300 text-amber-700 focus:ring-amber-500"
        />
        <Label htmlFor="receiptIssued" className="text-stone-700 font-normal cursor-pointer">
          領収書を発行済み
        </Label>
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/ofuse")}
          className="flex-1 border-stone-200 text-stone-600"
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-amber-700 hover:bg-amber-800 text-white"
        >
          {isPending ? "保存中…" : isEdit ? "変更を保存" : "保存する"}
        </Button>
      </div>

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
