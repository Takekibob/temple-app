"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Step = 1 | 2;

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
];

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { num: 1, label: "情報入力" },
    { num: 2, label: "お寺を選ぶ" },
  ];
  return (
    <div className="flex items-center justify-center gap-1 mb-6">
      {steps.map((s, i) => (
        <div key={s.num} className="flex items-center gap-1">
          <div className="flex flex-col items-center gap-0.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                step > s.num
                  ? "bg-amber-600 border-amber-600 text-white"
                  : step === s.num
                  ? "bg-white border-amber-600 text-amber-700"
                  : "bg-white border-stone-200 text-stone-400"
              }`}
            >
              {step > s.num ? "✓" : s.num}
            </div>
            <span
              className={`text-xs ${
                step === s.num ? "text-amber-700 font-medium" : "text-stone-400"
              }`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-8 h-0.5 mb-4 ${
                step > s.num ? "bg-amber-600" : "bg-stone-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function OnboardingClient({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState(defaultName);
  const [interests, setInterests] = useState<string[]>([]);
  const [templeId, setTempleId] = useState<string>("");
  const [templeSearch, setTempleSearch] = useState("");
  const [temples, setTemples] = useState<Temple[]>([]);
  const [loadingTemples, setLoadingTemples] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (step !== 2) return;
    setLoadingTemples(true);
    fetch("/api/temples")
      .then((r) => r.json())
      .then((data) => setTemples(data.temples ?? []))
      .catch(() => setTemples([]))
      .finally(() => setLoadingTemples(false));
  }, [step]);

  const filteredTemples = temples.filter(
    (t) =>
      t.name.includes(templeSearch) ||
      (t.denomination ?? "").includes(templeSearch) ||
      (t.address ?? "").includes(templeSearch)
  );

  const selectedTemple = temples.find((t) => t.id === templeId) ?? null;

  function toggleInterest(value: string) {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  // Step 1: 個人情報入力 → 次へ
  function handleStep1Next(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErrorMsg("お名前を入力してください。"); return; }
    setErrorMsg(null);
    setStep(2);
  }

  // Step 2: 寺院選択 → 送信
  function handleSubmit() {
    startTransition(async () => {
      setErrorMsg(null);
      try {
        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            interestTags: interests.length > 0 ? interests : undefined,
            templeId: templeId || undefined,
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
        <p className="text-stone-500 text-sm mt-1">ようこそ！プロフィールを設定してください</p>
      </div>

      <StepIndicator step={step} />

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errorMsg}
          </div>
        )}

        {/* ─── Step 1: 個人情報入力 ─── */}
        {step === 1 && (
          <form onSubmit={handleStep1Next} className="space-y-4">
            <p className="text-sm font-medium text-stone-700 mb-3">プロフィールを設定してください</p>
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

            <div className="space-y-2">
              <Label className="text-stone-700">興味のあること（任意・複数選択可）</Label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleInterest(opt.value)}
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

            <Button
              type="submit"
              className="w-full bg-amber-700 hover:bg-amber-800 text-white"
            >
              次へ →
            </Button>
          </form>
        )}

        {/* ─── Step 2: お寺を選ぶ ─── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-stone-700 mb-1">
                フォローするお寺を選んでください（任意）
              </p>
              <p className="text-xs text-stone-400 mb-3">あとで設定・変更もできます</p>
              <Input
                value={templeSearch}
                onChange={(e) => setTempleSearch(e.target.value)}
                placeholder="🔍 お寺を検索…"
                className="border-stone-200 focus-visible:ring-amber-500 mb-2"
              />
              <div className="max-h-52 overflow-y-auto space-y-2">
                {loadingTemples ? (
                  <p className="text-xs text-stone-400 text-center py-6">読み込み中...</p>
                ) : filteredTemples.length === 0 ? (
                  <p className="text-xs text-stone-400 text-center py-6">
                    {templeSearch ? "該当するお寺が見つかりません" : "お寺が登録されていません"}
                  </p>
                ) : (
                  filteredTemples.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTempleId(t.id)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        templeId === t.id
                          ? "border-amber-600 bg-amber-50"
                          : "border-stone-200 hover:border-stone-300"
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
            </div>

            {selectedTemple && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <span>✅</span>
                <span>
                  選択中: <strong>{selectedTemple.name}</strong>
                  {selectedTemple.denomination && `（${selectedTemple.denomination}）`}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => { setStep(1); setErrorMsg(null); }}
                variant="outline"
                className="flex-1 border-stone-200 text-stone-600"
              >
                ← 戻る
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="flex-1 bg-amber-700 hover:bg-amber-800 text-white disabled:opacity-40"
              >
                {isPending ? "登録中…" : "登録を完了する"}
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-stone-400 mt-4 px-2">
        住職・スタッフの方は、寺院の管理者から招待を受けてください
      </p>
    </div>
  );
}
