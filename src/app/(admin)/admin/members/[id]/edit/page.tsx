"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  validatePhone,
  validatePostalCode,
  normalizePostalCode,
} from "@/lib/memberValidation";

interface MemberData {
  id: string;
  type: string;
  familyName: string;
  address: string;
  postalCode: string;
  phone: string;
  notes: string;
  user: { name: string; email: string; phone: string };
}

type FieldErrors = {
  phone?: string;
  postalCode?: string;
};

export default function MemberEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [member, setMember] = useState<MemberData | null>(null);
  const [memberType, setMemberType] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    fetch(`/api/members/${id}`)
      .then((r) => r.json())
      .then((d) => { setMember(d.member); setMemberType(d.member.type); })
      .catch(() => setErrorMsg("データの取得に失敗しました"));
  }, [id]);

  function validateFields(phone: string, postalCode: string): FieldErrors {
    const errors: FieldErrors = {};
    const phoneErr = validatePhone(phone);
    if (phoneErr) errors.phone = phoneErr;
    const postalErr = validatePostalCode(postalCode);
    if (postalErr) errors.postalCode = postalErr;
    return errors;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const phone = (form.get("phone") as string) ?? "";
    const postalCode = (form.get("postalCode") as string) ?? "";

    const errors = validateFields(phone, postalCode);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const newType = form.get("type") as string;
    if (newType === "GOEN" && member?.type === "DANKA") {
      if (!confirm("檀家 → ご縁さんに変更すると、法要予約・過去帳・護持会費へのアクセスが失われます。続けますか？")) return;
    }

    const payload = {
      name: form.get("name"),
      phone: phone || null,
      familyName: form.get("familyName"),
      address: form.get("address"),
      postalCode: postalCode ? normalizePostalCode(postalCode) : null,
      notes: form.get("notes"),
      type: newType,
    };

    startTransition(async () => {
      setErrorMsg(null);
      const res = await fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error ?? "更新に失敗しました");
      } else {
        setSuccessMsg("更新しました");
        setTimeout(() => router.push(`/admin/members/${id}`), 800);
      }
    });
  }

  if (!member) {
    return <div className="p-6 text-stone-400">読み込み中…</div>;
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <Link href={`/admin/members/${id}`} className="text-sm text-stone-400 hover:text-stone-600 mb-4 inline-block">
        ← 詳細に戻る
      </Link>
      <h1 className="text-xl font-bold text-stone-800 mb-6">会員情報編集</h1>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{errorMsg}</div>
      )}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">{successMsg}</div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        {/* 会員種別 */}
        <div className="space-y-1.5">
          <Label htmlFor="type" className="text-stone-700">会員種別</Label>
          <select
            id="type"
            name="type"
            value={memberType}
            onChange={(e) => setMemberType(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
          >
            <option value="GOEN">ご縁さん（GOEN）</option>
            <option value="DANKA">檀家（DANKA）</option>
          </select>
          {memberType === "DANKA" && member.type === "GOEN" && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
              ご縁さん → 檀家に変更すると、法要予約・過去帳・護持会費が利用可能になります。
            </p>
          )}
          {memberType === "GOEN" && member.type === "DANKA" && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1.5">
              ⚠️ 檀家 → ご縁さんに変更すると、法要予約・過去帳・護持会費へのアクセスが失われます。
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-stone-700">氏名</Label>
            <Input id="name" name="name" defaultValue={member.user.name} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-stone-700">電話番号</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              defaultValue={member.user.phone ?? member.phone ?? ""}
              placeholder="090-1234-5678"
              onChange={() => setFieldErrors((prev) => ({ ...prev, phone: undefined }))}
              className={fieldErrors.phone ? "border-red-400 focus:ring-red-400" : ""}
            />
            {fieldErrors.phone && (
              <p className="text-xs text-red-600">{fieldErrors.phone}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="familyName" className="text-stone-700">家名</Label>
            <Input id="familyName" name="familyName" defaultValue={member.familyName} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postalCode" className="text-stone-700">郵便番号</Label>
            <Input
              id="postalCode"
              name="postalCode"
              defaultValue={member.postalCode ?? ""}
              placeholder="123-4567"
              onChange={() => setFieldErrors((prev) => ({ ...prev, postalCode: undefined }))}
              className={fieldErrors.postalCode ? "border-red-400 focus:ring-red-400" : ""}
            />
            {fieldErrors.postalCode && (
              <p className="text-xs text-red-600">{fieldErrors.postalCode}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address" className="text-stone-700">住所</Label>
          <Input id="address" name="address" defaultValue={member.address ?? ""} placeholder="都道府県から入力" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="notes" className="text-stone-700">備考</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={member.notes ?? ""}
            className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {/* 入力フォーマットガイド */}
        <div className="text-xs text-stone-400 bg-stone-50 rounded-lg p-3 space-y-0.5">
          <p>• 電話番号：ハイフンあり・なしどちらでも可（例：090-1234-5678 / 0312345678）</p>
          <p>• 郵便番号：7桁で入力してください（例：123-4567）</p>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={isPending} className="bg-amber-700 hover:bg-amber-800 text-white">
            {isPending ? "保存中…" : "保存する"}
          </Button>
          <Link
            href={`/admin/members/${id}`}
            className="px-4 py-2 text-sm border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50"
          >
            キャンセル
          </Link>
        </div>
      </form>
    </div>
  );
}
