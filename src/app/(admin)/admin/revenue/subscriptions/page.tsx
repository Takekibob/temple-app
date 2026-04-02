import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_TEMPLATES } from "@/lib/planTemplates";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  ACTIVE:   { label: "有効",       className: "bg-green-100 text-green-700" },
  PAST_DUE: { label: "支払い遅延", className: "bg-red-100 text-red-700" },
  CANCELED: { label: "解約済み",   className: "bg-stone-100 text-stone-500" },
  PAUSED:   { label: "一時停止",   className: "bg-yellow-100 text-yellow-700" },
};

const INTERVAL_LABELS: Record<string, string> = {
  MONTHLY: "月払い",
  YEARLY:  "年払い",
  ONE_TIME: "一回払い",
};

interface SearchParams { status?: string; planKey?: string }

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const { status, planKey } = await searchParams;

  // 定義済みプランのDB実体を取得
  const templateKeys = PLAN_TEMPLATES.map((t) => t.key);
  const plans = await prisma.membershipPlan.findMany({
    where: { templeId: authUser.templeId, templateKey: { in: templateKeys } },
    include: {
      _count: { select: { subscriptions: { where: { status: "ACTIVE" } } } },
    },
  });

  // プランごとの集計
  const planStats = PLAN_TEMPLATES.map((t) => {
    const plan = plans.find((p) => p.templateKey === t.key);
    return {
      key: t.key,
      name: t.name,
      interval: t.interval,
      price: plan?.price ?? t.defaultPrice,
      isActive: plan?.isActive ?? false,
      activeCount: plan?._count.subscriptions ?? 0,
      planId: plan?.id ?? null,
    };
  });

  // サブスクリプション一覧
  const where: Record<string, unknown> = { templeId: authUser.templeId };
  if (status) where.status = status;
  if (planKey) {
    const plan = plans.find((p) => p.templateKey === planKey);
    if (plan) where.planId = plan.id;
  }

  const subscriptions = await prisma.memberSubscription.findMany({
    where,
    include: {
      plan: true,
      member: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const activeStatus = status ?? "";
  const activePlanKey = planKey ?? "";

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">サブスク管理</h1>
        <p className="text-sm text-stone-500 mt-0.5">会員プランの加入状況</p>
      </div>

      {/* プラン別集計カード */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {planStats.map((s) => (
          <div key={s.key} className={`bg-white rounded-xl border p-4 ${s.isActive ? "border-amber-200" : "border-stone-200 opacity-60"}`}>
            <p className="text-xs text-stone-500 mb-1">{INTERVAL_LABELS[s.interval]}</p>
            <p className="text-sm font-semibold text-stone-800 leading-tight">{s.name}</p>
            <p className="text-xs text-stone-400 mt-0.5">¥{s.price.toLocaleString()} / {INTERVAL_LABELS[s.interval]}</p>
            <p className="text-2xl font-bold text-amber-700 mt-2">{s.activeCount}<span className="text-sm font-normal text-stone-500 ml-1">名加入中</span></p>
            {!s.isActive && <p className="text-xs text-stone-400 mt-1">（未有効化）</p>}
          </div>
        ))}
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1 bg-white border border-stone-200 rounded-lg p-1">
          {[
            { value: "", label: "すべて" },
            { value: "ACTIVE", label: "有効" },
            { value: "PAST_DUE", label: "支払い遅延" },
            { value: "CANCELED", label: "解約済み" },
          ].map((f) => (
            <Link
              key={f.value}
              href={`/admin/revenue/subscriptions?status=${f.value}${activePlanKey ? `&planKey=${activePlanKey}` : ""}`}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${activeStatus === f.value ? "bg-amber-700 text-white font-medium" : "text-stone-600 hover:bg-stone-100"}`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="flex gap-1 bg-white border border-stone-200 rounded-lg p-1">
          {[
            { value: "", label: "全プラン" },
            ...PLAN_TEMPLATES.map((t) => ({ value: t.key, label: INTERVAL_LABELS[t.interval] })),
          ].map((f) => (
            <Link
              key={f.value}
              href={`/admin/revenue/subscriptions?${activeStatus ? `status=${activeStatus}&` : ""}planKey=${f.value}`}
              className={`px-3 py-1.5 rounded-md text-xs transition-colors ${activePlanKey === f.value ? "bg-stone-700 text-white font-medium" : "text-stone-600 hover:bg-stone-100"}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 一覧 */}
      {subscriptions.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400 text-sm">
          該当するサブスクリプションがありません
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">会員名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">プラン</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-stone-500">金額</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-stone-500">ステータス</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">次回更新</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {subscriptions.map((sub) => {
                const templateKey = sub.plan.templateKey;
                const template = PLAN_TEMPLATES.find((t) => t.key === templateKey);
                return (
                  <tr key={sub.id} className="hover:bg-stone-50">
                    <td className="px-4 py-3 text-stone-700">{sub.member.user.name}</td>
                    <td className="px-4 py-3">
                      <span className="text-stone-800 font-medium">
                        {template ? INTERVAL_LABELS[template.interval] : sub.plan.name}
                      </span>
                      <span className="text-xs text-stone-400 ml-1">
                        {template ? template.name : ""}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-stone-800">
                      ¥{sub.plan.price.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_LABELS[sub.status]?.className ?? ""}`}>
                        {STATUS_LABELS[sub.status]?.label ?? sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {sub.currentPeriodEnd
                        ? new Date(sub.currentPeriodEnd).toLocaleDateString("ja-JP")
                        : sub.canceledAt
                        ? `解約: ${new Date(sub.canceledAt).toLocaleDateString("ja-JP")}`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
