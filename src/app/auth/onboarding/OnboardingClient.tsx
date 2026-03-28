"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type MemberType = "DANKA" | "GOEN" | null;

interface Temple {
  id: string;
  name: string;
  denomination: string | null;
  address: string | null;
}

const INTEREST_OPTIONS = [
  { value: "ZAZEN", label: "坐禅" },
  { value: "SHAKYO", label: "写経" },
  { value: "YOGA", label: "ヨガ" },
  { value: "MINDFULNESS", label: "マインドフルネス" },
  { value: "LECTURE", label: "仏教講座" },
  { value: "KUYO", label: "供養" },
];

export default function OnboardingClient({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [memberType, setMemberType] = useState<MemberType>(null);
  const [name, setName] = useState(defaultName);
  const [familyName, setFamilyName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [templeId, setTempleId] = useState<string>("");
  const [templeSearch, setTempleSearch] = useState("");
  const [temples, setTemples] = useState<Temple[]>([]);
  const [loadingTemples, setLoadingTemples] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (memberType !== "DANKA") return;
    setLoadingTemples(true);
    fetch("/api/temples")
      .then((r) => r.json())
      .then((data) => setTemples(data.temples ?? []))
      .catch(() => setTemples([]))
      .finally(() => setLoadingTemples(false));
  }, [memberType]);

  const filteredTemples = temples.filter(
    (t) =>
      t.name.includes(templeSearch) ||
      (t.denomination ?? "").includes(templeSearch) ||
      (t.address ?? "").includes(templeSearch)
  );

  function toggleInterest(value: string) {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberType) { setErrorMsg("会員種別を選択してください。"); return; }
    if (memberType === "DANKA" && !templeId) { setErrorMsg("所属するお寺を選択してください。"); return; }
    startTransition(async () => {
      setErrorMsg(null);
      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberType,
            name: name.trim(),
            familyName: familyName.trim() || undefined,
            address: address.trim() || undefined,
            phone: phone.trim() || undefined,
            interestTags: interests.length > 0 ? interests : undefined,
            templeId: memberType === "DANKA" ? templeId : undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setErrorMsg(data.error ?? "登録に失敗しました"); return; }
        router.push("/app");
      } catch {
        setErrorMsg("通信エラーが発生しました。もう一度お試しください。");
      }
    });
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">🏯</div>
        <h1 className="text-2xl font-bold text-stone-800">てらログ</h1>
        <p className="text-stone-500 text-sm mt-1">ようこそ！会員タイプを選択してください</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errorMsg}
          </div>
        )}

        <div className="mb-5">
          <p className="text-sm font-medium text-stone-700 mb-3">会員種別を選択してください</p>
          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              onClick={() => { setMemberType("DANKA"); setTempleId(""); }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                memberType === "DANKA" ? "border-amber-600 bg-amber-50" : "border-stone-200 hover:border-stone-300"
              }`}
            >
              <div className="text-xl mb-1">🏠</div>
              <div className="font-medium text-stone-800 text-sm">檀家として登録</div>
              <div className="text-xs text-stone-500 mt-0.5">
                お寺に所属している方。法要予約・お布施管理・過去帳閲覧ができます
              </div>
            </button>
            <button
              type="button"
              onClick={() => setMemberType("GOEN")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                memberType === "GOEN" ? "border-amber-600 bg-amber-50" : "border-stone-200 hover:border-stone-300"
              }`}
            >
              <div className="text-xl mb-1">🌿</div>
              <div className="font-medium text-stone-800 text-sm">ご縁さんとして登録</div>
              <div className="text-xs text-stone-500 mt-0.5">
                イベント参加やお知らせ閲覧をご希望の方
              </div>
            </button>
          </div>
        </div>

        {memberType && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-stone-700">
                お名前 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="山田 太郎"
                className="border-stone-200 focus-visible:ring-amber-500"
              />
            </div>

            {memberType === "DANKA" && (
              <>
                <div className="pt-2 pb-1 border-t border-stone-100">
                  <p className="text-xs text-stone-500">檀家登録には以下の情報が必要です</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="familyName" className="text-stone-700">
                    家名（苗字・屋号） <span className="text-red-500">*</span>
                  </Label>
                  <Input id="familyName" value={familyName} onChange={(e) => setFamilyName(e.target.value)}
                    required placeholder="山田家" className="border-stone-200 focus-visible:ring-amber-500" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-stone-700">
                    電話番号 <span className="text-red-500">*</span>
                  </Label>
                  <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    required placeholder="090-0000-0000" className="border-stone-200 focus-visible:ring-amber-500" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-stone-700">
                    住所 <span className="text-red-500">*</span>
                  </Label>
                  <Input id="address" value={address} onChange={(e) => setAddress(e.target.value)}
                    required placeholder="東京都千代田区〇〇 1-2-3" className="border-stone-200 focus-visible:ring-amber-500" />
                </div>

                {/* 所属寺院選択 */}
                <div className="space-y-1.5 pt-2 border-t border-stone-100">
                  <Label className="text-stone-700">
                    所属するお寺 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={templeSearch}
                    onChange={(e) => setTempleSearch(e.target.value)}
                    placeholder="🔍 お寺を検索..."
                    className="border-stone-200 focus-visible:ring-amber-500"
                  />
                  <div className="max-h-48 overflow-y-auto space-y-2 mt-1">
                    {loadingTemples ? (
                      <p className="text-xs text-stone-400 text-center py-4">読み込み中...</p>
                    ) : filteredTemples.length === 0 ? (
                      <p className="text-xs text-stone-400 text-center py-4">
                        {templeSearch ? "該当するお寺が見つかりません" : "お寺が登録されていません"}
                      </p>
                    ) : (
                      filteredTemples.map((t) => (
                        <button key={t.id} type="button" onClick={() => setTempleId(t.id)}
                          className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                            templeId === t.id ? "border-amber-600 bg-amber-50" : "border-stone-200 hover:border-stone-300"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-lg">🏯</span>
                            <div>
                              <div className="font-medium text-stone-800 text-sm">
                                {t.name}
                                {t.denomination && (
                                  <span className="ml-1 text-xs text-stone-500">（{t.denomination}）</span>
                                )}
                              </div>
                              {t.address && (
                                <div className="text-xs text-stone-400 mt-0.5">📍 {t.address}</div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <p className="text-xs text-stone-400">
                    ※ お寺が見つからない場合は管理者にお問い合わせください
                  </p>
                </div>
              </>
            )}

            {memberType === "GOEN" && (
              <div className="space-y-2">
                <Label className="text-stone-700">興味のあること（任意・複数選択可）</Label>
                <div className="flex flex-wrap gap-2">
                  {INTEREST_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => toggleInterest(opt.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        interests.includes(opt.value)
                          ? "bg-amber-700 text-white border-amber-700"
                          : "bg-white text-stone-600 border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" disabled={isPending}
              className="w-full bg-amber-700 hover:bg-amber-800 text-white mt-2">
              {isPending ? "登録中…" : "登録を完了する"}
            </Button>
          </form>
        )}
      </div>

      <p className="text-center text-xs text-stone-400 mt-4 px-2">
        住職・スタッフの方は、寺院の管理者から招待を受けてください
      </p>
    </div>
  );
}
