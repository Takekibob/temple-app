"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface MemberData {
  id: string;
  type: string;
  familyName: string;
  address: string;
  postalCode: string;
  phone: string;
  notes: string;
  engagementScore: number;
  user: { name: string; email: string; phone: string };
}

export default function MemberEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [member, setMember] = useState<MemberData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/members/${id}`)
      .then((r) => r.json())
      .then((d) => setMember(d.member))
      .catch(() => setErrorMsg("データの取得に失敗しました"));
  }, [id]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      phone: form.get("phone"),
      familyName: form.get("familyName"),
      address: form.get("address"),
      postalCode: form.get("postalCode"),
      notes: form.get("notes"),
      engagementScore: parseInt(form.get("engagementScore") as string) || 0,
    };

    startTransition(async () => {
      setErrorMsg(null);
      const res = await fetch(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setErrorMsg("更新に失敗しました");
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
    <div className="p-6 max-w-2xl">
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
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-stone-700">氏名</Label>
            <Input id="name" name="name" defaultValue={member.user.name} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-stone-700">電話番号</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={member.user.phone ?? member.phone} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="familyName" className="text-stone-700">家名</Label>
            <Input id="familyName" name="familyName" defaultValue={member.familyName} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postalCode" className="text-stone-700">郵便番号</Label>
            <Input id="postalCode" name="postalCode" defaultValue={member.postalCode ?? ""} placeholder="123-4567" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address" className="text-stone-700">住所</Label>
          <Input id="address" name="address" defaultValue={member.address ?? ""} />
        </div>

        {member.type === "GOEN" && (
          <div className="space-y-1.5">
            <Label htmlFor="engagementScore" className="text-stone-700">エンゲージメントスコア（0–100）</Label>
            <Input
              id="engagementScore"
              name="engagementScore"
              type="number"
              min={0}
              max={100}
              defaultValue={member.engagementScore}
            />
          </div>
        )}

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
