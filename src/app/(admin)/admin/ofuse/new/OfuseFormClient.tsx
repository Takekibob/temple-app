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

interface Props {
  members: Member[];
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

export default function OfuseFormClient({ members }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    startTransition(async () => {
      setErrorMsg(null);
      try {
        const res = await fetch("/api/ofuse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberId: data.get("memberId"),
            type: data.get("type"),
            amount: data.get("amount"),
            paidAt: data.get("paidAt"),
            paymentMethod: data.get("paymentMethod"),
            receiptIssued: data.get("receiptIssued") === "on",
            notes: data.get("notes") || null,
          }),
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="type" className="text-stone-700">
            種別 <span className="text-red-500">*</span>
          </Label>
          <select
            id="type"
            name="type"
            required
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
            defaultValue={today}
            className="border-stone-200 focus-visible:ring-amber-500"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes" className="text-stone-700">
          備考
        </Label>
        <Input
          id="notes"
          name="notes"
          type="text"
          placeholder="メモ（任意）"
          className="border-stone-200 focus-visible:ring-amber-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="receiptIssued"
          name="receiptIssued"
          type="checkbox"
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
          onClick={() => router.back()}
          className="flex-1 border-stone-200 text-stone-600"
        >
          キャンセル
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-amber-700 hover:bg-amber-800 text-white"
        >
          {isPending ? "保存中…" : "保存する"}
        </Button>
      </div>
    </form>
  );
}
